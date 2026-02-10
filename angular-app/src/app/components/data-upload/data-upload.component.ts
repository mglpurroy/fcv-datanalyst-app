/**
 * Data Upload Component
 * Handles CSV file upload and URL loading
 */

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-data-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="upload-panel card">
      <h3>📁 Load Data</h3>
      
      <!-- Upload Method Selection -->
      <div class="method-tabs">
        <button 
          [class.active]="uploadMethod === 'file'"
          (click)="uploadMethod = 'file'"
          class="tab-button">
          File Upload
        </button>
        <button 
          [class.active]="uploadMethod === 'url'"
          (click)="uploadMethod = 'url'"
          class="tab-button">
          URL
        </button>
      </div>

      <!-- File Upload -->
      <div *ngIf="uploadMethod === 'file'" class="upload-section">
        <label>Choose CSV File:</label>
        <input 
          type="file"
          accept=".csv"
          (change)="onFileSelected($event)"
          class="file-input">
        
        <button 
          class="btn btn-primary"
          [disabled]="!selectedFile || isLoading"
          (click)="uploadFile()">
          {{ isLoading ? 'Uploading...' : 'Upload' }}
        </button>
      </div>

      <!-- URL Load -->
      <div *ngIf="uploadMethod === 'url'" class="upload-section">
        <label>CSV URL(s) (one per line):</label>
        <textarea
          [(ngModel)]="csvUrls"
          placeholder="https://example.com/data.csv"
          rows="4"
          class="url-input">
        </textarea>
        
        <button 
          class="btn btn-primary"
          [disabled]="!csvUrls.trim() || isLoading"
          (click)="loadFromUrls()">
          {{ isLoading ? 'Loading...' : 'Load Data' }}
        </button>
      </div>

      <!-- Status Messages -->
      <div *ngIf="successMessage" class="alert alert-success">
        {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .upload-panel {
      margin-bottom: 20px;
    }

    .upload-panel h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    .method-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab-button {
      padding: 8px 16px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      transition: all 0.2s;
      margin-bottom: -2px;
    }

    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
      font-weight: 600;
    }

    .upload-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .file-input,
    .url-input {
      margin-bottom: 8px;
    }

    .url-input {
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
  `]
})
export class DataUploadComponent {
  @Output() dataLoaded = new EventEmitter<any>();

  uploadMethod: 'file' | 'url' = 'file';
  selectedFile: File | null = null;
  csvUrls = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private chatService: ChatService
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      this.selectedFile = file;
      this.clearMessages();
    } else {
      this.errorMessage = 'Please select a CSV file';
      this.selectedFile = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.clearMessages();

    this.apiService.uploadData(this.selectedFile).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isLoading = false;
        if (response.schema) {
          this.chatService.setDataSchema(response.schema);
        }
        this.dataLoaded.emit(response);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to upload file';
        this.isLoading = false;
      }
    });
  }

  loadFromUrls(): void {
    if (!this.csvUrls.trim()) return;

    const urls = this.csvUrls.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    this.isLoading = true;
    this.clearMessages();

    this.apiService.loadDataFromUrls(urls).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isLoading = false;
        if (response.schema) {
          this.chatService.setDataSchema(response.schema);
        }
        this.dataLoaded.emit(response);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to load from URLs';
        this.isLoading = false;
      }
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

/**
 * Configuration Panel Component
 * API provider and model configuration
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ApiConfig } from '../../models/chat.model';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-panel card">
      <h3>⚙️ API Configuration</h3>
      
      <div class="config-form">
        <!-- Provider Selection -->
        <div class="form-group">
          <label>API Provider:</label>
          <select [(ngModel)]="config.provider" [disabled]="disabled">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="azure">Azure OpenAI</option>
          </select>
        </div>

        <!-- API Key -->
        <div class="form-group" *ngIf="config.provider !== 'azure'">
          <label>API Key:</label>
          <input 
            type="password"
            [(ngModel)]="config.api_key"
            [disabled]="disabled"
            placeholder="Enter your API key">
        </div>

        <!-- Model Selection -->
        <div class="form-group">
          <label>Model:</label>
          <select [(ngModel)]="config.model" [disabled]="disabled">
            <option *ngIf="config.provider === 'openai'" value="gpt-4">GPT-4</option>
            <option *ngIf="config.provider === 'openai'" value="gpt-4-turbo">GPT-4 Turbo</option>
            <option *ngIf="config.provider === 'openai'" value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option *ngIf="config.provider === 'anthropic'" value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
            <option *ngIf="config.provider === 'anthropic'" value="claude-haiku-4-5">Claude Haiku 4.5</option>
            <option *ngIf="config.provider === 'azure'" value="gpt-4">GPT-4</option>
          </select>
        </div>

        <!-- Azure Endpoint -->
        <div class="form-group" *ngIf="config.provider === 'azure'">
          <label>Azure Endpoint:</label>
          <input 
            type="text"
            [(ngModel)]="config.azure_endpoint"
            [disabled]="disabled"
            placeholder="https://...">
          <small>Leave empty for default ITSAI Platform endpoint</small>
        </div>

        <!-- Save Button -->
        <button 
          class="btn btn-success"
          [disabled]="disabled || !isValid()"
          (click)="saveConfig()">
          Save Configuration
        </button>

        <!-- Status -->
        <div *ngIf="statusMessage" class="alert alert-info">
          {{ statusMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .config-panel {
      margin-bottom: 20px;
    }

    .config-panel h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    .config-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group small {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
    }
  `]
})
export class ConfigPanelComponent {
  @Input() disabled = false;

  config: ApiConfig = {
    provider: 'openai',
    api_key: '',
    model: 'gpt-4'
  };

  statusMessage = '';

  constructor(private apiService: ApiService) {}

  isValid(): boolean {
    if (this.config.provider === 'azure') {
      return true; // Azure doesn't need API key (uses ITSAI Platform)
    }
    return !!this.config.api_key?.trim();
  }

  saveConfig(): void {
    if (!this.isValid()) return;

    this.apiService.updateConfig(this.config).subscribe({
      next: (response) => {
        this.statusMessage = 'Configuration saved successfully!';
        setTimeout(() => this.statusMessage = '', 3000);
      },
      error: (error) => {
        this.statusMessage = 'Failed to save configuration';
        setTimeout(() => this.statusMessage = '', 3000);
      }
    });
  }
}

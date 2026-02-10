/**
 * Main App Component
 * Root component that orchestrates the entire application
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInterfaceComponent } from './components/chat-interface/chat-interface.component';
import { DataUploadComponent } from './components/data-upload/data-upload.component';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ChatInterfaceComponent,
    DataUploadComponent,
    ConfigPanelComponent
  ],
  template: `
    <div class="app-container">
      <!-- Header -->
      <header class="app-header">
        <button type="button" class="header-toggle" (click)="sidebarOpen = !sidebarOpen" title="{{ sidebarOpen ? 'Hide sidebar' : 'Show sidebar' }}" aria-label="Toggle sidebar">
          ☰
        </button>
        <div class="header-title">
          <h1>🌍 FCV Data Chatbot</h1>
          <p class="subtitle">Quantitative conflict and violence data queries</p>
        </div>
      </header>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Sidebar -->
        <aside class="sidebar" [class.sidebar-collapsed]="!sidebarOpen">
          <div class="bot-purpose">
            <h3>📌 What this bot does</h3>
            <p><strong>Purpose:</strong> This is a <strong>data chatbot</strong> for <strong>quantitative queries</strong> only. It runs analysis on the pre-loaded dataset and returns results, charts, or CSV—it does not answer from general knowledge or external sources.</p>
            <p><strong>Data:</strong> Conflict data is <strong>pre-loaded</strong> (ACLED — Armed Conflict Location & Event Data). You do not need to add or upload data to get started.</p>
            <p><strong>✅ Capable of:</strong></p>
            <ul class="cap-list">
              <li>Trends over time (fatalities, events, by country/region)</li>
              <li>Counts, rankings, top-N (e.g. top 10 actors, countries by events)</li>
              <li>Maps of events (specify country or region for best results)</li>
              <li>Comparisons (between regions, time periods, or event types)</li>
              <li>Filtering by date, event type, actor, and exporting to CSV</li>
            </ul>
            <p><strong>❌ Not capable of:</strong></p>
            <ul class="cap-list remit">
              <li>Qualitative or policy questions (e.g. “root causes of FCV”, “why did X happen?”)</li>
              <li>Recommendations, predictions, or opinions</li>
              <li>General knowledge not in the pre-loaded data</li>
              <li>Editing or changing the underlying dataset—the data is pre-loaded and fixed for your session</li>
            </ul>
            <p class="remit">If your question is outside this scope, the bot will ask you to reformulate as a data-focused question.</p>
            <p class="note">The bot will be enhanced over time and will connect to other data sources; for now it uses pre-loaded ACLED data only.</p>
          </div>
          <app-data-upload 
            (dataLoaded)="onDataLoaded($event)">
          </app-data-upload>
          
          <app-config-panel
            [disabled]="!dataLoaded">
          </app-config-panel>
          
          <div class="data-info" *ngIf="dataSchema">
            <h3>📊 Data Info</h3>
            <div class="info-item">
              <strong>Rows:</strong> {{ dataSchema.shape[0] | number }}
            </div>
            <div class="info-item">
              <strong>Columns:</strong> {{ dataSchema.shape[1] }}
            </div>
            <div class="info-item">
              <strong>Date Range:</strong>
              <br>{{ dataSchema.date_range.min | date }} to
              <br>{{ dataSchema.date_range.max | date }}
            </div>
          </div>
        </aside>

        <!-- Chat Area -->
        <main class="chat-area">
          <app-chat-interface 
            [disabled]="!dataLoaded">
          </app-chat-interface>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f7fa;
    }

    .app-header {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header-toggle {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .header-toggle:hover {
      background: rgba(255,255,255,0.2);
    }

    .header-title {
      flex: 1;
    }

    .app-header h1 {
      font-size: 24px;
      margin: 0;
      font-weight: 700;
    }

    .subtitle {
      margin: 2px 0 0 0;
      opacity: 0.9;
      font-size: 13px;
    }

    .main-content {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar {
      width: 350px;
      flex-shrink: 0;
      background: white;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px;
      transition: width 0.25s ease, margin-left 0.25s ease;
    }

    .sidebar.sidebar-collapsed {
      width: 0;
      min-width: 0;
      padding: 0;
      border-right: none;
    }

    .bot-purpose {
      margin-bottom: 20px;
      padding: 14px;
      background: #f0f4ff;
      border-radius: 10px;
      border: 1px solid #c5d4f7;
      font-size: 12px;
      line-height: 1.45;
      color: #333;
    }
    .bot-purpose h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #2E86AB;
    }
    .bot-purpose p {
      margin: 0 0 10px 0;
    }
    .bot-purpose p:last-child {
      margin-bottom: 0;
    }
    .bot-purpose .cap-list {
      margin: 4px 0 10px 0;
      padding-left: 18px;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .bot-purpose .cap-list.remit {
      margin-bottom: 8px;
    }
    .bot-purpose .remit {
      color: #555;
      font-style: italic;
      font-size: 11.5px;
    }
    .bot-purpose .note {
      margin-top: 10px;
      font-size: 11px;
      color: #2E86AB;
    }

    .chat-area {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .data-info {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .data-info h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #333;
    }

    .info-item {
      margin-bottom: 10px;
      font-size: 13px;
      color: #555;
    }

    .info-item strong {
      color: #333;
    }

    @media (max-width: 768px) {
      .main-content {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
        max-height: 40vh;
      }
    }
  `]
})
export class AppComponent {
  dataLoaded = false;
  dataSchema: any = null;
  sidebarOpen = true;

  constructor(private chatService: ChatService) {
    this.chatService.dataSchema$.subscribe(schema => {
      this.dataSchema = schema;
    });
  }

  onDataLoaded(event: any): void {
    this.dataLoaded = true;
  }
}

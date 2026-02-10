/**
 * Main App Component
 * Root component that orchestrates the entire application
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInterfaceComponent } from './components/chat-interface/chat-interface.component';
import { ChatService } from './services/chat.service';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ChatInterfaceComponent
  ],
  template: `
    <div class="app-container">
      <!-- Main Content -->
      <div class="main-content">
        <!-- Sidebar -->
        <aside class="sidebar" [class.sidebar-collapsed]="!sidebarOpen">
          <div class="sidebar-header">
            <button type="button" class="sidebar-toggle" (click)="sidebarOpen = !sidebarOpen" title="{{ sidebarOpen ? 'Hide sidebar' : 'Show sidebar' }}" aria-label="Toggle sidebar">
              ☰
            </button>
            <button type="button" class="theme-toggle" (click)="toggleTheme()" [attr.aria-label]="darkMode ? 'Switch to light mode' : 'Switch to dark mode'" title="{{ darkMode ? 'Switch to light mode' : 'Switch to dark mode' }}">
              {{ darkMode ? '☀' : '☾' }}
            </button>
          </div>
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
              <li>Qualitative or policy questions (e.g. "root causes of FCV", "why did X happen?")</li>
              <li>Recommendations, predictions, or opinions</li>
              <li>General knowledge not in the pre-loaded data</li>
              <li>Editing or changing the underlying dataset—the data is pre-loaded and fixed for your session</li>
            </ul>
            <p class="remit">If your question is outside this scope, the bot will ask you to reformulate as a data-focused question.</p>
            <p class="note">The bot will be enhanced over time and will connect to other data sources; for now it uses pre-loaded ACLED data only.</p>
          </div>
          
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
          <app-chat-interface>
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
      background: var(--chat-bg);
    }

    .app-header {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 20px;
      box-shadow: var(--chat-shadow-sm);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-toggle {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
      color: white;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .header-toggle:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    .header-title {
      flex: 1;
    }

    .app-header h1 {
      font-size: 20px;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.02em;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .subtitle {
      margin: 2px 0 0 0;
      opacity: 0.85;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.01em;
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
      background: var(--chat-surface);
      border-right: 1px solid var(--chat-border);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 18px 16px;
      transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--chat-border);
    }

    .sidebar-toggle,
    .theme-toggle {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--chat-border);
      background: var(--chat-surface);
      color: var(--chat-text-primary);
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sidebar-toggle:hover,
    .theme-toggle:hover {
      background: var(--chat-surface-hover);
      border-color: var(--chat-border-strong);
      transform: translateY(-1px);
    }

    .sidebar.sidebar-collapsed .sidebar-header {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 1000;
      margin: 0;
      padding: 0;
      border: none;
      display: flex;
      gap: 8px;
    }

    .sidebar.sidebar-collapsed .sidebar-toggle,
    .sidebar.sidebar-collapsed .theme-toggle {
      box-shadow: var(--chat-shadow-md);
    }

    .sidebar.sidebar-collapsed {
      width: 0;
      min-width: 0;
      padding: 0;
      border-right: none;
    }

    .bot-purpose {
      margin-bottom: 20px;
      padding: 16px;
      background: var(--chat-accent-soft);
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-accent-dim);
      font-size: 12.5px;
      line-height: 1.6;
      color: var(--chat-text-primary);
      box-shadow: var(--chat-shadow-sm);
    }
    .bot-purpose h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--chat-accent);
      letter-spacing: -0.01em;
    }
    .bot-purpose p {
      margin: 0 0 12px 0;
    }
    .bot-purpose p:last-child {
      margin-bottom: 0;
    }
    .bot-purpose .cap-list {
      margin: 6px 0 12px 0;
      padding-left: 20px;
      font-size: 12px;
      line-height: 1.5;
    }
    .bot-purpose .cap-list.remit {
      margin-bottom: 10px;
    }
    .bot-purpose .remit {
      color: var(--chat-text-secondary);
      font-style: italic;
      font-size: 12px;
    }
    .bot-purpose .note {
      margin-top: 12px;
      font-size: 11.5px;
      color: var(--chat-accent);
      font-weight: 500;
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
      padding: 16px;
      background: var(--chat-surface);
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-border);
      box-shadow: var(--chat-shadow-sm);
    }

    .data-info h3 {
      margin: 0 0 14px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--chat-text-primary);
      letter-spacing: -0.01em;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.06em;
      font-family: 'JetBrains Mono', monospace;
    }

    .info-item {
      margin-bottom: 10px;
      font-size: 12.5px;
      color: var(--chat-text-secondary);
      line-height: 1.5;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .info-item strong {
      color: var(--chat-text-primary);
      font-weight: 600;
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
export class AppComponent implements OnInit {
  dataLoaded = false;
  dataSchema: any = null;
  sidebarOpen = true;
  darkMode = false;

  constructor(
    private chatService: ChatService,
    private apiService: ApiService
  ) {
    this.chatService.dataSchema$.subscribe(schema => {
      this.dataSchema = schema;
      if (schema) {
        this.dataLoaded = true;
      }
    });
    
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
      this.applyTheme(true);
    } else if (savedTheme === null) {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.darkMode = true;
        this.applyTheme(true);
      }
    }
  }
  
  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    this.applyTheme(this.darkMode);
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
  }
  
  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  ngOnInit(): void {
    // Auto-load data schema on startup (data is pre-loaded by backend)
    this.apiService.getDataSchema('default').subscribe({
      next: (response) => {
        if (response.schema) {
          this.chatService.setDataSchema(response.schema);
          this.dataLoaded = true;
        }
      },
      error: (error) => {
        console.error('Failed to load data schema:', error);
        // Data might still be loading, try again after a delay
        setTimeout(() => {
          this.apiService.getDataSchema('default').subscribe({
            next: (response) => {
              if (response.schema) {
                this.chatService.setDataSchema(response.schema);
                this.dataLoaded = true;
              }
            }
          });
        }, 2000);
      }
    });
  }
}

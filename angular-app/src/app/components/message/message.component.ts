/**
 * Message Component
 * Displays a single chat message with code, charts, and key takeaways.
 * Code and results default to collapsed; key takeaways are rendered as plain text.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat.model';
import { ChartDisplayComponent } from '../chart-display/chart-display.component';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, ChartDisplayComponent],
  template: `
    <div class="message" [class.user-message]="message.role === 'user'"
         [class.assistant-message]="message.role === 'assistant'">

      <div class="message-header">
        <span class="message-role">
          {{ message.role === 'user' ? 'You' : 'Assistant' }}
        </span>
        <span class="message-time">
          {{ message.timestamp | date:'short' }}
        </span>
      </div>

      <div class="message-content">
        <pre *ngIf="message.role === 'user'">{{ message.content }}</pre>

        <div *ngIf="message.role === 'assistant'">
          <!-- Code Block (collapsed by default) -->
          <div class="code-block" *ngIf="message.code">
            <div class="section-header" (click)="codeCollapsed = !codeCollapsed">
              <span class="section-title">Generated Code</span>
              <span class="chevron">{{ codeCollapsed ? '▶' : '▼' }}</span>
            </div>
            <div class="section-body" *ngIf="!codeCollapsed">
              <pre><code>{{ message.code }}</code></pre>
            </div>
          </div>

          <!-- Output (collapsed by default) -->
          <div class="output-block" *ngIf="message.content">
            <div class="section-header" (click)="outputCollapsed = !outputCollapsed">
              <span class="section-title">Results</span>
              <div class="header-actions" (click)="$event.stopPropagation()">
                <button type="button" class="btn-icon" (click)="copyResults()" title="Copy results">
                  {{ resultsCopied ? '✓ Copied' : 'Copy' }}
                </button>
                <button type="button" class="btn-icon" (click)="downloadResultsCsv()" title="Download as CSV">
                  CSV
                </button>
                <span class="chevron" (click)="outputCollapsed = !outputCollapsed">{{ outputCollapsed ? '▶' : '▼' }}</span>
              </div>
            </div>
            <div class="section-body" *ngIf="!outputCollapsed">
              <pre>{{ message.content }}</pre>
            </div>
          </div>

          <!-- Charts (always visible) -->
          <div class="charts-container" *ngIf="message.charts && message.charts.length > 0">
            <app-chart-display
              *ngFor="let chart of message.charts"
              [chart]="chart">
            </app-chart-display>
          </div>

          <!-- Key takeaways as plain text -->
          <div class="key-takeaways-text" *ngIf="message.narrative">{{ message.narrative }}</div>

          <!-- Download outputs (assistant message with any content) -->
          <div class="download-row" *ngIf="hasDownloadableContent()">
            <button type="button" class="btn-download" (click)="downloadOutputs()" title="Download results and narrative as text file">
              Download outputs
            </button>
          </div>

          <!-- Error (always expanded) -->
          <div class="error-block" *ngIf="message.error">
            <div class="error-header">
              <span>Error</span>
            </div>
            <pre>{{ message.error }}</pre>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message {
      margin-bottom: 14px;
      padding: 14px 16px;
      border-radius: var(--chat-radius-lg);
      max-width: min(90%, 780px);
      box-shadow: var(--chat-shadow-sm);
      border: 1px solid transparent;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .user-message {
      background: var(--chat-user-bubble);
      color: var(--chat-user-text);
      margin-left: auto;
      border-top-right-radius: 6px;
    }

    .assistant-message {
      background: var(--chat-assistant-bubble);
      border-color: var(--chat-border);
      margin-right: auto;
      border-top-left-radius: 6px;
    }

    .assistant-message:hover {
      border-color: var(--chat-border-strong);
      box-shadow: var(--chat-shadow-md);
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 11px;
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }

    .message-role {
      font-weight: 600;
      color: var(--chat-text-secondary);
    }

    .user-message .message-role {
      color: rgba(255, 255, 255, 0.85);
    }

    .message-time {
      color: var(--chat-text-muted);
    }

    .user-message .message-time {
      color: rgba(255, 255, 255, 0.75);
    }

    .message-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.55;
    }

    .user-message .message-content pre {
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
    }

    .code-block,
    .output-block,
    .error-block {
      margin-top: 12px;
      border-radius: var(--chat-radius-md);
      overflow: hidden;
    }

    .key-takeaways-text {
      margin-top: 12px;
      padding: 0;
      font-size: 14px;
      line-height: 1.55;
      color: var(--chat-text-primary);
      white-space: pre-wrap;
    }

    .code-block {
      background: #1e2235;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .code-block .section-header {
      background: #161929;
      color: #7b84a3;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .code-block .section-header:hover {
      background: #1a1e32;
    }

    .code-block .section-body pre,
    .code-block .section-body code {
      background: #1e2235;
      color: #e2e5ec;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }

    .output-block {
      background: var(--chat-surface-muted);
      border: 1px solid var(--chat-border);
    }

    .error-block {
      background: #fff1f3;
      border: 1px solid rgba(187, 46, 69, 0.35);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.03);
      font-size: 12px;
      font-weight: 600;
      color: var(--chat-text-secondary);
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
    }

    .section-header:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .section-title {
      flex: 1;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chevron {
      font-size: 10px;
      color: var(--chat-text-muted);
      margin-left: 4px;
    }

    .btn-icon {
      padding: 4px 8px;
      font-size: 11px;
      border: 1px solid var(--chat-border);
      border-radius: var(--chat-radius-sm);
      background: var(--chat-bg-elevated);
      cursor: pointer;
      color: var(--chat-text-secondary);
      transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    }

    .btn-icon:hover {
      background: #f4f7ff;
      border-color: var(--chat-border-strong);
      color: var(--chat-text-primary);
    }

    .error-header {
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.03);
      font-size: 12px;
      font-weight: 600;
      color: var(--chat-error);
    }

    .section-body pre {
      padding: 12px;
      margin: 0;
      overflow-x: auto;
    }

    .code-block .section-body pre,
    .output-block .section-body pre,
    .error-block pre {
      padding: 12px;
      margin: 0;
      overflow-x: auto;
    }

    .charts-container {
      margin-top: 12px;
    }

    .download-row {
      margin-top: 12px;
    }

    .btn-download {
      padding: 7px 12px;
      font-size: 12px;
      border: 1px solid var(--chat-accent);
      border-radius: var(--chat-radius-sm);
      background: var(--chat-accent);
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .btn-download:hover {
      background: var(--chat-accent-hover);
      border-color: var(--chat-accent-hover);
    }
  `]
})
export class MessageComponent {
  @Input() message!: ChatMessage;

  codeCollapsed = true;
  outputCollapsed = true;
  resultsCopied = false;
  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  copyResults(): void {
    if (!this.message?.content) return;
    this.copyToClipboard(this.message.content);
    this.resultsCopied = true;
    this.clearCopyFeedback(() => (this.resultsCopied = false));
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  private clearCopyFeedback(callback: () => void): void {
    if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
    this.copyFeedbackTimeout = setTimeout(callback, 2000);
  }

  hasDownloadableContent(): boolean {
    return !!(this.message?.content || this.message?.narrative || this.message?.code);
  }

  /** Convert results text (e.g. pandas print) to CSV and download. */
  downloadResultsCsv(): void {
    if (!this.message?.content) return;
    const csv = this.textToCsv(this.message.content);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${this.message.timestamp ? new Date(this.message.timestamp).toISOString().slice(0, 19).replace(/:/g, '-') : 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Parse table-like text (comma, tab, or space separated) into CSV. */
  private textToCsv(text: string): string {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return '';
    const rows: string[][] = [];
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const looksLikeCsv = commaCount >= 1 && lines.every(l => (l.match(/,/g) || []).length >= commaCount);
    for (const line of lines) {
      const cells = looksLikeCsv
        ? this.parseCsvLine(line)
        : line.split(/\s{2,}|\t/).map(c => c.trim());
      if (cells.length > 0) rows.push(cells);
    }
    const escape = (cell: string): string => {
      const s = String(cell).trim();
      if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    return rows.map(row => row.map(escape).join(',')).join('\n');
  }

  /** Simple CSV line parse (handles quoted fields). */
  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let cell = '';
        i++;
        while (i < line.length && line[i] !== '"') {
          cell += line[i] === '""' ? '"' : line[i];
          i += line[i] === '""' ? 2 : 1;
        }
        if (line[i] === '"') i++;
        out.push(cell);
        if (line[i] === ',') i++;
      } else {
        const j = line.indexOf(',', i);
        const end = j === -1 ? line.length : j;
        out.push(line.slice(i, end).trim());
        i = j === -1 ? line.length : j + 1;
      }
    }
    return out;
  }

  downloadOutputs(): void {
    const parts: string[] = [];
    if (this.message.code) {
      parts.push('=== Generated Code ===\n' + this.message.code + '\n');
    }
    if (this.message.content) {
      parts.push('=== Results ===\n' + this.message.content + '\n');
    }
    if (this.message.narrative) {
      parts.push('=== Key Takeaways ===\n' + this.message.narrative);
    }
    if (parts.length === 0) return;
    const text = parts.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-output-${this.message.timestamp ? new Date(this.message.timestamp).toISOString().slice(0, 19).replace(/:/g, '-') : 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

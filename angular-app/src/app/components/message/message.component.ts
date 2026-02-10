/**
 * Message Component
 * Displays a single chat message with code, charts, and key takeaways.
 * Code and results default to collapsed; key takeaways are rendered as plain text.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat.model';
import { ChartDisplayComponent } from '../chart-display/chart-display.component';

declare var Plotly: any;

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
          <div class="code-block" *ngIf="message.code" role="region" [attr.aria-label]="'Code block: ' + getCodeLanguage()">
            <div class="section-header" (click)="codeCollapsed = !codeCollapsed" role="button" [attr.aria-expanded]="!codeCollapsed" tabindex="0" (keydown.enter)="codeCollapsed = !codeCollapsed" (keydown.space)="codeCollapsed = !codeCollapsed; $event.preventDefault()">
              <div class="code-header-left">
                <div class="code-dots" aria-hidden="true">
                  <span class="dot dot-red"></span>
                  <span class="dot dot-yellow"></span>
                  <span class="dot dot-green"></span>
                </div>
                <span class="section-title">{{ getCodeLanguage() }}</span>
              </div>
              <div class="header-actions" (click)="$event.stopPropagation()">
                <button type="button" class="btn-icon" (click)="copyCode()" [attr.aria-label]="codeCopied ? 'Code copied' : 'Copy code'" title="Copy code">
                  {{ codeCopied ? '✓ Copied' : 'Copy' }}
                </button>
                <span class="chevron" aria-hidden="true">{{ codeCollapsed ? '▶' : '▼' }}</span>
              </div>
            </div>
            <div class="section-body" *ngIf="!codeCollapsed">
              <pre><code [innerHTML]="highlightCode(message.code)"></code></pre>
            </div>
          </div>

          <!-- Output (collapsed by default) -->
          <div class="output-block" *ngIf="message.content" role="region" aria-label="Results">
            <div class="section-header" (click)="outputCollapsed = !outputCollapsed" role="button" [attr.aria-expanded]="!outputCollapsed" tabindex="0" (keydown.enter)="outputCollapsed = !outputCollapsed" (keydown.space)="outputCollapsed = !outputCollapsed; $event.preventDefault()">
              <span class="section-title">Results</span>
              <div class="header-actions" (click)="$event.stopPropagation()">
                <button type="button" class="btn-icon" (click)="copyResults()" [attr.aria-label]="resultsCopied ? 'Results copied' : 'Copy results'" title="Copy results">
                  {{ resultsCopied ? '✓ Copied' : 'Copy' }}
                </button>
                <button type="button" class="btn-icon" (click)="downloadResultsCsv()" aria-label="Download results as CSV" title="Download as CSV">
                  CSV
                </button>
                <span class="chevron" aria-hidden="true" (click)="outputCollapsed = !outputCollapsed">{{ outputCollapsed ? '▶' : '▼' }}</span>
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

          <!-- Key takeaways formatted -->
          <div class="key-takeaways" *ngIf="message.narrative">
            <div class="key-takeaways-header">
              <span class="key-takeaways-icon">💡</span>
              <span class="key-takeaways-title">Key Takeaways</span>
            </div>
            <div class="key-takeaways-content" [innerHTML]="formatTakeaways(message.narrative)"></div>
          </div>

          <!-- Download outputs (assistant message with any content) -->
          <div class="download-row" *ngIf="hasDownloadableContent()">
            <button type="button" class="btn-download" (click)="downloadOutputs()" aria-label="Download results and narrative as text file" title="Download results and narrative as text file">
              📄 Download text outputs
            </button>
            <button 
              *ngIf="message.charts && message.charts.length > 0" 
              type="button" 
              class="btn-download" 
              (click)="downloadAllCharts()" 
              [attr.aria-label]="'Download all ' + message.charts.length + ' charts'"
              title="Download all charts">
              📊 Download all charts ({{ message.charts.length }})
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
      max-width: min(95%, 920px);
      box-shadow: var(--chat-shadow-sm);
      border: 1px solid transparent;
      transition: border-color 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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

    .key-takeaways {
      margin-top: 16px;
      padding: 16px 18px;
      background: linear-gradient(135deg, var(--chat-accent-soft), rgba(74, 144, 226, 0.05));
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-accent-dim);
      box-shadow: var(--chat-shadow-sm);
    }

    .key-takeaways-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--chat-accent);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .key-takeaways-icon {
      font-size: 16px;
    }

    .key-takeaways-title {
      font-family: 'JetBrains Mono', monospace;
    }

    .key-takeaways-content {
      font-size: 14px;
      line-height: 1.7;
      color: var(--chat-text-primary);
    }

    .key-takeaways-content p {
      margin: 0 0 10px 0;
    }

    .key-takeaways-content p:last-child {
      margin-bottom: 0;
    }

    .key-takeaways-content strong {
      color: var(--chat-accent);
      font-weight: 600;
    }

    .key-takeaways-content ul,
    .key-takeaways-content ol {
      margin: 8px 0 8px 20px;
      padding: 0;
    }

    .key-takeaways-content li {
      margin: 6px 0;
    }

    .code-block {
      background: var(--chat-code-bg);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: var(--chat-shadow-md);
    }

    .code-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .code-dots {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      opacity: 0.8;
    }

    .dot-red {
      background: #f7768e;
    }

    .dot-yellow {
      background: #e0a458;
    }

    .dot-green {
      background: #3dd68c;
    }

    .code-block .section-header {
      background: var(--chat-code-surface);
      color: #7b84a3;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      padding: 7px 12px;
    }

    .code-block .section-header:hover {
      background: #1a1e32;
    }

    .code-block .section-title {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-family: 'JetBrains Mono', monospace;
      color: var(--chat-code-comment);
    }

    .code-block .section-body {
      padding: 14px 16px;
    }

    .code-block .section-body pre,
    .code-block .section-body code {
      background: var(--chat-code-bg);
      color: #e2e5ec;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      line-height: 1.7;
      margin: 0;
      padding: 0;
    }

    .code-block .code-keyword {
      color: var(--chat-code-keyword);
      font-weight: 600;
    }

    .code-block .code-string {
      color: var(--chat-code-string);
    }

    .code-block .code-comment {
      color: var(--chat-code-comment);
      font-style: italic;
    }

    .code-block .code-function {
      color: var(--chat-code-function);
    }

    .code-block .code-number {
      color: var(--chat-code-number);
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
      background: rgba(0, 0, 0, 0.02);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--chat-text-secondary);
      cursor: pointer;
      user-select: none;
      transition: background 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: var(--chat-radius-sm) var(--chat-radius-sm) 0 0;
    }

    .section-header:hover {
      background: rgba(0, 0, 0, 0.04);
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
      padding: 4px 10px;
      font-size: 11px;
      border: 1px solid var(--chat-border);
      border-radius: 6px;
      background: var(--chat-surface);
      cursor: pointer;
      color: var(--chat-text-secondary);
      font-weight: 500;
      font-family: 'JetBrains Mono', monospace;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }

    .btn-icon:hover {
      background: var(--chat-surface-hover);
      border-color: var(--chat-border-strong);
      color: var(--chat-text-primary);
      transform: translateY(-1px);
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
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
    }

    .download-row {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-download {
      padding: 7px 14px;
      font-size: 12px;
      border: 1px solid var(--chat-accent);
      border-radius: 7px;
      background: var(--chat-accent);
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(74, 144, 226, 0.2);
    }

    .btn-download:hover {
      background: var(--chat-accent-hover);
      border-color: var(--chat-accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);
    }
  `]
})
export class MessageComponent {
  @Input() message!: ChatMessage;

  codeCollapsed = true;
  outputCollapsed = true;
  resultsCopied = false;
  codeCopied = false;
  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  copyResults(): void {
    if (!this.message?.content) return;
    this.copyToClipboard(this.message.content);
    this.resultsCopied = true;
    this.clearCopyFeedback(() => (this.resultsCopied = false));
  }

  copyCode(): void {
    if (!this.message?.code) return;
    this.copyToClipboard(this.message.code);
    this.codeCopied = true;
    this.clearCopyFeedback(() => (this.codeCopied = false));
  }

  getCodeLanguage(): string {
    if (!this.message?.code) return 'Code';
    const code = this.message.code.toLowerCase();
    if (code.includes('select') || code.includes('from') || code.includes('where')) return 'SQL';
    if (code.includes('import ') || code.includes('def ') || code.includes('pd.')) return 'Python';
    return 'Code';
  }

  highlightCode(code: string): string {
    if (!code) return '';
    const language = this.getCodeLanguage().toLowerCase();
    
    // Escape HTML
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    if (language === 'sql') {
      // SQL keywords
      const keywords = /\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|AS|AND|OR|NOT|IN|IS|NULL|BETWEEN|LIKE|EXISTS|CASE|WHEN|THEN|ELSE|END|DISTINCT|COUNT|SUM|AVG|MAX|MIN|ROUND|LIMIT|OFFSET|UNION|ALL|WITH|INTO|VALUES|SET|TABLE|INDEX|VIEW|INNER|LEFT|RIGHT|OUTER|CROSS|FULL|DESC|ASC)\b/gi;
      highlighted = highlighted.replace(keywords, '<span class="code-keyword">$1</span>');
      
      // Strings
      highlighted = highlighted.replace(/'([^']*)'/g, '<span class="code-string">\'$1\'</span>');
      
      // Comments
      highlighted = highlighted.replace(/(--.*$)/gm, '<span class="code-comment">$1</span>');
      
      // Numbers
      highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');
    } else if (language === 'python') {
      // Python keywords
      const keywords = /\b(import|from|def|class|return|if|elif|else|for|while|try|except|with|as|in|not|and|or|True|False|None|print|self|lambda|yield|raise|pass|break|continue|global|nonlocal|assert|del|async|await)\b/g;
      highlighted = highlighted.replace(keywords, '<span class="code-keyword">$1</span>');
      
      // Strings
      highlighted = highlighted.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g, '<span class="code-string">$1</span>');
      
      // Comments
      highlighted = highlighted.replace(/(#.*$)/gm, '<span class="code-comment">$1</span>');
      
      // Decorators
      highlighted = highlighted.replace(/(@\w+)/g, '<span class="code-function">$1</span>');
      
      // Functions
      highlighted = highlighted.replace(/\b([a-zA-Z_]+)\s*(?=\()/g, '<span class="code-function">$1</span>');
      
      // Numbers
      highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');
    }
    
    return highlighted;
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

  downloadAllCharts(): void {
    if (!this.message.charts || this.message.charts.length === 0) return;
    
    // For each chart, trigger download with a small delay to avoid browser blocking
    this.message.charts.forEach((chart, index) => {
      setTimeout(() => {
        if (chart.type === 'matplotlib') {
          // Download matplotlib image
          const link = document.createElement('a');
          link.href = `data:image/png;base64,${chart.data}`;
          link.download = `chart-${index + 1}-${Date.now()}.png`;
          link.click();
        } else if (chart.type === 'plotly' && typeof Plotly !== 'undefined') {
          // For Plotly, we need to find the chart element
          // Since we can't directly access child component methods, we'll use a workaround
          // by creating a temporary div and rendering the chart there
          const tempDiv = document.createElement('div');
          tempDiv.style.width = '1200px';
          tempDiv.style.height = '800px';
          document.body.appendChild(tempDiv);
          
          try {
            const plotData = JSON.parse(chart.data);
            Plotly.newPlot(tempDiv, plotData.data, plotData.layout, { staticPlot: true }).then(() => {
              Plotly.downloadImage(tempDiv, {
                format: 'png',
                width: 1200,
                height: 800,
                filename: `chart-${index + 1}-${Date.now()}`
              }).then(() => {
                document.body.removeChild(tempDiv);
              });
            });
          } catch (error) {
            console.error('Error downloading Plotly chart:', error);
            document.body.removeChild(tempDiv);
          }
        }
      }, index * 500); // 500ms delay between each download
    });
  }

  formatTakeaways(text: string): string {
    if (!text) return '';
    
    // Remove leading "Key Takeaways:" or similar headings from the text
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^(Key Takeaways|Key Takeaway|Takeaways|Takeaway)[:：]\s*/i, '');
    cleaned = cleaned.replace(/^##\s*Key Takeaways?\s*##?\s*/i, '');
    cleaned = cleaned.replace(/^#\s*Key Takeaways?\s*#?\s*/i, '');
    cleaned = cleaned.trim();
    
    // Escape HTML to prevent XSS first
    let formatted = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Convert markdown-style bold **text** to <strong> (before other processing)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Split into lines for processing
    const lines = formatted.split('\n');
    const result: string[] = [];
    let currentList: string[] = [];
    let listType: 'ol' | 'ul' | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - close any open list and add paragraph break
        if (currentList.length > 0) {
          const tag = listType === 'ol' ? 'ol' : 'ul';
          result.push(`<${tag}>${currentList.join('')}</${tag}>`);
          currentList = [];
          listType = null;
        }
        continue;
      }
      
      // Check for numbered list (1. item, 2. item, etc.)
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        if (listType !== 'ol') {
          if (currentList.length > 0 && listType === 'ul') {
            result.push(`<ul>${currentList.join('')}</ul>`);
            currentList = [];
          }
          listType = 'ol';
        }
        currentList.push(`<li>${numberedMatch[2]}</li>`);
        continue;
      }
      
      // Check for bullet points (- item or • item)
      const bulletMatch = line.match(/^[-•]\s+(.+)$/);
      if (bulletMatch) {
        if (listType !== 'ul') {
          if (currentList.length > 0 && listType === 'ol') {
            result.push(`<ol>${currentList.join('')}</ol>`);
            currentList = [];
          }
          listType = 'ul';
        }
        currentList.push(`<li>${bulletMatch[1]}</li>`);
        continue;
      }
      
      // Regular text line - close any open list first
      if (currentList.length > 0) {
        const tag = listType === 'ol' ? 'ol' : 'ul';
        result.push(`<${tag}>${currentList.join('')}</${tag}>`);
        currentList = [];
        listType = null;
      }
      
      // Add as paragraph
      result.push(`<p>${line}</p>`);
    }
    
    // Close any remaining list
    if (currentList.length > 0) {
      const tag = listType === 'ol' ? 'ol' : 'ul';
      result.push(`<${tag}>${currentList.join('')}</${tag}>`);
    }
    
    return result.join('');
  }
}

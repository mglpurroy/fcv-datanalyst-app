/**
 * Message Component
 * Displays a single chat message with code, charts, and key takeaways.
 * Code and results default to collapsed; key takeaways are rendered as plain text.
 */

import { Component, Input, OnInit } from '@angular/core';
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

          <!-- Output from executed code (expanded if conversational, collapsed if data) -->
          <div class="output-block" *ngIf="message.content && hasCodeOutput()" role="region" aria-label="Results">
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

          <!-- LLM-only output (always expanded) -->
          <div class="llm-output-block" *ngIf="isLlmOnlyOutput()" role="region" aria-label="Assistant response">
            <div class="section-header static-header">
              <span class="section-title">Assistant response</span>
              <div class="header-actions">
                <button type="button" class="btn-icon" (click)="copyResults()" [attr.aria-label]="resultsCopied ? 'Response copied' : 'Copy response'" title="Copy response">
                  {{ resultsCopied ? '✓ Copied' : 'Copy' }}
                </button>
              </div>
            </div>
            <div class="section-body">
              <div class="assistant-response-content" [innerHTML]="formatAssistantResponse(message.content || '')"></div>
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

    .key-takeaways-content li ul,
    .key-takeaways-content li ol {
      margin: 4px 0 4px 18px;
    }

    .key-takeaways-content em {
      font-style: italic;
      color: var(--chat-text-secondary);
    }

    .key-takeaways-content del {
      text-decoration: line-through;
      opacity: 0.65;
    }

    .key-takeaways-content code {
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 0.88em;
      padding: 2px 6px;
      background: var(--chat-accent-dim);
      border-radius: 4px;
      color: var(--chat-accent-text);
    }

    .key-takeaways-content a {
      color: var(--chat-accent);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .key-takeaways-content a:hover {
      color: var(--chat-accent-hover);
    }

    .key-takeaways-content blockquote {
      margin: 10px 0;
      padding: 8px 14px;
      border-left: 3px solid var(--chat-accent);
      background: var(--chat-accent-dim);
      border-radius: 0 var(--chat-radius-sm) var(--chat-radius-sm) 0;
      font-style: italic;
      color: var(--chat-text-secondary);
    }

    .key-takeaways-content h3,
    .key-takeaways-content h4,
    .key-takeaways-content h5 {
      margin: 14px 0 8px 0;
      font-weight: 600;
      color: var(--chat-accent);
      line-height: 1.3;
    }

    .key-takeaways-content h3 { font-size: 15px; }
    .key-takeaways-content h4 { font-size: 14px; }
    .key-takeaways-content h5 { font-size: 13px; }

    .key-takeaways-content hr {
      border: none;
      border-top: 1px solid var(--chat-border);
      margin: 12px 0;
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

    .llm-output-block {
      margin-top: 12px;
      border-radius: var(--chat-radius-md);
      overflow: hidden;
      background: var(--chat-surface-muted);
      border: 1px solid var(--chat-border);
      box-shadow: var(--chat-shadow-sm);
    }

    .llm-output-block .static-header {
      cursor: default;
    }

    .llm-output-block .static-header:hover {
      background: rgba(0, 0, 0, 0.02);
    }

    .assistant-response-content {
      font-size: 14px;
      line-height: 1.7;
      color: var(--chat-text-primary);
      white-space: normal;
    }

    .assistant-response-content p {
      margin: 0 0 10px 0;
    }

    .assistant-response-content p:last-child {
      margin-bottom: 0;
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
export class MessageComponent implements OnInit {
  @Input() message!: ChatMessage;

  codeCollapsed = true;
  outputCollapsed = true;
  resultsCopied = false;
  codeCopied = false;
  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Expand output by default if it's conversational or analytical (has charts/narrative)
    if (this.hasCodeOutput() && this.shouldExpandOutput()) {
      this.outputCollapsed = false;
    }
  }

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

  hasCodeOutput(): boolean {
    return !!this.message?.code;
  }

  isLlmOnlyOutput(): boolean {
    return !this.hasCodeOutput() && !!this.message?.content;
  }

  isConversationalOutput(): boolean {
    // Check if output is conversational (remit messages, greetings, help text)
    // rather than data/analysis output - these should be expanded
    if (!this.message?.content) return false;
    
    const content = this.message.content.toLowerCase().trim();
    
    // Remit message pattern
    if (content.includes('beyond my remit') || content.includes('data-focused question')) {
      return true;
    }
    
    // Greeting/help patterns
    const greetingPatterns = [
      'hello',
      'i\'m here to help',
      'please ask me',
      'how can i assist',
      'data-focused question',
      'such as:'
    ];
    if (greetingPatterns.some(pattern => content.includes(pattern))) {
      return true;
    }
    
    // Short, sentence-like output (likely conversational, not data tables)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 10 && content.length < 500) {
      // Check if it's mostly sentences (not tables/data)
      const hasTableIndicators = /^\s*[\w\s]+\s+\|\s+[\w\s]+/m.test(content) || 
                                 /\d+\s+\d+\s+\d+/m.test(content) ||
                                 content.includes('   ') || // multiple spaces (table alignment)
                                 content.split('\t').length > 2; // tabs (CSV-like)
      
      if (!hasTableIndicators) {
        return true;
      }
    }
    
    return false;
  }

  shouldExpandOutput(): boolean {
    // Expand output if:
    // 1. It's conversational (remit messages, greetings)
    // 2. It's analytical (has charts or narrative/key takeaways) - user wants to see results immediately
    if (this.isConversationalOutput()) {
      return true;
    }
    
    // Analytical outputs with charts or narrative should be expanded
    if (this.message?.charts && this.message.charts.length > 0) {
      return true;
    }
    
    if (this.message?.narrative) {
      return true;
    }
    
    return false;
  }

  formatAssistantResponse(text: string): string {
    return this.formatTakeaways(text || '');
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

  /**
   * Convert markdown-formatted key takeaways text into clean HTML.
   *
   * Supported markdown:
   *   **bold**, *italic*, `inline code`, ~~strikethrough~~
   *   # / ## / ### headings
   *   - / • / * unordered lists (with nested sub-items via indentation)
   *   1. / 2. ordered lists
   *   "Key takeaway:" repeated-line pattern (converted to bullet list)
   *   > blockquotes
   *   --- / *** / ___ horizontal rules
   *   [link text](url) links
   *   Blank-line paragraph separation
   */
  formatTakeaways(text: string): string {
    if (!text) return '';

    // ── 1. Strip leading "Key Takeaways:" header variants ──
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^#{1,3}\s*Key Takeaways?\s*#*\s*/i, '');
    cleaned = cleaned.replace(/^(Key Takeaways?|Takeaways?)[:：]\s*/i, '');
    cleaned = cleaned.trim();

    // ── 2. Normalise "Key takeaway: …" repeated lines into bullet list ──
    //    LLM often outputs:  Key takeaway: sentence.\nKey takeaway: sentence.
    const ktPattern = /^Key takeaway:\s*/i;
    const rawLines = cleaned.split('\n');
    const ktCount = rawLines.filter(l => ktPattern.test(l.trim())).length;
    if (ktCount >= 2) {
      cleaned = rawLines.map(l => {
        const trimmed = l.trim();
        if (ktPattern.test(trimmed)) {
          return '- ' + trimmed.replace(ktPattern, '');
        }
        return l;
      }).join('\n');
    }

    // ── 3. Escape HTML (XSS prevention) ──
    let safe = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // ── 4. Inline markdown → HTML ──
    const inlineMarkdown = (s: string): string => {
      // Links  [text](url)
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      // Inline code `code`
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Bold **text** or __text__ (allow optional space after/before delimiters)
      s = s.replace(/\*\*\s*(.+?)\s*\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__\s*(.+?)\s*__/g, '<strong>$1</strong>');
      // Orphaned ** at start of line with no closing ** → bold the rest of the string
      s = s.replace(/^\*\*\s*(.+)$/g, '<strong>$1</strong>');
      // Strip any remaining stray ** markers that didn't match a pair
      s = s.replace(/\*\*/g, '');
      // Italic *text* or _text_  (single, not inside a word)
      s = s.replace(/(?<!\w)\*\s*(.+?)\s*\*(?!\w)/g, '<em>$1</em>');
      s = s.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');
      // Strikethrough ~~text~~
      s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
      return s;
    };

    // ── 5. Block-level parsing ──
    const lines = safe.split('\n');
    const html: string[] = [];

    // Track open list stack: each entry is { tag: 'ul'|'ol', indent: number }
    const listStack: { tag: string; indent: number }[] = [];

    const closeListsTo = (targetIndent: number) => {
      while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetIndent) {
        const popped = listStack.pop()!;
        html.push(`</${popped.tag}>`);
      }
    };
    const closeAllLists = () => closeListsTo(0);

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();

      // ── Empty line → close lists, paragraph break ──
      if (!trimmed) {
        closeAllLists();
        continue;
      }

      // ── Horizontal rule ──
      if (/^([-*_])\1{2,}\s*$/.test(trimmed)) {
        closeAllLists();
        html.push('<hr>');
        continue;
      }

      // ── Headings: # ## ### ──
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+?)(?:\s*#+)?$/);
      if (headingMatch) {
        closeAllLists();
        const level = Math.min(headingMatch[1].length + 2, 6); // map # → h3, ## → h4, ### → h5
        html.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
        continue;
      }

      // ── Blockquote (&gt; text) ──
      const bqMatch = trimmed.match(/^&gt;\s*(.*)$/);
      if (bqMatch) {
        closeAllLists();
        html.push(`<blockquote>${inlineMarkdown(bqMatch[1])}</blockquote>`);
        continue;
      }

      // ── List items (ordered + unordered, with nesting via indent) ──
      const indent = raw.search(/\S/);  // leading whitespace count
      const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      const ulMatch = trimmed.match(/^[-•*]\s+(.+)$/);

      if (olMatch || ulMatch) {
        const itemText = olMatch ? olMatch[2] : ulMatch![1];
        const tag = olMatch ? 'ol' : 'ul';
        const nestLevel = Math.floor(indent / 2); // 0, 1, 2…

        // Close deeper lists
        while (listStack.length > 0 && listStack[listStack.length - 1].indent > nestLevel) {
          const popped = listStack.pop()!;
          html.push(`</${popped.tag}>`);
        }

        // Open new list if needed (different tag or deeper)
        if (listStack.length === 0 || listStack[listStack.length - 1].indent < nestLevel
            || listStack[listStack.length - 1].tag !== tag) {
          // If same indent but different tag, close old first
          if (listStack.length > 0 && listStack[listStack.length - 1].indent === nestLevel
              && listStack[listStack.length - 1].tag !== tag) {
            const popped = listStack.pop()!;
            html.push(`</${popped.tag}>`);
          }
          html.push(`<${tag}>`);
          listStack.push({ tag, indent: nestLevel });
        }

        html.push(`<li>${inlineMarkdown(itemText)}</li>`);
        continue;
      }

      // ── Regular paragraph text ──
      closeAllLists();
      html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    }

    // ── Close any remaining open lists ──
    closeAllLists();

    return html.join('');
  }
}

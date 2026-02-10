/**
 * Chat Interface Component
 * Main chat UI with message display and input
 */

import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { ChatMessage, ChatRequest } from '../../models/chat.model';
import { MessageComponent } from '../message/message.component';

const SUGGESTED_PROMPTS: { icon: string; text: string }[] = [
  { icon: '📈', text: 'What are the trends in fatalities over time in Nigeria?' },
  { icon: '🗺️', text: 'Show me a map of violence events in Nigeria in 2024' },
  { icon: '🔄', text: 'Compare conflict patterns between different regions' },
  { icon: '👥', text: 'Which actors are most active in armed violence?' },
];

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageComponent],
  template: `
    <div class="chat-container">
      <!-- Messages Area -->
      <div class="messages-area" #messagesContainer>
        <div class="messages-inner">
          <div class="welcome-message" *ngIf="messages.length === 0">
            <h2>Welcome to the Data Chatbot</h2>
            <p class="welcome-intro">I answer <strong>quantitative</strong> questions about the <strong>pre-loaded</strong> conflict data (ACLED). I run analysis on the dataset and return results, charts, or CSV—I do not answer from general knowledge or external sources.</p>
            <p><strong>I can:</strong> trends over time, counts and rankings, maps (specify country/region), comparisons, and export to CSV.</p>
            <p><strong>I cannot:</strong> answer qualitative or policy questions (e.g. root causes, “why did X happen?”), give recommendations, or use information not in your data.</p>
            <p class="welcome-note">I will be enhanced over time and connected to other data sources; for now I use pre-loaded ACLED data only.</p>
            <p class="suggested-label">Try a question:</p>
            <div class="suggested-cards">
              <button type="button" class="suggested-card" *ngFor="let prompt of suggestedPrompts" (click)="sendSuggested(prompt.text)">
                <span class="suggested-icon">{{ prompt.icon }}</span>
                <span class="suggested-text">{{ prompt.text }}</span>
              </button>
            </div>
          </div>

          <app-message
            *ngFor="let message of messages"
            [message]="message">
          </app-message>

          <div class="loading-indicator" *ngIf="isLoading">
            <div class="thinking-dots">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
            <span>Analyzing your data…</span>
          </div>
          <div #scrollAnchor></div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-wrapper" [class.input-focused]="inputFocused">
          <textarea
            #chatInput
            [(ngModel)]="userInput"
            (keydown.enter)="onEnterKey($any($event))"
            (input)="onInputChange($any($event.target))"
            (focus)="inputFocused = true"
            (blur)="inputFocused = false"
            [disabled]="disabled || isLoading"
            placeholder="{{ disabled ? 'Data is loading...' : 'Ask a question about the data...' }}"
            rows="1"
            class="chat-input">
          </textarea>
          <button 
            class="send-button"
            (click)="sendMessage()"
            [disabled]="disabled || isLoading || !userInput.trim()">
            <span *ngIf="!isLoading">Send ➤</span>
            <span *ngIf="isLoading">...</span>
          </button>
        </div>
        <p class="keyboard-hint" id="keyboard-hint">
          <span class="kbd">Enter</span> to send · <span class="kbd">Shift + Enter</span> for new line
        </p>
        <div class="input-actions">
          <button 
            class="btn btn-secondary btn-sm"
            (click)="clearChat()"
            [disabled]="messages.length === 0">
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--chat-bg-elevated);
    }

    .messages-area {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--chat-space-6);
      background: var(--chat-bg);
    }

    .messages-inner {
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
    }

    .welcome-message {
      margin: 40px auto;
      padding: 40px;
      background: var(--chat-surface);
      border-radius: var(--chat-radius-lg);
      border: 1px solid var(--chat-border);
      box-shadow: var(--chat-shadow-md);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 600px;
    }

    .welcome-message h2 {
      color: var(--chat-text-primary);
      margin-bottom: var(--chat-space-4);
      letter-spacing: -0.03em;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .welcome-message p {
      margin: 0 0 var(--chat-space-3) 0;
      color: var(--chat-text-secondary);
      line-height: 1.6;
      font-size: 13.5px;
    }

    .welcome-message p.welcome-intro {
      margin-bottom: var(--chat-space-4);
    }

    .welcome-message p.welcome-note {
      font-size: 12px;
      color: var(--chat-accent);
      margin: var(--chat-space-3) 0 var(--chat-space-4);
      background: var(--chat-accent-soft);
      border: 1px solid rgba(74, 144, 226, 0.18);
      border-radius: var(--chat-radius-sm);
      padding: 10px 12px;
    }

    .suggested-label {
      margin-top: var(--chat-space-4);
      margin-bottom: var(--chat-space-2);
      font-weight: 600;
      color: var(--chat-text-primary);
    }

    .suggested-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--chat-space-3);
      margin-top: var(--chat-space-3);
    }

    .suggested-card {
      padding: 16px;
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-border);
      background: var(--chat-surface);
      cursor: pointer;
      text-align: left;
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--chat-text-primary);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: var(--chat-shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .suggested-card:hover {
      border-color: var(--chat-accent);
      box-shadow: var(--chat-shadow-md), var(--chat-glow);
      transform: translateY(-2px);
      background: var(--chat-surface-hover);
    }

    .suggested-icon {
      display: block;
      font-size: 18px;
      margin-bottom: 6px;
    }

    .suggested-text {
      display: block;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: var(--chat-surface);
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-border);
      margin-top: var(--chat-space-3);
      color: var(--chat-text-secondary);
      box-shadow: var(--chat-shadow-sm);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .thinking-dots {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .thinking-dots .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--chat-accent);
      animation: pulse 1.4s ease-in-out infinite;
    }

    .thinking-dots .dot:nth-child(1) { animation-delay: 0s; }
    .thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

    .input-area {
      padding: var(--chat-space-5);
      background: var(--chat-bg-elevated);
      border-top: 1px solid var(--chat-border);
    }

    .input-wrapper {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      border-radius: var(--chat-radius-md);
      border: 1px solid var(--chat-border);
      background: var(--chat-bg);
      padding: 5px 5px 5px 14px;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: var(--chat-shadow-sm);
    }

    .input-wrapper.input-focused {
      border-color: var(--chat-accent);
      box-shadow: 0 0 0 2px var(--chat-accent-dim), var(--chat-shadow-sm);
      background: var(--chat-surface);
    }

    .chat-input {
      flex: 1;
      padding: 8px 0;
      border: none;
      background: transparent;
      border-radius: 0;
      font-size: 14px;
      resize: none;
      font-family: inherit;
      min-height: 32px;
      max-height: 120px;
      line-height: 1.45;
      color: var(--chat-text-primary);
    }

    .chat-input:focus {
      outline: none;
    }

    .chat-input:disabled {
      background: transparent;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .send-button {
      padding: 10px 20px;
      background: var(--chat-accent);
      color: white;
      border: none;
      border-radius: 9px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      min-width: 80px;
      height: 36px;
      align-self: flex-end;
      box-shadow: 0 1px 2px rgba(74, 144, 226, 0.2);
    }

    .send-button:hover:not(:disabled) {
      background: var(--chat-accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);
    }

    .send-button:disabled {
      background: var(--chat-border);
      color: var(--chat-text-tertiary);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .keyboard-hint {
      margin: 10px 0 0 0;
      font-size: 10.5px;
      color: var(--chat-text-tertiary);
      text-align: center;
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    .keyboard-hint .kbd {
      font-family: 'JetBrains Mono', monospace;
      padding: 3px 7px;
      background: var(--chat-accent-dim);
      border-radius: 4px;
      font-size: 10px;
      color: var(--chat-text-secondary);
      opacity: 0.7;
      font-weight: 500;
    }

    .input-actions {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    .input-actions .btn-secondary {
      background: #8a93af;
    }

    .input-actions .btn-secondary:hover:not(:disabled) {
      background: #7882a1;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    @media (max-width: 920px) {
      .messages-area,
      .input-area {
        padding: var(--chat-space-4);
      }

      .welcome-message {
        margin-top: 16px;
        padding: var(--chat-space-5);
      }
    }

    @media (max-width: 720px) {
      .suggested-cards {
        grid-template-columns: 1fr;
      }
      
      .welcome-message {
        padding: var(--chat-space-4);
        margin: 20px auto;
      }
      
      .welcome-message h2 {
        font-size: 20px;
      }
      
      .input-wrapper {
        padding: 4px 4px 4px 12px;
      }
      
      .send-button {
        min-width: 70px;
        padding: 8px 16px;
        font-size: 12px;
      }
    }

    @media (max-width: 480px) {
      .messages-area {
        padding: var(--chat-space-3);
      }
      
      .input-area {
        padding: var(--chat-space-3);
      }
      
      .welcome-message {
        padding: var(--chat-space-3);
        margin: 12px auto;
      }
      
      .keyboard-hint {
        font-size: 10px;
        gap: 12px;
      }
    }
  `]
})
export class ChatInterfaceComponent implements OnInit, OnDestroy {
  @Input() disabled = false;
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') chatInput?: ElementRef<HTMLTextAreaElement>;

  messages: ChatMessage[] = [];
  userInput = '';
  isLoading = false;
  inputFocused = false;
  suggestedPrompts = SUGGESTED_PROMPTS;
  private subscription?: Subscription;

  constructor(
    private chatService: ChatService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.subscription = this.chatService.messages$.subscribe(
      messages => {
        this.messages = messages;
        this.scrollToBottomLater();
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  scrollToBottomLater(): void {
    setTimeout(() => this.scrollToBottom(), 50);
  }

  scrollToBottom(): void {
    this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  sendSuggested(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  onInputChange(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.disabled || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date()
    };

    this.chatService.addMessage(userMessage);
    const messageText = this.userInput;
    this.userInput = '';
    if (this.chatInput?.nativeElement) {
      this.chatInput.nativeElement.style.height = 'auto';
    }
    this.isLoading = true;
    this.scrollToBottomLater();

    const request: ChatRequest = {
      message: messageText,
      session_id: this.chatService.getSessionId(),
      history: this.chatService.getConversationHistory()
    };

    this.apiService.sendChatMessage(request).subscribe({
      next: (response) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.execution_result || response.response,
          timestamp: new Date(),
          code: response.code,
          charts: response.charts,
          error: response.error,
          narrative: response.narrative
        };
        
        this.chatService.addMessage(assistantMessage);
        this.isLoading = false;
        this.scrollToBottomLater();
      },
      error: (error) => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Error processing your request.',
          timestamp: new Date(),
          error: error.error?.detail || error.message
        };
        
        this.chatService.addMessage(errorMessage);
        this.isLoading = false;
        this.scrollToBottomLater();
      }
    });
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    if (confirm('Are you sure you want to clear the chat history?')) {
      this.chatService.clearMessages();
    }
  }
}

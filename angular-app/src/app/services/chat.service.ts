/**
 * Chat Service
 * Manages chat state and conversation history
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, DataSchema } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();

  private dataSchemaSubject = new BehaviorSubject<DataSchema | null>(null);
  public dataSchema$: Observable<DataSchema | null> = this.dataSchemaSubject.asObservable();

  private sessionId = 'default';

  constructor() {}

  /**
   * Add a message to the conversation
   */
  addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  /**
   * Clear conversation history
   */
  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  /**
   * Set data schema
   */
  setDataSchema(schema: DataSchema): void {
    this.dataSchemaSubject.next(schema);
  }

  /**
   * Get data schema
   */
  getDataSchema(): DataSchema | null {
    return this.dataSchemaSubject.value;
  }

  /**
   * Get conversation history for API
   */
  getConversationHistory(): { role: string; content: string }[] {
    return this.messagesSubject.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

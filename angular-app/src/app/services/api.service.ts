/**
 * API Service
 * Handles all HTTP communication with the FastAPI backend
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ChatRequest, 
  ChatResponse, 
  DataLoadResponse, 
  DataSchema,
  ApiConfig 
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Check backend health
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Upload CSV file
   */
  uploadData(file: File): Observable<DataLoadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DataLoadResponse>(`${this.baseUrl}/data/upload`, formData);
  }

  /**
   * Load data from URL(s)
   */
  loadDataFromUrls(urls: string[], sessionId?: string): Observable<DataLoadResponse> {
    return this.http.post<DataLoadResponse>(`${this.baseUrl}/data/load-url`, {
      urls,
      session_id: sessionId
    });
  }

  /**
   * Get data schema
   */
  getDataSchema(sessionId: string = 'default'): Observable<{ schema: DataSchema }> {
    return this.http.get<{ schema: DataSchema }>(`${this.baseUrl}/data/schema`, {
      params: { session_id: sessionId }
    });
  }

  /**
   * Update API configuration
   */
  updateConfig(config: ApiConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/config`, config);
  }

  /**
   * Send chat message and get analysis
   */
  sendChatMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request);
  }

  /**
   * List all sessions
   */
  listSessions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/sessions`);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/session/${sessionId}`);
  }
}

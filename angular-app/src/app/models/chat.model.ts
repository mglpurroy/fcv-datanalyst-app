/**
 * Data models for the FCV Data Analyst application
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  code?: string;
  charts?: Chart[];
  error?: string;
  narrative?: string;
}

export interface Chart {
  type: 'matplotlib' | 'plotly';
  data: string; // Base64 for matplotlib, JSON for plotly
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  history: { role: string; content: string }[];
}

export interface ChatResponse {
  response: string;
  code?: string;
  execution_result?: string;
  execution_success: boolean;
  error?: string;
  charts?: Chart[];
  summary_data?: any;
  narrative?: string;
}

export interface DataSchema {
  type: string;
  dataframe_name: string;
  shape: [number, number];
  columns: string[];
  dtypes: { [key: string]: string };
  sample_data: any[];
  date_range: {
    min: string;
    max: string;
  };
}

export interface ApiConfig {
  provider: 'openai' | 'azure' | 'anthropic';
  api_key?: string;
  model?: string;
  azure_endpoint?: string;
}

export interface DataLoadResponse {
  success: boolean;
  message: string;
  schema?: DataSchema;
  session_id: string;
}

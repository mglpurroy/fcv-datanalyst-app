"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    """Request for chat endpoint"""
    message: str = Field(..., description="User's message/question")
    session_id: Optional[str] = "default"
    history: Optional[List[Dict[str, str]]] = []
    
class Chart(BaseModel):
    """Chart data"""
    type: str = Field(..., description="Chart type: matplotlib or plotly")
    data: str = Field(..., description="Base64 encoded image or JSON")

class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    response: str = Field(..., description="LLM response")
    code: Optional[str] = None
    execution_result: Optional[str] = None
    execution_success: bool = False
    error: Optional[str] = None
    charts: Optional[List[Chart]] = []  # Chart objects
    summary_data: Optional[Dict[str, Any]] = None
    narrative: Optional[str] = None

class DataLoadRequest(BaseModel):
    """Request to load data from URL(s)"""
    urls: List[str] = Field(..., description="List of CSV URLs")
    session_id: Optional[str] = "default"

class DataLoadPathRequest(BaseModel):
    """Request to load data from local file path"""
    path: Optional[str] = Field(None, description="Full path to CSV file; omit to use default ACLED path")
    session_id: Optional[str] = "default"

class DataLoadResponse(BaseModel):
    """Response from data loading"""
    success: bool
    message: str
    schema: Optional[Dict[str, Any]] = None
    session_id: str

class DataSchemaResponse(BaseModel):
    """Response containing data schema"""
    schema: Dict[str, Any]

class ConfigRequest(BaseModel):
    """Configuration for LLM API"""
    provider: str = Field(..., description="API provider: openai, azure, anthropic")
    api_key: Optional[str] = None
    model: Optional[str] = None  # None => use service default (claude-opus-4-6)
    azure_endpoint: Optional[str] = None
    
class ExecutionResult(BaseModel):
    """Result from code execution"""
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    charts: Optional[List[str]] = []
    summary_data: Optional[Dict[str, Any]] = None

class SQLConnectionRequest(BaseModel):
    """Request to connect to SQL database"""
    db_type: str = Field(..., description="Database type: sqlserver, postgresql, mysql")
    connection_string: Optional[str] = Field(None, description="Full connection string")
    # Alternative: individual parameters
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    session_id: Optional[str] = "default"
    # SQL Server specific
    driver: Optional[str] = "ODBC Driver 17 for SQL Server"
    # PostgreSQL specific
    sslmode: Optional[str] = "prefer"

class SQLQueryRequest(BaseModel):
    """Request to execute SQL query"""
    query: str = Field(..., description="SQL query to execute")
    session_id: Optional[str] = "default"

"""
FastAPI Backend for FCV Data Analyst Chatbot
Provides REST API endpoints for Angular frontend
"""

import sys
import io

# Set UTF-8 encoding for all I/O operations
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
import io
import json
import os
from datetime import datetime
import traceback

# Load .env from the backend directory so it works regardless of where the server is started
try:
    from pathlib import Path
    from dotenv import load_dotenv
    _backend_dir = Path(__file__).resolve().parent
    load_dotenv(_backend_dir / ".env")
except ImportError:
    pass

# Import services
from services.data_loader import DataLoaderService, DEFAULT_ACLED_PATH
from services.llm_service import LLMService
from services.code_executor import CodeExecutorService
from services.sql_service import SQLService
from services.data360_service import Data360Service
from models import (
    ChatMessage, ChatRequest, ChatResponse, Chart,
    DataLoadRequest, DataLoadResponse, DataLoadPathRequest,
    DataSchemaResponse, ConfigRequest,
    SQLConnectionRequest, SQLQueryRequest
)

app = FastAPI(title="FCV Data Analyst API", version="1.0.0")

# Shown when the user's question is out of scope (non-data query)
OUT_OF_REMIT_MESSAGE = (
    "I am designed to address FCV-focused data queries. Your question is beyond my remit. "
    "Please reformulate it as a data-focused question I can help with (e.g. trends, counts, maps, rankings from the dataset)."
)

# CORS configuration - allow Angular dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",  # Angular dev server
        "http://localhost:3000",
        "https://your-angular-app.com"  # Update for production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
data_loader = DataLoaderService()
llm_service = LLMService()
code_executor = CodeExecutorService()
sql_service = SQLService()
data360_service = Data360Service()

# In-memory storage (replace with Redis/database for production)
sessions = {}

@app.on_event("startup")
async def load_default_acled_data():
    """Load default ACLED data from configured path on startup."""
    if os.path.isfile(DEFAULT_ACLED_PATH):
        try:
            df = data_loader.load_from_path(DEFAULT_ACLED_PATH)
            data_loader.store_data("default", df)
            print(f"Loaded default ACLED data: {len(df):,} rows from {DEFAULT_ACLED_PATH}")
        except Exception as e:
            print(f"Could not load default ACLED data: {e}")
    else:
        print(f"Default ACLED file not found (will use upload/URL/path): {DEFAULT_ACLED_PATH}")


@app.on_event("startup")
async def configure_llm_from_env():
    """Pre-configure LLM from environment variables. Defaults to Claude Sonnet 4.5."""
    provider = os.getenv("LLM_PROVIDER", "").strip().lower() or "anthropic"
    if not provider or provider not in ("openai", "anthropic", "azure"):
        # Default to Anthropic if no provider specified or invalid
        if os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        else:
            provider = "anthropic"  # Default to Anthropic
    
    try:
        llm_service.configure(
            provider=provider,
            api_key=None,  # use env for openai/anthropic
            model=os.getenv("LLM_MODEL") or ("claude-sonnet-4-5" if provider == "anthropic" else None),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT") or None,
        )
        print(f"LLM pre-configured: provider={provider}, model={llm_service.model}")
    except Exception as e:
        print(f"LLM config error: {e}")
        print("Note: Set ANTHROPIC_API_KEY in environment or .env file to use Claude")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "FCV Data Analyst API",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "data_loader": "ready",
            "llm_service": "ready",
            "code_executor": "ready"
        }
    }

@app.post("/api/data/upload")
async def upload_data(file: UploadFile = File(...)):
    """Upload CSV data file"""
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), low_memory=False)
        
        # Store data (in production, use session management)
        session_id = "default"  # TODO: Implement proper session management
        data_loader.store_data(session_id, df)
        
        schema = data_loader.get_schema(df)
        
        return DataLoadResponse(
            success=True,
            message=f"Successfully loaded {len(df):,} rows",
            schema=schema,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading data: {str(e)}")

@app.post("/api/data/load-url")
async def load_data_from_url(request: DataLoadRequest):
    """Load data from URL(s)"""
    try:
        df = data_loader.load_from_urls(request.urls)
        
        session_id = request.session_id or "default"
        data_loader.store_data(session_id, df)
        
        schema = data_loader.get_schema(df)
        
        return DataLoadResponse(
            success=True,
            message=f"Successfully loaded {len(df):,} rows from {len(request.urls)} file(s)",
            schema=schema,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading data: {str(e)}")

@app.post("/api/data/load-path")
async def load_data_from_path(request: Optional[DataLoadPathRequest] = Body(None)):
    """Load data from local file path. Omit body or path to use default ACLED file."""
    try:
        path = (request.path if request and request.path else None) or DEFAULT_ACLED_PATH
        df = data_loader.load_from_path(path)
        session_id = (request.session_id if request else None) or "default"
        data_loader.store_data(session_id, df)
        schema = data_loader.get_schema(df)
        return DataLoadResponse(
            success=True,
            message=f"Successfully loaded {len(df):,} rows from {path}",
            schema=schema,
            session_id=session_id
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading data: {str(e)}")

@app.get("/api/data/schema")
async def get_data_schema(session_id: str = "default"):
    """Get current data schema"""
    try:
        df = data_loader.get_data(session_id)
        if df is None:
            raise HTTPException(status_code=404, detail="No data loaded")
        
        schema = data_loader.get_schema(df)
        return DataSchemaResponse(schema=schema)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/config/env")
async def get_config_env_docs():
    """Return environment variable names used for API keys (so UI can show 'or set in env')."""
    return {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "azure_endpoint": "AZURE_OPENAI_ENDPOINT",
        "optional": {
            "LLM_PROVIDER": "openai | anthropic | azure (auto-configure on startup)",
            "LLM_MODEL": "e.g. gpt-4, claude-sonnet-4-5",
            "ACLED_DEFAULT_PATH": "Path to default ACLED CSV",
        },
    }


@app.post("/api/config")
async def update_config(config: ConfigRequest):
    """Update API configuration. Leave API key blank to use value from environment."""
    try:
        llm_service.configure(
            provider=config.provider,
            api_key=config.api_key,
            model=config.model,
            azure_endpoint=config.azure_endpoint
        )
        return {"success": True, "message": "Configuration updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# SQL Database Endpoints
@app.post("/api/sql/connect")
async def connect_sql(request: SQLConnectionRequest):
    """Connect to SQL database"""
    try:
        session_id = request.session_id or "default"
        
        # Build connection parameters
        conn_params = {
            'db_type': request.db_type,
            'connection_string': request.connection_string,
            'host': request.host,
            'port': request.port,
            'database': request.database,
            'username': request.username,
            'password': request.password,
            'driver': request.driver,
            'sslmode': request.sslmode
        }
        
        result = sql_service.connect(session_id, **conn_params)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Connection failed'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/sql/query")
async def execute_sql_query(request: SQLQueryRequest):
    """Execute SQL query and load data"""
    try:
        session_id = request.session_id or "default"
        
        # Execute query
        result = sql_service.execute_query(session_id, request.query)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Query execution failed'))
        
        df = result['data']
        
        # Store in data loader
        data_loader.store_data(session_id, df)
        
        # Get schema
        schema = data_loader.get_schema(df)
        
        return DataLoadResponse(
            success=True,
            message=f"Successfully loaded {len(df):,} rows from SQL query",
            schema=schema,
            session_id=session_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error executing SQL query: {str(e)}")

@app.get("/api/sql/tables")
async def list_sql_tables(session_id: str = "default"):
    """List all tables in connected database"""
    try:
        result = sql_service.list_tables(session_id)
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to list tables'))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/sql/disconnect")
async def disconnect_sql(session_id: str = "default"):
    """Disconnect from SQL database"""
    try:
        sql_service.disconnect(session_id)
        return {"success": True, "message": "Disconnected from database"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Process chat message and return analysis"""
    try:
        session_id = request.session_id or "default"
        
        # Get data
        df = data_loader.get_data(session_id)
        if df is None:
            raise HTTPException(status_code=404, detail="No data loaded. Please upload data first.")
        
        # Get schema for system prompt
        schema = data_loader.get_schema(df)
        
        # Optional enrichment: load World Bank population data only when requested.
        df_pop = pd.DataFrame()
        population_warnings: List[str] = []
        if data360_service.needs_population_data(request.message):
            try:
                pop_result = data360_service.build_population_for_acled(df)
                df_pop = pop_result.df_pop
                population_warnings = pop_result.warnings
            except Exception as pop_error:
                population_warnings = [f"Population enrichment failed: {str(pop_error)}"]

        # Agentic: get structured query spec first (planning step)
        query_spec = await llm_service.get_query_spec(request.message)
        
        # Agentic: tabulate columns selected for analysis (dtype + value_counts) so code gen uses actual format/values
        columns_to_profile = list(schema.get("value_info", {}).keys())
        if query_spec and isinstance(query_spec.get("groupby"), list):
            columns_to_profile = list(set(columns_to_profile) | set(query_spec["groupby"]))
        for c in ["event_date", "event_id_cnty", "fatalities", "actor1", "actor2", "admin2"]:
            if c in df.columns and c not in columns_to_profile:
                columns_to_profile.append(c)
        schema["column_profile"] = data_loader.get_column_profile(df, columns_to_profile)
        if not df_pop.empty:
            schema["aux_dataframes"] = {
                "df_pop": {
                    "description": "World Bank WDI population loaded from Data360 API",
                    "columns": list(df_pop.columns),
                    "shape": df_pop.shape,
                    "join_guidance": "Join ACLED and population with country + year. Build year from event_date if needed.",
                }
            }
        if population_warnings:
            schema["aux_warnings"] = population_warnings
        
        # Call LLM to get code (with spec if we got one)
        llm_response = await llm_service.get_analysis_code(
            user_message=request.message,
            conversation_history=request.history,
            schema=schema,
            query_spec=query_spec
        )
        
        # Out-of-scope: no code block -> treat as remit message, do not execute
        if "```python" not in llm_response and "```" not in llm_response:
            text = llm_response.strip()
            if not text or len(text) < 20:
                text = OUT_OF_REMIT_MESSAGE
            return ChatResponse(
                response=text,
                code=None,
                execution_result=text,
                execution_success=True,
                error=None,
                charts=[],
                summary_data=None,
                narrative=None
            )
        
        # Extract code and validate (agentic: checker step)
        code = code_executor.extract_code(llm_response)
        valid, validation_error = code_executor.validate_code(code, schema)
        if not valid:
            # One retry: ask LLM to fix validation error
            retry_history = (request.history or []) + [
                {"role": "assistant", "content": llm_response},
                {"role": "user", "content": f"The generated code failed validation: {validation_error} Provide corrected Python code only, using allowed columns and no forbidden operations (no subprocess, os.system, eval, exec, network)."}
            ]
            llm_response = await llm_service.get_analysis_code(
                user_message="Provide corrected Python code only.",
                conversation_history=retry_history,
                schema=schema,
                query_spec=query_spec
            )
            code = code_executor.extract_code(llm_response)
            valid, validation_error = code_executor.validate_code(code, schema)
            if not valid:
                return ChatResponse(
                    response=llm_response,
                    code=code,
                    execution_result=None,
                    execution_success=False,
                    error=f"Validation failed: {validation_error}",
                    charts=[],
                    summary_data=None,
                    narrative=None
                )
        execution_result = code_executor.execute_safely(code, df, df_pop=df_pop)
        out_output = execution_result.get("output", "")
        out_success = execution_result.get("success", False)
        out_error = execution_result.get("error")
        
        # When execution fails with "not defined" (e.g. execute_sql), treat as out-of-remit and show friendly message
        if not out_success and out_error and ("is not defined" in out_error or "execute_sql" in out_error):
            out_output = OUT_OF_REMIT_MESSAGE
            out_error = None
            out_success = True
        
        # Key takeaways: ALWAYS generate from actual execution output to avoid hallucination.
        # The LLM's pre-execution "key takeaways" are unreliable because the LLM
        # writes them before seeing the real numbers — so we never use them.
        narrative = None
        if out_success and out_output and len(out_output.strip()) > 10:
            needs_narrative_response = llm_service.needs_narrative(request.message)
            if needs_narrative_response:
                narrative = await llm_service.generate_narrative(
                    user_question=request.message,
                    analysis_output=out_output,
                    analysis_data=execution_result.get("summary_data")
                )
        
        return ChatResponse(
            response=llm_response,
            code=code,
            execution_result=out_output,
            execution_success=out_success,
            error=out_error,
            charts=execution_result.get("charts", []),
            summary_data=execution_result.get("summary_data"),
            narrative=narrative
        )
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat response (for real-time LLM output)"""
    # TODO: Implement streaming response
    pass

@app.get("/api/sessions")
async def list_sessions():
    """List all active sessions"""
    return {
        "sessions": [
            {
                "id": session_id,
                "has_data": data_loader.get_data(session_id) is not None,
                "row_count": len(data_loader.get_data(session_id)) if data_loader.get_data(session_id) is not None else 0
            }
            for session_id in data_loader.list_sessions()
        ]
    }

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its data"""
    data_loader.delete_session(session_id)
    return {"success": True, "message": f"Session {session_id} deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

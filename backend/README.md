# FCV Data Analyst - FastAPI Backend

FastAPI backend for the FCV Data Analyst chatbot application.

## Features

- **Data Loading**: Upload CSV files or load from URLs
- **LLM Integration**: Supports OpenAI, Azure OpenAI (ITSAI Platform), and Anthropic (Claude)
- **Code Execution**: Safe execution of pandas code in sandboxed environment
- **Visualization**: Automatic chart generation with matplotlib and plotly
- **Narrative Generation**: AI-powered narrative summaries

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file:

```env
# Optional: Default API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Optional: CORS origins for production
CORS_ORIGINS=http://localhost:4200,https://your-domain.com
```

### 3. Run the Server

```bash
# Development
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /api/health` - Detailed health check

### Data Management
- `POST /api/data/upload` - Upload CSV file
- `POST /api/data/load-url` - Load data from URL(s)
- `GET /api/data/schema` - Get current data schema

### Configuration
- `POST /api/config` - Update LLM API configuration

### Chat
- `POST /api/chat` - Send chat message and get analysis

### Sessions
- `GET /api/sessions` - List all sessions
- `DELETE /api/session/{session_id}` - Delete a session

## Architecture

```
backend/
├── main.py           # FastAPI application entry point
├── models.py         # Pydantic models
├── services/
│   ├── data_loader.py      # Data loading and management
│   ├── llm_service.py      # LLM API integration
│   └── code_executor.py    # Safe code execution
└── requirements.txt
```

## Development

### Adding New Endpoints

1. Add endpoint in `main.py`
2. Add Pydantic models in `models.py`
3. Add service logic in `services/`

### Testing

```bash
# Install test dependencies
pip install pytest httpx

# Run tests
pytest
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production

- Set `CORS_ORIGINS` to your Angular app URL
- Configure API keys via environment variables or secrets management

## Security Notes

- Code execution is sandboxed but still requires careful monitoring
- Always validate and sanitize user inputs
- Use HTTPS in production
- Implement rate limiting for production deployment
- Store API keys securely (use secrets management)

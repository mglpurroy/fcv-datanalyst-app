# FCV Data Analyst - Angular Version

**A modern Angular + FastAPI implementation of the FCV Data Analyst chatbot.**

This is a complete rewrite of the Streamlit application, split into a professional Angular frontend and FastAPI backend architecture.

## 🎯 Quick Start

### Prerequisites
- Python 3.8+ with pip
- Node.js 18+ with npm
- (Optional) Angular CLI: `npm install -g @angular/cli`

### 1. Start Backend

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 2. Start Frontend

```bash
# Navigate to Angular app directory (in a new terminal)
cd angular-app

# Install Node dependencies
npm install

# Run the dev server
npm start
```

Frontend runs at: `http://localhost:4200`

### 3. Use the App

1. Open `http://localhost:4200` in your browser
2. **Upload Data**: Use the sidebar to upload a CSV file or enter a data URL
3. **Configure API**: Set your API provider (OpenAI, Azure, or Anthropic) and API key
4. **Ask Questions**: Type your question in the chat interface
5. **View Results**: See generated code, charts, and analysis

## 📁 Project Structure

```
streamlit-deploy/
├── backend/                    # FastAPI Backend
│   ├── main.py                # API entry point
│   ├── models.py              # Pydantic models
│   ├── services/              # Business logic
│   │   ├── data_loader.py    # Data loading service
│   │   ├── llm_service.py    # LLM integration
│   │   └── code_executor.py  # Code execution
│   ├── requirements.txt       # Python dependencies
│   └── README.md             # Backend docs
│
├── angular-app/               # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # UI components
│   │   │   ├── services/     # Angular services
│   │   │   ├── models/       # TypeScript interfaces
│   │   │   └── app.component.ts
│   │   ├── styles.css        # Global styles
│   │   └── index.html
│   ├── package.json          # Node dependencies
│   ├── angular.json          # Angular config
│   └── README.md            # Frontend docs
│
└── ANGULAR_MIGRATION_GUIDE.md  # Migration guide
```

## ✨ Features

### Data Management
- ✅ Upload CSV files directly
- ✅ Load data from URLs (including Dropbox links)
- ✅ Support for multiple data files
- ✅ Automatic data schema detection
- ✅ Session-based data storage

### LLM Integration
- ✅ OpenAI (GPT-4, GPT-3.5-turbo)
- ✅ Azure OpenAI (with ITSAI Platform support)
- ✅ Anthropic Claude (Sonnet, Haiku)
- ✅ Configurable via UI
- ✅ System prompt optimization

### Analysis & Code Execution
- ✅ Natural language queries
- ✅ Automatic pandas code generation
- ✅ Safe code execution environment
- ✅ Support for complex analytics
- ✅ Statistical analysis (sklearn, statsmodels)

### Visualizations
- ✅ Matplotlib charts (static)
- ✅ Plotly charts (interactive)
- ✅ Geographic maps
- ✅ Time series plots
- ✅ Custom visualizations

### AI Narratives
- ✅ Automatic narrative generation
- ✅ Context-aware summaries
- ✅ Policy brief format
- ✅ Trend analysis

### User Interface
- ✅ Modern, responsive design
- ✅ Chat-based interface
- ✅ Real-time updates
- ✅ Error handling
- ✅ Mobile-friendly

## 🔧 Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Optional: Pre-configure API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# CORS settings
CORS_ORIGINS=http://localhost:4200,https://your-domain.com
```

### Frontend Configuration

Update the API endpoint in `angular-app/src/app/services/api.service.ts`:

```typescript
private baseUrl = 'http://localhost:8000/api';  // For development
```

For production, change to your deployed backend URL.

## 🚀 Deployment

### Backend Deployment

**Option 1: Traditional Server**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Option 2: Docker**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Option 3: Cloud Platforms**
- AWS Lambda (with Mangum adapter)
- Google Cloud Run
- Azure App Service
- Heroku

### Frontend Deployment

**Build for Production:**
```bash
cd angular-app
ng build --configuration production
```

**Deploy to:**
- **Netlify**: Drop the `dist/` folder
- **Vercel**: Connect GitHub repo
- **AWS S3 + CloudFront**: Upload build files
- **Azure Static Web Apps**: Push to GitHub
- **Firebase Hosting**: `firebase deploy`

**Important**: Configure redirects for Angular routing:

Netlify `_redirects`:
```
/*    /index.html   200
```

## 🔐 Security Considerations

1. **API Keys**: Never commit API keys to git. Use environment variables.
2. **CORS**: Configure CORS properly for production domains
3. **Code Execution**: The code executor is sandboxed but monitor usage
4. **Rate Limiting**: Implement rate limiting in production
5. **Authentication**: Add authentication for production use
6. **HTTPS**: Always use HTTPS in production

## 📊 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🆚 Streamlit vs Angular

| Aspect | Streamlit | Angular Version |
|--------|-----------|-----------------|
| **Architecture** | Monolithic | Microservices (Backend + Frontend) |
| **Deployment** | Single app | Independent deployment |
| **Scalability** | Limited | Excellent |
| **UI Customization** | Limited | Full control |
| **Performance** | Good | Better |
| **Mobile Support** | Basic | Excellent |
| **Learning Curve** | Low | Medium |
| **Maintenance** | Easy | More structured |

## 🐛 Troubleshooting

### "Connection refused" errors
- Ensure backend is running on port 8000
- Check CORS configuration includes your frontend URL

### "Module not found" in backend
```bash
cd backend
pip install -r requirements.txt
```

### "npm install" errors in frontend
```bash
cd angular-app
rm -rf node_modules package-lock.json
npm install
```

### Charts not displaying
- Check browser console for errors
- Verify Plotly is loaded (check Network tab)
- Ensure backend returns chart data correctly

### API key errors
- Verify API key is set in backend `.env` or UI
- Check API key has sufficient credits/quota
- Test with different provider if one fails

## 📖 Documentation

- [Backend README](backend/README.md) - Backend API documentation
- [Frontend README](angular-app/README.md) - Angular app documentation  
- [Migration Guide](ANGULAR_MIGRATION_GUIDE.md) - Detailed migration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

Internal World Bank tool for FCV analysis.

## 💡 Example Queries

Try these questions with your data:

- "What are the trends in fatalities over time in Nigeria?"
- "Show me a map of violence events in 2024"
- "Compare conflict patterns between different regions"
- "Which actors are most active in armed violence?"
- "Create a time series of protests vs battles"
- "Analyze seasonal patterns in conflict events"
- "Show demographic breakdown of affected populations"

## 🎓 Learning Resources

- [Angular Documentation](https://angular.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pandas Documentation](https://pandas.pydata.org/)
- [Plotly Documentation](https://plotly.com/python/)

## 🆘 Support

For issues or questions:
1. Check the README files in `backend/` and `angular-app/`
2. Review the Migration Guide
3. Check API documentation at `/docs`
4. Look at browser console logs
5. Check backend server logs

---

**Built with ❤️ for FCV Data Analysis**

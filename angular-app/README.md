# FCV Data Analyst - Angular Frontend

Modern Angular frontend for the FCV Data Analyst chatbot application.

## Features

- **Chat Interface**: Clean, intuitive chat UI for data analysis
- **Data Upload**: Upload CSV files or load from URLs
- **API Configuration**: Support for OpenAI, Azure OpenAI, and Anthropic
- **Visualization**: Display matplotlib and plotly charts
- **Responsive Design**: Works on desktop and mobile
- **Real-time Analysis**: See code execution and results in real-time

## Prerequisites

- Node.js 18+ and npm
- Angular CLI (`npm install -g @angular/cli`)

## Setup

### 1. Install Dependencies

```bash
cd angular-app
npm install
```

### 2. Configure Backend URL

Edit `src/app/services/api.service.ts` and update the `baseUrl`:

```typescript
private baseUrl = 'http://localhost:8000/api';  // Development
// private baseUrl = 'https://your-api-domain.com/api';  // Production
```

### 3. Run Development Server

```bash
npm start
# Or
ng serve
```

Navigate to `http://localhost:4200/`

## Build

### Development Build

```bash
ng build
```

### Production Build

```bash
ng build --configuration production
```

The build artifacts will be in the `dist/` directory.

## Project Structure

```
angular-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── chat-interface/      # Main chat UI
│   │   │   ├── message/             # Message display
│   │   │   ├── chart-display/       # Chart rendering
│   │   │   ├── data-upload/         # Data upload UI
│   │   │   └── config-panel/        # API configuration
│   │   ├── services/
│   │   │   ├── api.service.ts       # HTTP API calls
│   │   │   └── chat.service.ts      # Chat state management
│   │   ├── models/
│   │   │   └── chat.model.ts        # TypeScript interfaces
│   │   └── app.component.ts         # Root component
│   ├── styles.css                   # Global styles
│   └── index.html
├── angular.json                     # Angular configuration
├── package.json                     # Dependencies
└── tsconfig.json                    # TypeScript configuration
```

## Key Components

### ChatInterfaceComponent
Main chat interface with message history and input.

### MessageComponent
Displays individual messages with code, charts, and narratives.

### ChartDisplayComponent
Renders matplotlib (as images) and plotly (interactive) charts.

### DataUploadComponent
Handles CSV file upload and URL loading.

### ConfigPanelComponent
API provider and model configuration.

## Services

### ApiService
Handles all HTTP communication with the FastAPI backend.

### ChatService
Manages chat state, conversation history, and data schema.

## Styling

The app uses a custom design system with:
- Modern gradient header
- Clean card-based UI
- Responsive layout
- Custom scrollbars
- Smooth animations

## Deployment

### Static Hosting (Netlify, Vercel, etc.)

1. Build the app:
   ```bash
   ng build --configuration production
   ```

2. Deploy the `dist/fcv-data-analyst` directory

3. Configure redirects for Angular routing (create `_redirects` file):
   ```
   /*    /index.html   200
   ```

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/fcv-data-analyst /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Configuration

For different environments (dev, staging, prod), use Angular environments:

1. Create environment files:
   - `src/environments/environment.ts` (development)
   - `src/environments/environment.prod.ts` (production)

2. Configure API URLs per environment

## Development

### Adding New Features

1. Generate component: `ng generate component components/my-component`
2. Generate service: `ng generate service services/my-service`
3. Update routing if needed

### Code Style

- Use Angular style guide
- Follow TypeScript best practices
- Use standalone components (Angular 17+)
- Implement proper error handling

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### CORS Errors
Make sure the backend CORS configuration includes your frontend URL.

### Plotly Not Rendering
Ensure plotly.js is loaded. Add to `index.html`:
```html
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
```

### API Connection Failed
Check that the backend is running and the API URL is correct in `api.service.ts`.

# Personal Fitness Agent & Physical Therapy-Informed Trainer

An AI-powered personal fitness agent designed specifically for athletes recovering from ACL reconstruction, with comprehensive training plan management, readiness scoring, and multi-platform data integration.

## 🚀 Live API

- **Production URL**: https://gpt-proxy-danlevitt.vercel.app
- **OpenAPI Schema**: https://gpt-proxy-danlevitt.vercel.app/openapi.yaml
- **ChatGPT Actions**: Integrated with stable domain for automatic updates

## Features

### Core Mission Features
- **ACL Recovery-Focused Training**: Specialized training plans respecting orthopedic constraints *(In Development)*
- **Triathlon Training Integration**: Swim, bike, run, strength, and recovery components *(In Development)*
- **Readiness-Based Adaptation**: Multi-factor readiness scoring using HRV, sleep, and recovery metrics *(In Development)*
- **Comprehensive Data Integration**: Apple Health, Google Sheets, automated data flow *(Partially Implemented)*
- **Intelligent Planning**: Progressive overload, VO₂ max development, and endurance building *(Planned)*
- **PT Integration**: Seamless incorporation of physical therapy mobility and strength work *(Planned)*
- **Adaptive Intelligence**: Learning from user feedback and individual patterns *(Planned)*

### Current API Features (Implemented)
- **Strength Training**: Log individual sets with exercise, weight, and reps
- **Endurance Workouts**: Track runs, bikes, swims with duration and distance
- **Comprehensive Analytics**: Weekly trends for all workout types
- **Google Sheets Integration**: Automatic data storage and retrieval
- **ChatGPT Actions**: Seamless integration for AI-powered fitness assistance
- **Vercel Deployment**: Serverless backend with automatic scaling

### Advanced Features (Partially Implemented)
- **Apple Health Kit Integration**: Basic data ingestion from Apple Health to Google Sheets
- **Training Load Calculation**: Based on workout intensity and volume *(Planned)*
- **Advanced Analytics**: Performance insights, readiness trend analysis, PT progress tracking *(Planned)*

### Future Features (In Development)
- **Eight Sleep Integration**: Advanced sleep analytics
- **MyFitnessPal Integration**: Nutrition tracking
- **Google Calendar Integration**: Schedule optimization

## API Endpoints

### Strength Training
- `POST /api/strength` - Log a strength training set
- `GET /api/trends` - Get weekly workout trends

### Endurance Workouts
- `POST /api/workout` - Log endurance workouts (run, bike, swim)
- `GET /api/run-trends` - Get weekly running trends
- `GET /api/cycle-trends` - Get weekly cycling trends
- `GET /api/swim-trends` - Get weekly swimming trends

### Debug & Development
- `GET /api/debug-workouts` - Inspect workout data from Google Sheets

## Data Flow Architecture

```
Apple Health → HealthFit → Google Drive → Google Apps Script → Google Sheets
     ↓
ChatGPT Actions ← Vercel API ← Google Sheets ← Analytics Engine
```

## Authentication

All endpoints require API key authentication via the `x-api-key` header. The API key is configured via the `FITNESS_AGENT_API_KEY` environment variable.

## Environment Variables

Required environment variables for Vercel deployment:

```bash
FITNESS_AGENT_API_KEY=your-api-key
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=your-service-account-json
```

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your credentials (see `.env.example`)
4. Run locally:
   ```bash
   npm run dev
   ```

## Deployment

The project is automatically deployed to Vercel on every push to the main branch:

1. **Stable Domain**: `https://gpt-proxy-danlevitt.vercel.app`
2. **Automatic Updates**: Custom domain always points to latest deployment
3. **ChatGPT Actions**: Schema automatically stays in sync

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── strength.js        # Strength training endpoint
│   ├── workout.js         # Endurance workout endpoint
│   ├── run-trends.js      # Running analytics
│   ├── cycle-trends.js    # Cycling analytics
│   ├── swim-trends.js     # Swimming analytics
│   └── _validate-api-key.js # Authentication middleware
├── src/
│   ├── analytics/         # Trend analysis and readiness scoring
│   ├── integrations/      # Google Sheets integration
│   └── data/             # Data management
├── google-apps-script/    # Apple Health Kit integration
│   └── health-auto-export-processor.js # Automated data flow
├── docs/                  # GitHub Pages documentation
│   └── openapi.yaml      # OpenAPI schema
├── openapi.yaml          # Main OpenAPI schema
└── vercel.json           # Vercel configuration
```

## Apple Health Kit Integration

The system includes basic Apple Health Kit integration:

- **HealthFit Export**: Automatic CSV/FIT file export to Google Drive
- **Google Apps Script**: Processes health data and organizes into Google Sheets
- **Automated Workflow**: HealthFit → Google Drive → Google Sheets
- **Data Categories**: Workouts, sleep, readiness metrics, health data
- **Real-time Sync**: Continuous data flow from Apple Health

## Planned Features

### Readiness Scoring System (In Development)
Advanced readiness scoring using multiple factors:

- **HRV Analysis**: 30-day baseline calculation with logistic transformation *(Planned)*
- **Sleep Quality**: Duration, efficiency, architecture (REM/Deep/Core) *(Planned)*
- **Recovery Metrics**: Resting heart rate, sleep patterns *(Planned)*
- **Subjective Input**: Morning feeling scores (1-10 scale) *(Planned)*
- **Trend Analysis**: Progress tracking and optimization *(Planned)*

### Training Load Calculation (Planned)
- **Intensity Scoring**: Based on workout type and effort level
- **Volume Tracking**: Weekly and monthly load accumulation
- **Recovery Balance**: Ensuring adequate rest between sessions
- **Progressive Overload**: Tracking improvements over time

## ChatGPT Actions Integration

The API is designed for seamless integration with ChatGPT Actions:

1. **Stable Schema**: Uses custom domain for automatic updates
2. **Comprehensive Actions**: Log workouts, get trends, analyze performance
3. **Natural Language**: AI can understand and execute fitness tasks
4. **Real-time Data**: Direct access to Google Sheets data

## Testing

Test endpoints with curl:

```bash
# Test run trends (replace with your actual API key)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://gpt-proxy-danlevitt.vercel.app/api/run-trends?x-vercel-protection-bypass=1CQBplG678yMDnEwGaTSEojJb2h1uUMm"

# Log a strength set
curl -X POST -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"exercise":"Bench Press","weight":185,"reps":8}' \
  "https://gpt-proxy-danlevitt.vercel.app/api/strength?x-vercel-protection-bypass=1CQBplG678yMDnEwGaTSEojJb2h1uUMm"
```

## License

MIT 
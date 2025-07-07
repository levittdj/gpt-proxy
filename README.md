# Personal Fitness Agent & Physical Therapy-Informed Trainer

An AI-powered personal fitness agent designed specifically for athletes recovering from ACL reconstruction, with comprehensive training plan management, readiness scoring, and multi-platform data integration.

## Features

- **ACL Recovery-Focused Training**: Specialized training plans respecting orthopedic constraints
- **Triathlon Training Integration**: Swim, bike, run, strength, and recovery components
- **Readiness-Based Adaptation**: Multi-factor readiness scoring using HRV, sleep, and recovery metrics
- **Comprehensive Data Integration**: Apple Health, Eight Sleep, MyFitnessPal, Google Calendar, Google Sheets
- **Intelligent Planning**: Progressive overload, VO₂ max development, and endurance building
- **PT Integration**: Seamless incorporation of physical therapy mobility and strength work
- **Adaptive Intelligence**: Learning from user feedback and individual patterns

## Prerequisites

- Node.js 18.0.0 or higher
- API credentials for:
  - OpenAI API
  - Apple HealthKit
  - Eight Sleep API
  - MyFitnessPal API
  - Google Calendar API
  - Google Sheets API

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API credentials (see `.env.example`)
4. Run the application:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── agent/           # Main chatbot interface
├── integrations/    # API integrations
├── analytics/       # Readiness scoring and analytics
├── planning/        # Training plan generation
├── data/           # Data management and synchronization
├── utils/          # Utility functions
└── config/         # Configuration management
```

## Development

- Run tests: `npm test`
- Development mode: `npm run dev`
- Watch tests: `npm run test:watch`

## License

MIT 
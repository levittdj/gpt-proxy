const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration management system for all API integrations
 * Validates required environment variables and provides centralized access
 */
class IntegrationConfig {
  constructor() {
    this.validateRequiredConfig();
  }

  /**
   * Validate that all required environment variables are present
   */
  validateRequiredConfig() {
    // For the current MVP, only Google Sheets access is required. Additional
    // integrations (OpenAI, Eight Sleep, MyFitnessPal, etc.) can be configured
    // later without blocking the application from starting.
    const requiredVars = [
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'GOOGLE_SERVICE_ACCOUNT_KEY_FILE'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * OpenAI API configuration
   */
  get openai() {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
    };
  }

  /**
   * Eight Sleep API configuration
   */
  get eightSleep() {
    return {
      apiKey: process.env.EIGHT_SLEEP_API_KEY,
      userId: process.env.EIGHT_SLEEP_USER_ID,
      baseUrl: 'https://client-api.8slp.net/v1'
    };
  }

  /**
   * MyFitnessPal API configuration
   */
  get myFitnessPal() {
    return {
      apiKey: process.env.MYFITNESSPAL_API_KEY,
      username: process.env.MYFITNESSPAL_USERNAME,
      baseUrl: 'https://api.myfitnesspal.com/v2'
    };
  }

  /**
   * Google APIs configuration
   */
  get google() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    };
  }

  /**
   * Google Calendar configuration
   */
  get googleCalendar() {
    return {
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeZone: process.env.TIMEZONE || 'America/New_York'
    };
  }

  /**
   * Google Sheets configuration
   */
  get googleSheets() {
    return {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      ranges: {
        workouts: 'Workouts!A:Z',
        readiness: 'Readiness!A:Z',
        trainingPlans: 'TrainingPlans!A:Z',
        metrics: 'Metrics!A:Z',
        ptProgress: 'PTProgress!A:Z',
        analytics: 'Analytics!A:Z'
      }
    };
  }

  /**
   * Health Auto Export configuration
   */
  get healthAutoExport() {
    return {
      dataPath: process.env.HEALTH_AUTO_EXPORT_PATH || './data/health-export',
      supportedFormats: ['csv', 'json'],
      updateFrequency: process.env.HEALTH_UPDATE_FREQUENCY || 'daily'
    };
  }

  /**
   * Application configuration
   */
  get app() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      timezone: process.env.TIMEZONE || 'America/New_York'
    };
  }

  /**
   * Security configuration
   */
  get security() {
    return {
      jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
      sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    };
  }

  /**
   * Get all configuration as a single object
   */
  getAll() {
    return {
      openai: this.openai,
      eightSleep: this.eightSleep,
      myFitnessPal: this.myFitnessPal,
      google: this.google,
      googleCalendar: this.googleCalendar,
      googleSheets: this.googleSheets,
      healthAutoExport: this.healthAutoExport,
      app: this.app,
      security: this.security
    };
  }

  /**
   * Validate configuration for a specific integration
   */
  validateIntegration(integrationName) {
    const integrations = {
      openai: () => this.openai.apiKey,
      eightSleep: () => this.eightSleep.apiKey && this.eightSleep.userId,
      myFitnessPal: () => this.myFitnessPal.apiKey && this.myFitnessPal.username,
      google: () => this.google.clientId && this.google.clientSecret,
      googleSheets: () => this.googleSheets.spreadsheetId
    };

    if (!integrations[integrationName]) {
      throw new Error(`Unknown integration: ${integrationName}`);
    }

    return integrations[integrationName]();
  }

  /**
   * Check if all integrations are properly configured
   */
  isFullyConfigured() {
    try {
      this.validateRequiredConfig();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const config = new IntegrationConfig();

module.exports = config; 
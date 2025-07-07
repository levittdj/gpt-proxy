const config = require('./integrations');

// Mock environment variables for testing
const originalEnv = process.env;

describe('IntegrationConfig', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    
    // Set up minimal required environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.EIGHT_SLEEP_API_KEY = 'test-eight-sleep-key';
    process.env.EIGHT_SLEEP_USER_ID = 'test-user-id';
    process.env.MYFITNESSPAL_API_KEY = 'test-mfp-key';
    process.env.MYFITNESSPAL_USERNAME = 'test-username';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id';
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    test('should validate required environment variables', () => {
      expect(() => {
        require('./integrations');
      }).not.toThrow();
    });

    test('should throw error when required variables are missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => {
        require('./integrations');
      }).toThrow('Missing required environment variables: OPENAI_API_KEY');
    });

    test('should throw error when multiple required variables are missing', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.EIGHT_SLEEP_API_KEY;
      
      expect(() => {
        require('./integrations');
      }).toThrow('Missing required environment variables: OPENAI_API_KEY, EIGHT_SLEEP_API_KEY');
    });
  });

  describe('OpenAI Configuration', () => {
    test('should return OpenAI configuration with defaults', () => {
      const openaiConfig = config.openai;
      
      expect(openaiConfig.apiKey).toBe('test-openai-key');
      expect(openaiConfig.model).toBe('gpt-4');
      expect(openaiConfig.maxTokens).toBe(2000);
      expect(openaiConfig.temperature).toBe(0.7);
    });

    test('should use custom OpenAI configuration when provided', () => {
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      process.env.OPENAI_MAX_TOKENS = '1000';
      process.env.OPENAI_TEMPERATURE = '0.5';
      
      const openaiConfig = config.openai;
      
      expect(openaiConfig.model).toBe('gpt-3.5-turbo');
      expect(openaiConfig.maxTokens).toBe(1000);
      expect(openaiConfig.temperature).toBe(0.5);
    });
  });

  describe('Eight Sleep Configuration', () => {
    test('should return Eight Sleep configuration', () => {
      const eightSleepConfig = config.eightSleep;
      
      expect(eightSleepConfig.apiKey).toBe('test-eight-sleep-key');
      expect(eightSleepConfig.userId).toBe('test-user-id');
      expect(eightSleepConfig.baseUrl).toBe('https://client-api.8slp.net/v1');
    });
  });

  describe('MyFitnessPal Configuration', () => {
    test('should return MyFitnessPal configuration', () => {
      const mfpConfig = config.myFitnessPal;
      
      expect(mfpConfig.apiKey).toBe('test-mfp-key');
      expect(mfpConfig.username).toBe('test-username');
      expect(mfpConfig.baseUrl).toBe('https://api.myfitnesspal.com/v2');
    });
  });

  describe('Google Configuration', () => {
    test('should return Google configuration with defaults', () => {
      const googleConfig = config.google;
      
      expect(googleConfig.clientId).toBe('test-google-client-id');
      expect(googleConfig.clientSecret).toBe('test-google-client-secret');
      expect(googleConfig.redirectUri).toBe('http://localhost:3000/auth/google/callback');
      expect(googleConfig.scopes).toContain('https://www.googleapis.com/auth/calendar');
      expect(googleConfig.scopes).toContain('https://www.googleapis.com/auth/spreadsheets');
    });

    test('should use custom Google redirect URI when provided', () => {
      process.env.GOOGLE_REDIRECT_URI = 'https://myapp.com/auth/google/callback';
      
      const googleConfig = config.google;
      expect(googleConfig.redirectUri).toBe('https://myapp.com/auth/google/callback');
    });
  });

  describe('Google Calendar Configuration', () => {
    test('should return Google Calendar configuration with defaults', () => {
      const calendarConfig = config.googleCalendar;
      
      expect(calendarConfig.calendarId).toBe('primary');
      expect(calendarConfig.timeZone).toBe('America/New_York');
    });

    test('should use custom calendar configuration when provided', () => {
      process.env.GOOGLE_CALENDAR_ID = 'custom-calendar-id';
      process.env.TIMEZONE = 'Europe/London';
      
      const calendarConfig = config.googleCalendar;
      expect(calendarConfig.calendarId).toBe('custom-calendar-id');
      expect(calendarConfig.timeZone).toBe('Europe/London');
    });
  });

  describe('Google Sheets Configuration', () => {
    test('should return Google Sheets configuration', () => {
      const sheetsConfig = config.googleSheets;
      
      expect(sheetsConfig.spreadsheetId).toBe('test-spreadsheet-id');
      expect(sheetsConfig.ranges.workouts).toBe('Workouts!A:Z');
      expect(sheetsConfig.ranges.readiness).toBe('Readiness!A:Z');
      expect(sheetsConfig.ranges.trainingPlans).toBe('TrainingPlans!A:Z');
      expect(sheetsConfig.ranges.metrics).toBe('Metrics!A:Z');
      expect(sheetsConfig.ranges.ptProgress).toBe('PTProgress!A:Z');
    });
  });

  describe('Health Auto Export Configuration', () => {
    test('should return Health Auto Export configuration with defaults', () => {
      const healthConfig = config.healthAutoExport;
      
      expect(healthConfig.dataPath).toBe('./data/health-export');
      expect(healthConfig.supportedFormats).toEqual(['csv', 'json']);
      expect(healthConfig.updateFrequency).toBe('daily');
    });

    test('should use custom Health Auto Export configuration when provided', () => {
      process.env.HEALTH_AUTO_EXPORT_PATH = '/custom/path/to/health/data';
      process.env.HEALTH_UPDATE_FREQUENCY = 'weekly';
      
      const healthConfig = config.healthAutoExport;
      expect(healthConfig.dataPath).toBe('/custom/path/to/health/data');
      expect(healthConfig.updateFrequency).toBe('weekly');
    });
  });

  describe('Application Configuration', () => {
    test('should return application configuration with defaults', () => {
      const appConfig = config.app;
      
      expect(appConfig.port).toBe(3000);
      expect(appConfig.nodeEnv).toBe('development');
      expect(appConfig.logLevel).toBe('info');
      expect(appConfig.timezone).toBe('America/New_York');
    });

    test('should use custom application configuration when provided', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'debug';
      
      const appConfig = config.app;
      expect(appConfig.port).toBe(8080);
      expect(appConfig.nodeEnv).toBe('production');
      expect(appConfig.logLevel).toBe('debug');
    });
  });

  describe('Security Configuration', () => {
    test('should return security configuration with defaults', () => {
      const securityConfig = config.security;
      
      expect(securityConfig.jwtSecret).toBe('your-jwt-secret-change-in-production');
      expect(securityConfig.sessionSecret).toBe('your-session-secret-change-in-production');
      expect(securityConfig.corsOrigin).toBe('http://localhost:3000');
    });

    test('should use custom security configuration when provided', () => {
      process.env.JWT_SECRET = 'custom-jwt-secret';
      process.env.SESSION_SECRET = 'custom-session-secret';
      process.env.CORS_ORIGIN = 'https://myapp.com';
      
      const securityConfig = config.security;
      expect(securityConfig.jwtSecret).toBe('custom-jwt-secret');
      expect(securityConfig.sessionSecret).toBe('custom-session-secret');
      expect(securityConfig.corsOrigin).toBe('https://myapp.com');
    });
  });

  describe('Integration Validation', () => {
    test('should validate OpenAI integration', () => {
      expect(config.validateIntegration('openai')).toBe('test-openai-key');
    });

    test('should validate Eight Sleep integration', () => {
      expect(config.validateIntegration('eightSleep')).toBeTruthy();
    });

    test('should validate MyFitnessPal integration', () => {
      expect(config.validateIntegration('myFitnessPal')).toBeTruthy();
    });

    test('should validate Google integration', () => {
      expect(config.validateIntegration('google')).toBeTruthy();
    });

    test('should validate Google Sheets integration', () => {
      expect(config.validateIntegration('googleSheets')).toBeTruthy();
    });

    test('should throw error for unknown integration', () => {
      expect(() => {
        config.validateIntegration('unknown');
      }).toThrow('Unknown integration: unknown');
    });
  });

  describe('Configuration Status', () => {
    test('should return true when fully configured', () => {
      expect(config.isFullyConfigured()).toBe(true);
    });

    test('should return false when not fully configured', () => {
      delete process.env.OPENAI_API_KEY;
      
      // Need to reload the module to test the new configuration
      jest.resetModules();
      const newConfig = require('./integrations');
      
      expect(newConfig.isFullyConfigured()).toBe(false);
    });
  });

  describe('Get All Configuration', () => {
    test('should return all configuration sections', () => {
      const allConfig = config.getAll();
      
      expect(allConfig).toHaveProperty('openai');
      expect(allConfig).toHaveProperty('eightSleep');
      expect(allConfig).toHaveProperty('myFitnessPal');
      expect(allConfig).toHaveProperty('google');
      expect(allConfig).toHaveProperty('googleCalendar');
      expect(allConfig).toHaveProperty('googleSheets');
      expect(allConfig).toHaveProperty('healthAutoExport');
      expect(allConfig).toHaveProperty('app');
      expect(allConfig).toHaveProperty('security');
    });
  });
}); 
const GoogleSheetsIntegration = require('./google-sheets');
const { google } = require('googleapis');

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    sheets: jest.fn()
  }
}));

// Mock config
jest.mock('../config/integrations', () => ({
  googleSheets: {
    spreadsheetId: 'test-spreadsheet-id',
    ranges: {
      workouts: 'Workouts!A:Z',
      readiness: 'Readiness!A:Z',
      trainingPlans: 'TrainingPlans!A:Z',
      metrics: 'Metrics!A:Z',
      ptProgress: 'PTProgress!A:Z'
    }
  }
}));

describe('GoogleSheetsIntegration', () => {
  let sheetsIntegration;
  let mockSheets;
  let mockAuth;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock auth
    mockAuth = {
      getClient: jest.fn()
    };
    google.auth.GoogleAuth.mockImplementation(() => mockAuth);

    // Setup mock sheets
    mockSheets = {
      spreadsheets: {
        get: jest.fn(),
        batchUpdate: jest.fn(),
        values: {
          append: jest.fn(),
          get: jest.fn(),
          update: jest.fn(),
          clear: jest.fn()
        }
      }
    };
    google.sheets.mockReturnValue(mockSheets);

    sheetsIntegration = new GoogleSheetsIntegration();
  });

  describe('Constructor', () => {
    test('should initialize with config values', () => {
      expect(sheetsIntegration.spreadsheetId).toBe('test-spreadsheet-id');
      expect(sheetsIntegration.ranges).toEqual({
        workouts: 'Workouts!A:Z',
        readiness: 'Readiness!A:Z',
        trainingPlans: 'TrainingPlans!A:Z',
        metrics: 'Metrics!A:Z',
        ptProgress: 'PTProgress!A:Z'
      });
    });
  });

  describe('initialize', () => {
    test('should initialize Google Sheets API successfully', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { properties: { title: 'Test Spreadsheet' } }
      });

      await sheetsIntegration.initialize();

      expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      expect(google.sheets).toHaveBeenCalledWith({
        version: 'v4',
        auth: mockAuth
      });
      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id'
      });
    });

    test('should throw error when initialization fails', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('Auth failed'));

      await expect(sheetsIntegration.initialize()).rejects.toThrow(
        'Failed to initialize Google Sheets API: Failed to connect to Google Sheets: Auth failed'
      );
    });
  });

  describe('testConnection', () => {
    test('should test connection successfully', async () => {
      const mockResponse = { data: { properties: { title: 'Test' } } };
      mockSheets.spreadsheets.get.mockResolvedValue(mockResponse);

      const result = await sheetsIntegration.testConnection();

      expect(result).toEqual(mockResponse.data);
      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id'
      });
    });

    test('should throw error when connection fails', async () => {
      mockSheets.spreadsheets.get.mockRejectedValue(new Error('Connection failed'));

      await expect(sheetsIntegration.testConnection()).rejects.toThrow(
        'Failed to connect to Google Sheets: Connection failed'
      );
    });
  });

  describe('initializeSpreadsheet', () => {
    test('should initialize spreadsheet structure', async () => {
      // Mock that sheets don't exist initially
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await sheetsIntegration.initializeSpreadsheet();

      expect(mockSheets.spreadsheets.get).toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalled();
    });
  });

  describe('createSheetIfNotExists', () => {
    test('should create new sheet when it does not exist', async () => {
      // Mock that sheet doesn't exist
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [] }
      });

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await sheetsIntegration.createSheetIfNotExists('TestSheet', ['Header1', 'Header2']);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'TestSheet'
                }
              }
            }
          ]
        }
      });
    });

    test('should not create sheet when it already exists', async () => {
      // Mock that sheet exists
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'TestSheet' } }
          ]
        }
      });

      await sheetsIntegration.createSheetIfNotExists('TestSheet', ['Header1', 'Header2']);

      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Headers', () => {
    test('should return correct workout headers', () => {
      const headers = sheetsIntegration.getWorkoutHeaders();
      expect(headers).toContain('ID');
      expect(headers).toContain('Date');
      expect(headers).toContain('Type');
      expect(headers).toContain('Duration');
      expect(headers).toContain('Distance');
      expect(headers).toContain('Calories');
    });

    test('should return correct readiness headers', () => {
      const headers = sheetsIntegration.getReadinessHeaders();
      expect(headers).toContain('ID');
      expect(headers).toContain('Date');
      expect(headers).toContain('Type');
      expect(headers).toContain('Value');
      expect(headers).toContain('ReadinessScore');
      expect(headers).toContain('HRV');
    });

    test('should return correct training plan headers', () => {
      const headers = sheetsIntegration.getTrainingPlanHeaders();
      expect(headers).toContain('ID');
      expect(headers).toContain('WeekStart');
      expect(headers).toContain('WeekEnd');
      expect(headers).toContain('SwimSessions');
      expect(headers).toContain('BikeSessions');
      expect(headers).toContain('RunSessions');
    });
  });

  describe('appendData', () => {
    test('should append data successfully', async () => {
      const mockResponse = { data: { updatedRows: 1 } };
      mockSheets.spreadsheets.values.append.mockResolvedValue(mockResponse);

      const data = [['test', 'data']];
      const result = await sheetsIntegration.appendData('TestSheet', data);

      expect(result).toEqual(mockResponse.data);
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'TestSheet!A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: data
        }
      });
    });

    test('should throw error when append fails', async () => {
      mockSheets.spreadsheets.values.append.mockRejectedValue(new Error('Append failed'));

      await expect(sheetsIntegration.appendData('TestSheet', [['test']])).rejects.toThrow(
        'Failed to append data to TestSheet: Append failed'
      );
    });
  });

  describe('readData', () => {
    test('should read data successfully', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Date', 'Type'],
            ['1', '2024-01-01', 'Running'],
            ['2', '2024-01-02', 'Cycling']
          ]
        }
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockData);

      const result = await sheetsIntegration.readData('TestSheet');

      expect(result).toEqual(mockData.data.values);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'TestSheet!A:Z'
      });
    });

    test('should return empty array when no data', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: null }
      });

      const result = await sheetsIntegration.readData('TestSheet');

      expect(result).toEqual([]);
    });
  });

  describe('updateData', () => {
    test('should update data successfully', async () => {
      const mockResponse = { data: { updatedCells: 1 } };
      mockSheets.spreadsheets.values.update.mockResolvedValue(mockResponse);

      const values = [['updated', 'data']];
      const result = await sheetsIntegration.updateData('TestSheet', 'A1:B2', values);

      expect(result).toEqual(mockResponse.data);
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'TestSheet!A1:B2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });
    });
  });

  describe('storeWorkout', () => {
    test('should store workout data correctly', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({ data: {} });

      const workout = {
        id: 'workout-1',
        date: new Date('2024-01-01'),
        type: 'running',
        duration: '1800',
        distance: '5000',
        calories: '300',
        source: 'Health Auto Export',
        sets: '3',
        weight: '50',
        reps: '10',
        notes: 'Great workout'
      };

      await sheetsIntegration.storeWorkout(workout);

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Workouts!A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            'workout-1',
            '2024-01-01T00:00:00.000Z',
            'running',
            '1800',
            '5000',
            '300',
            'Health Auto Export',
            '3',
            '50',
            '10',
            'Great workout',
            expect.any(String), // CreatedAt
            expect.any(String)  // UpdatedAt
          ]]
        }
      });
    });
  });

  describe('storeReadiness', () => {
    test('should store readiness data correctly', async () => {
      mockSheets.spreadsheets.values.append.mockResolvedValue({ data: {} });

      const readiness = {
        id: 'readiness-1',
        date: new Date('2024-01-01'),
        type: 'hrv',
        value: '45',
        unit: 'ms',
        source: 'Health Auto Export',
        readinessScore: '85',
        hrv: '45',
        restingHeartRate: '60',
        sleepQuality: 'good',
        sleepDuration: '8',
        trainingLoad: 'medium',
        fatigue: 'low',
        notes: 'Feeling good'
      };

      await sheetsIntegration.storeReadiness(readiness);

      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Readiness!A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[
            'readiness-1',
            '2024-01-01T00:00:00.000Z',
            'hrv',
            '45',
            'ms',
            'Health Auto Export',
            '85',
            '45',
            '60',
            'good',
            '8',
            'medium',
            'low',
            'Feeling good',
            expect.any(String) // CreatedAt
          ]]
        }
      });
    });
  });

  describe('getWorkouts', () => {
    test('should filter workouts by date range', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Date', 'Type', 'Duration'],
            ['1', '2024-01-01', 'Running', '1800'],
            ['2', '2024-01-05', 'Cycling', '3600'],
            ['3', '2024-01-10', 'Swimming', '1200']
          ]
        }
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockData);

      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-08');
      const result = await sheetsIntegration.getWorkouts(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Cycling');
    });
  });

  describe('getReadiness', () => {
    test('should filter readiness data by date range', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Date', 'Type', 'Value'],
            ['1', '2024-01-01', 'HRV', '45'],
            ['2', '2024-01-05', 'HRV', '50'],
            ['3', '2024-01-10', 'HRV', '42']
          ]
        }
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockData);

      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-08');
      const result = await sheetsIntegration.getReadiness(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('HRV');
      expect(result[0].value).toBe('50');
    });
  });

  describe('getLatestTrainingPlan', () => {
    test('should return latest training plan', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'WeekStart', 'WeekEnd', 'PlanType'],
            ['1', '2024-01-01', '2024-01-07', 'Recovery'],
            ['2', '2024-01-08', '2024-01-14', 'Build']
          ]
        }
      };
      mockSheets.spreadsheets.values.get.mockResolvedValue(mockData);

      const result = await sheetsIntegration.getLatestTrainingPlan();

      expect(result.plantype).toBe('Build');
      expect(result.weekstart).toBe('2024-01-08');
    });

    test('should return null when no training plans exist', async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['ID', 'WeekStart', 'WeekEnd', 'PlanType']] }
      });

      const result = await sheetsIntegration.getLatestTrainingPlan();

      expect(result).toBeNull();
    });
  });

  describe('createDashboardData', () => {
    test('should create dashboard data correctly', async () => {
      // Mock workout data
      const workoutData = {
        data: {
          values: [
            ['ID', 'Date', 'Type', 'Duration', 'Distance'],
            ['1', '2024-01-01', 'Running', '1800', '5000'],
            ['2', '2024-01-02', 'Cycling', '3600', '20000']
          ]
        }
      };

      // Mock readiness data
      const readinessData = {
        data: {
          values: [
            ['ID', 'Date', 'Type', 'Value', 'ReadinessScore'],
            ['1', '2024-01-01', 'HRV', '45', '85'],
            ['2', '2024-01-02', 'HRV', '50', '90']
          ]
        }
      };

      // Mock PT progress data
      const ptData = {
        data: {
          values: [
            ['ID', 'Date', 'Exercise', 'Milestone'],
            ['1', '2024-01-01', 'Squats', 'Increased weight'],
            ['2', '2024-01-02', 'Lunges', '']
          ]
        }
      };

      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce(workoutData)
        .mockResolvedValueOnce(readinessData)
        .mockResolvedValueOnce(ptData);

      const result = await sheetsIntegration.createDashboardData();

      expect(result.period).toBe('7 days');
      expect(result.workouts.total).toBe(2);
      expect(result.readiness.total).toBe(2);
      expect(result.readiness.averageScore).toBe(87.5);
      expect(result.ptProgress.total).toBe(2);
      expect(result.ptProgress.milestones).toBe(1);
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('groupBy', () => {
    test('should group data by field correctly', () => {
      const data = [
        { type: 'Running', value: 1 },
        { type: 'Cycling', value: 2 },
        { type: 'Running', value: 3 }
      ];

      const result = sheetsIntegration.groupBy(data, 'type');

      expect(result.Running).toHaveLength(2);
      expect(result.Cycling).toHaveLength(1);
      expect(result.Unknown).toBeUndefined();
    });

    test('should handle missing field values', () => {
      const data = [
        { type: 'Running', value: 1 },
        { value: 2 }, // Missing type
        { type: 'Cycling', value: 3 }
      ];

      const result = sheetsIntegration.groupBy(data, 'type');

      expect(result.Running).toHaveLength(1);
      expect(result.Cycling).toHaveLength(1);
      expect(result.Unknown).toHaveLength(1);
    });
  });

  describe('clearSheet', () => {
    test('should clear sheet and re-add headers', async () => {
      mockSheets.spreadsheets.values.clear.mockResolvedValue({});
      mockSheets.spreadsheets.values.append.mockResolvedValue({});

      await sheetsIntegration.clearSheet('Workouts');

      expect(mockSheets.spreadsheets.values.clear).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        range: 'Workouts!A:Z'
      });
      expect(mockSheets.spreadsheets.values.append).toHaveBeenCalled();
    });
  });

  describe('getHeadersForSheet', () => {
    test('should return correct headers for known sheets', () => {
      expect(sheetsIntegration.getHeadersForSheet('Workouts')).toEqual(
        sheetsIntegration.getWorkoutHeaders()
      );
      expect(sheetsIntegration.getHeadersForSheet('Readiness')).toEqual(
        sheetsIntegration.getReadinessHeaders()
      );
      expect(sheetsIntegration.getHeadersForSheet('TrainingPlans')).toEqual(
        sheetsIntegration.getTrainingPlanHeaders()
      );
    });

    test('should return null for unknown sheets', () => {
      expect(sheetsIntegration.getHeadersForSheet('UnknownSheet')).toBeNull();
    });
  });
}); 
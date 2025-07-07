const DataManager = require('./data-manager');
const HealthAutoExportParser = require('../integrations/health-auto-export');
const GoogleSheetsIntegration = require('../integrations/google-sheets');

// Mock dependencies
jest.mock('../integrations/health-auto-export');
jest.mock('../integrations/google-sheets');

describe('DataManager', () => {
  let dataManager;
  let mockHealthParser;
  let mockSheetsIntegration;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockHealthParser = {
      initialize: jest.fn(),
      parseData: jest.fn()
    };
    HealthAutoExportParser.mockImplementation(() => mockHealthParser);

    mockSheetsIntegration = {
      initialize: jest.fn(),
      initializeSpreadsheet: jest.fn(),
      storeWorkout: jest.fn(),
      storeReadiness: jest.fn(),
      storeAnalytics: jest.fn(),
      storeTrainingPlan: jest.fn(),
      storePTProgress: jest.fn(),
      getWorkouts: jest.fn(),
      getReadiness: jest.fn(),
      getPTProgress: jest.fn(),
      getAnalytics: jest.fn(),
      getLatestTrainingPlan: jest.fn()
    };
    GoogleSheetsIntegration.mockImplementation(() => mockSheetsIntegration);

    dataManager = new DataManager();
  });

  describe('Constructor', () => {
    test('should create instances of integrations', () => {
      expect(HealthAutoExportParser).toHaveBeenCalled();
      expect(GoogleSheetsIntegration).toHaveBeenCalled();
      expect(dataManager.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    test('should initialize all integrations successfully', async () => {
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();

      await dataManager.initialize();

      expect(mockHealthParser.initialize).toHaveBeenCalled();
      expect(mockSheetsIntegration.initialize).toHaveBeenCalled();
      expect(mockSheetsIntegration.initializeSpreadsheet).toHaveBeenCalled();
      expect(dataManager.initialized).toBe(true);
    });

    test('should throw error when initialization fails', async () => {
      mockHealthParser.initialize.mockRejectedValue(new Error('Health parser failed'));

      await expect(dataManager.initialize()).rejects.toThrow(
        'Failed to initialize Data Manager: Health parser failed'
      );
      expect(dataManager.initialized).toBe(false);
    });
  });

  describe('syncHealthData', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should sync health data successfully', async () => {
      const mockHealthData = {
        workouts: [
          { id: 'w1', date: new Date('2024-01-01'), type: 'running', duration: '1800' },
          { id: 'w2', date: new Date('2024-01-02'), type: 'cycling', duration: '3600' }
        ],
        readiness: [
          { id: 'r1', date: new Date('2024-01-01'), type: 'hrv', value: '45' },
          { id: 'r2', date: new Date('2024-01-02'), type: 'hrv', value: '50' }
        ],
        metrics: [
          { id: 'm1', date: new Date('2024-01-01'), type: 'steps', value: '8000' },
          { id: 'm2', date: new Date('2024-01-02'), type: 'steps', value: '10000' }
        ]
      };

      mockHealthParser.parseData.mockResolvedValue(mockHealthData);
      mockSheetsIntegration.storeWorkout.mockResolvedValue();
      mockSheetsIntegration.storeReadiness.mockResolvedValue();
      mockSheetsIntegration.storeAnalytics.mockResolvedValue();

      const result = await dataManager.syncHealthData();

      expect(mockHealthParser.parseData).toHaveBeenCalled();
      expect(mockSheetsIntegration.storeWorkout).toHaveBeenCalledTimes(2);
      expect(mockSheetsIntegration.storeReadiness).toHaveBeenCalledTimes(2);
      expect(mockSheetsIntegration.storeAnalytics).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        workouts: 2,
        readiness: 2,
        metrics: 2,
        errors: 0
      });
    });

    test('should handle sync errors gracefully', async () => {
      const mockHealthData = {
        workouts: [
          { id: 'w1', date: new Date('2024-01-01'), type: 'running', duration: '1800' }
        ],
        readiness: [],
        metrics: []
      };

      mockHealthParser.parseData.mockResolvedValue(mockHealthData);
      mockSheetsIntegration.storeWorkout.mockRejectedValue(new Error('Storage failed'));

      const result = await dataManager.syncHealthData();

      expect(result.errors).toBe(1);
      expect(result.workouts).toBe(0);
    });

    test('should throw error when not initialized', async () => {
      dataManager.initialized = false;

      await expect(dataManager.syncHealthData()).rejects.toThrow(
        'Data Manager not initialized. Call initialize() first.'
      );
    });
  });

  describe('getDashboardData', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should get dashboard data for 7 days', async () => {
      const mockWorkouts = [
        { id: 'w1', date: '2024-01-01', type: 'running', duration: '1800', distance: '5000' },
        { id: 'w2', date: '2024-01-02', type: 'cycling', duration: '3600', distance: '20000' }
      ];

      const mockReadiness = [
        { id: 'r1', date: '2024-01-01', type: 'hrv', value: '45', readinessscore: '85' },
        { id: 'r2', date: '2024-01-02', type: 'hrv', value: '50', readinessscore: '90' }
      ];

      const mockPTProgress = [
        { id: 'pt1', date: '2024-01-01', exercise: 'squats', milestone: 'Increased weight' },
        { id: 'pt2', date: '2024-01-02', exercise: 'lunges', milestone: '' }
      ];

      const mockAnalytics = [
        { id: 'a1', date: '2024-01-01', metric: 'steps', value: '8000' },
        { id: 'a2', date: '2024-01-02', metric: 'steps', value: '10000' }
      ];

      mockSheetsIntegration.getWorkouts.mockResolvedValue(mockWorkouts);
      mockSheetsIntegration.getReadiness.mockResolvedValue(mockReadiness);
      mockSheetsIntegration.getPTProgress.mockResolvedValue(mockPTProgress);
      mockSheetsIntegration.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await dataManager.getDashboardData('7 days');

      expect(result.period).toBe('7 days');
      expect(result.workouts.total).toBe(2);
      expect(result.workouts.totalDuration).toBe(5400);
      expect(result.workouts.totalDistance).toBe(25000);
      expect(result.readiness.total).toBe(2);
      expect(result.readiness.averageScore).toBe(87.5);
      expect(result.ptProgress.total).toBe(2);
      expect(result.ptProgress.milestones).toBe(1);
      expect(result.insights).toBeDefined();
    });

    test('should handle different periods', async () => {
      mockSheetsIntegration.getWorkouts.mockResolvedValue([]);
      mockSheetsIntegration.getReadiness.mockResolvedValue([]);
      mockSheetsIntegration.getPTProgress.mockResolvedValue([]);
      mockSheetsIntegration.getAnalytics.mockResolvedValue([]);

      await dataManager.getDashboardData('30 days');
      await dataManager.getDashboardData('90 days');

      expect(mockSheetsIntegration.getWorkouts).toHaveBeenCalledTimes(2);
    });
  });

  describe('storeTrainingPlan', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should store training plan successfully', async () => {
      const plan = {
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        planType: 'build',
        swimSessions: 2,
        bikeSessions: 3,
        runSessions: 2,
        strengthSessions: 2,
        ptSessions: 3,
        recoverySessions: 1
      };

      mockSheetsIntegration.storeTrainingPlan.mockResolvedValue();

      const result = await dataManager.storeTrainingPlan(plan);

      expect(mockSheetsIntegration.storeTrainingPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          ...plan
        })
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('storePTProgress', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should store PT progress successfully', async () => {
      const ptData = {
        date: new Date('2024-01-01'),
        exercise: 'squats',
        sets: '3',
        weight: '50',
        reps: '10',
        difficulty: 'medium',
        painLevel: 'low',
        notes: 'Feeling good'
      };

      mockSheetsIntegration.storePTProgress.mockResolvedValue();

      const result = await dataManager.storePTProgress(ptData);

      expect(mockSheetsIntegration.storePTProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          ...ptData
        })
      );
      expect(result.id).toBeDefined();
    });
  });

  describe('getTrainingRecommendations', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should generate recommendations with readiness data', async () => {
      const mockReadiness = [
        { id: 'r1', date: '2024-01-01', type: 'hrv', value: '45', readinessscore: '85' }
      ];

      const mockWorkouts = [
        { id: 'w1', date: '2024-01-01', type: 'running', duration: '1800', distance: '5000' }
      ];

      mockSheetsIntegration.getReadiness.mockResolvedValue(mockReadiness);
      mockSheetsIntegration.getWorkouts.mockResolvedValue(mockWorkouts);
      mockSheetsIntegration.getLatestTrainingPlan.mockResolvedValue(null);

      const result = await dataManager.getTrainingRecommendations();

      expect(result.readiness).toBeDefined();
      expect(result.trainingLoad).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle no readiness data', async () => {
      mockSheetsIntegration.getReadiness.mockResolvedValue([]);
      mockSheetsIntegration.getWorkouts.mockResolvedValue([]);
      mockSheetsIntegration.getLatestTrainingPlan.mockResolvedValue(null);

      const result = await dataManager.getTrainingRecommendations();

      expect(result.readiness).toBeNull();
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'general',
          message: expect.stringContaining('No readiness data available')
        })
      );
    });
  });

  describe('calculateInsights', () => {
    test('should calculate workout insights', () => {
      const workouts = [
        { duration: '7200' }, // 2 hours
        { duration: '3600' }  // 1 hour
      ];

      const insights = dataManager.calculateInsights(workouts, [], [], []);

      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'workout',
          message: expect.stringContaining('Average workout duration is over 1 hour')
        })
      );
    });

    test('should calculate readiness insights', () => {
      const readiness = [
        { readinessscore: '60' },
        { readinessscore: '65' }
      ];

      const insights = dataManager.calculateInsights([], readiness, [], []);

      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'readiness',
          message: expect.stringContaining('Average readiness score is low')
        })
      );
    });

    test('should calculate PT progress insights', () => {
      const ptProgress = [
        { date: '2024-01-01', exercise: 'squats' },
        { date: '2024-01-02', exercise: 'lunges' }
      ];

      const insights = dataManager.calculateInsights([], [], ptProgress, []);

      expect(insights).toContainEqual(
        expect.objectContaining({
          type: 'pt',
          message: expect.stringContaining('Limited PT progress in the last week')
        })
      );
    });
  });

  describe('calculateTrainingLoad', () => {
    test('should calculate low training load', () => {
      const workouts = [
        { duration: '1800', distance: '5000' } // 30 min, 5km
      ];

      const result = dataManager.calculateTrainingLoad(workouts);

      expect(result.load).toBe('low');
      expect(result.score).toBeGreaterThan(0);
    });

    test('should calculate high training load', () => {
      const workouts = [
        { duration: '7200', distance: '20000' }, // 2 hours, 20km
        { duration: '3600', distance: '10000' }  // 1 hour, 10km
      ];

      const result = dataManager.calculateTrainingLoad(workouts);

      expect(result.load).toBe('high');
      expect(result.score).toBeGreaterThan(50);
    });

    test('should handle empty workouts', () => {
      const result = dataManager.calculateTrainingLoad([]);

      expect(result.load).toBe('low');
      expect(result.score).toBe(0);
    });
  });

  describe('generateRecommendations', () => {
    test('should recommend recovery for low readiness', () => {
      const readiness = { readinessscore: '55' };
      const trainingLoad = { load: 'medium', score: 30 };

      const recommendations = dataManager.generateRecommendations(readiness, trainingLoad, null);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'recovery',
          message: expect.stringContaining('Low readiness score')
        })
      );
    });

    test('should recommend training for high readiness', () => {
      const readiness = { readinessscore: '90' };
      const trainingLoad = { load: 'low', score: 10 };

      const recommendations = dataManager.generateRecommendations(readiness, trainingLoad, null);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'training',
          message: expect.stringContaining('High readiness score')
        })
      );
    });

    test('should recommend recovery for high training load', () => {
      const readiness = { readinessscore: '75' };
      const trainingLoad = { load: 'high', score: 60 };

      const recommendations = dataManager.generateRecommendations(readiness, trainingLoad, null);

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'recovery',
          message: expect.stringContaining('High training load detected')
        })
      );
    });
  });

  describe('calculateTrends', () => {
    test('should calculate increasing trends', () => {
      const analytics = [
        { metric: 'steps', value: '8000' },
        { metric: 'steps', value: '10000' }
      ];

      const trends = dataManager.calculateTrends(analytics);

      expect(trends).toContainEqual(
        expect.objectContaining({
          metric: 'steps',
          trend: 'increasing'
        })
      );
    });

    test('should calculate decreasing trends', () => {
      const analytics = [
        { metric: 'steps', value: '10000' },
        { metric: 'steps', value: '8000' }
      ];

      const trends = dataManager.calculateTrends(analytics);

      expect(trends).toContainEqual(
        expect.objectContaining({
          metric: 'steps',
          trend: 'decreasing'
        })
      );
    });

    test('should handle insufficient data', () => {
      const analytics = [{ metric: 'steps', value: '8000' }];

      const trends = dataManager.calculateTrends(analytics);

      expect(trends).toEqual([]);
    });
  });

  describe('groupBy', () => {
    test('should group data by field', () => {
      const data = [
        { type: 'running', value: 1 },
        { type: 'cycling', value: 2 },
        { type: 'running', value: 3 }
      ];

      const result = dataManager.groupBy(data, 'type');

      expect(result.running).toHaveLength(2);
      expect(result.cycling).toHaveLength(1);
    });

    test('should handle missing field values', () => {
      const data = [
        { type: 'running', value: 1 },
        { value: 2 }, // Missing type
        { type: 'cycling', value: 3 }
      ];

      const result = dataManager.groupBy(data, 'type');

      expect(result.running).toHaveLength(1);
      expect(result.cycling).toHaveLength(1);
      expect(result.Unknown).toHaveLength(1);
    });
  });

  describe('exportData', () => {
    beforeEach(async () => {
      // Initialize the data manager
      mockHealthParser.initialize.mockResolvedValue();
      mockSheetsIntegration.initialize.mockResolvedValue();
      mockSheetsIntegration.initializeSpreadsheet.mockResolvedValue();
      await dataManager.initialize();
    });

    test('should export data in JSON format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      mockSheetsIntegration.getWorkouts.mockResolvedValue([]);
      mockSheetsIntegration.getReadiness.mockResolvedValue([]);
      mockSheetsIntegration.getPTProgress.mockResolvedValue([]);
      mockSheetsIntegration.getAnalytics.mockResolvedValue([]);

      const result = await dataManager.exportData(startDate, endDate, 'json');

      expect(result.exportDate).toBeDefined();
      expect(result.dateRange.start).toBe(startDate.toISOString());
      expect(result.dateRange.end).toBe(endDate.toISOString());
      expect(result.data).toBeDefined();
    });

    test('should throw error for unsupported format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      await expect(dataManager.exportData(startDate, endDate, 'csv')).rejects.toThrow(
        "Export format 'csv' not supported"
      );
    });
  });
}); 
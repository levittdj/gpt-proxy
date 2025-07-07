const HealthAutoExportParser = require('./health-auto-export');
const fs = require('fs').promises;
const path = require('path');

// Mock the config module
jest.mock('../config/integrations', () => ({
  healthAutoExport: {
    dataPath: './test-data/health-export',
    supportedFormats: ['csv', 'json']
  }
}));

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

// Mock fs.createReadStream
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  },
  createReadStream: jest.fn()
}));

describe('HealthAutoExportParser', () => {
  let parser;
  let mockCreateReadStream;

  beforeEach(() => {
    parser = new HealthAutoExportParser();
    mockCreateReadStream = jest.fn();
    require('fs').createReadStream = mockCreateReadStream;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with config values', () => {
      expect(parser.dataPath).toBe('./test-data/health-export');
      expect(parser.supportedFormats).toEqual(['csv', 'json']);
    });
  });

  describe('getExportFiles', () => {
    test('should return only supported file formats', async () => {
      const mockFiles = ['workouts.csv', 'sleep.json', 'readiness.csv', 'unsupported.txt'];
      fs.readdir.mockResolvedValue(mockFiles);

      const result = await parser.getExportFiles();

      expect(result).toEqual(['workouts.csv', 'sleep.json', 'readiness.csv']);
      expect(fs.readdir).toHaveBeenCalledWith('./test-data/health-export');
    });

    test('should throw error when directory read fails', async () => {
      fs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(parser.getExportFiles()).rejects.toThrow('Failed to read export directory: Directory not found');
    });
  });

  describe('parseFile', () => {
    test('should parse CSV files', async () => {
      const mockCsvData = [
        { type: 'Running', date: '2024-01-01', value: '30', unit: 'min' },
        { type: 'Sleep', date: '2024-01-01', value: '8', unit: 'hours' }
      ];

      mockCreateReadStream.mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') {
              mockCsvData.forEach(callback);
            } else if (event === 'end') {
              callback();
            }
            return { on: jest.fn() };
          })
        })
      });

      const result = await parser.parseFile('test.csv');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('workouts');
      expect(result[1].category).toBe('sleep');
    });

    test('should parse JSON files', async () => {
      const mockJsonData = [
        { type: 'Heart Rate', date: '2024-01-01', value: 72, unit: 'bpm' },
        { type: 'HRV', date: '2024-01-01', value: 45, unit: 'ms' }
      ];

      fs.readFile.mockResolvedValue(JSON.stringify(mockJsonData));

      const result = await parser.parseFile('test.json');

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('readiness');
      expect(result[1].category).toBe('readiness');
    });

    test('should throw error for unsupported file format', async () => {
      await expect(parser.parseFile('test.txt')).rejects.toThrow('Unsupported file format: .txt');
    });
  });

  describe('processCSVRow', () => {
    test('should process workout data correctly', () => {
      const row = {
        type: 'Running',
        date: '2024-01-01T10:00:00Z',
        value: '30',
        unit: 'min',
        duration: '1800',
        distance: '5000',
        calories: '300'
      };

      const result = parser.processCSVRow(row);

      expect(result.category).toBe('workouts');
      expect(result.data.type).toBe('running');
      expect(result.data.date).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.data.value).toBe(30);
      expect(result.data.unit).toBe('min');
      expect(result.data.metadata.duration).toBe('1800');
      expect(result.data.metadata.distance).toBe('5000');
      expect(result.data.metadata.calories).toBe('300');
    });

    test('should process sleep data correctly', () => {
      const row = {
        type: 'Sleep Analysis',
        date: '2024-01-01T22:00:00Z',
        value: '8',
        unit: 'hours',
        startDate: '2024-01-01T22:00:00Z',
        endDate: '2024-01-02T06:00:00Z'
      };

      const result = parser.processCSVRow(row);

      expect(result.category).toBe('sleep');
      expect(result.data.type).toBe('sleep analysis');
      expect(result.data.date).toEqual(new Date('2024-01-01T22:00:00Z'));
      expect(result.data.value).toBe(8);
      expect(result.data.unit).toBe('hours');
    });

    test('should process readiness data correctly', () => {
      const row = {
        type: 'Heart Rate Variability',
        date: '2024-01-01T06:00:00Z',
        value: '45',
        unit: 'ms',
        source: 'Apple Watch'
      };

      const result = parser.processCSVRow(row);

      expect(result.category).toBe('readiness');
      expect(result.data.type).toBe('heart rate variability');
      expect(result.data.date).toEqual(new Date('2024-01-01T06:00:00Z'));
      expect(result.data.value).toBe(45);
      expect(result.data.unit).toBe('ms');
      expect(result.data.source).toBe('Apple Watch');
    });

    test('should return null for invalid rows', () => {
      const row = { value: '30' }; // Missing type and date

      const result = parser.processCSVRow(row);

      expect(result).toBeNull();
    });

    test('should handle different field name variations', () => {
      const row = {
        Type: 'Running',
        Date: '2024-01-01T10:00:00Z',
        Value: '30',
        Unit: 'min'
      };

      const result = parser.processCSVRow(row);

      expect(result.category).toBe('workouts');
      expect(result.data.type).toBe('running');
      expect(result.data.date).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.data.value).toBe(30);
      expect(result.data.unit).toBe('min');
    });
  });

  describe('categorizeData', () => {
    test('should categorize workout types correctly', () => {
      const workoutTypes = ['running', 'cycling', 'swimming', 'walking', 'strength training'];
      
      workoutTypes.forEach(type => {
        const data = { type, date: new Date(), value: 30 };
        const result = parser.categorizeData(data);
        expect(result.category).toBe('workouts');
      });
    });

    test('should categorize sleep types correctly', () => {
      const sleepTypes = ['sleep analysis', 'sleep', 'bedtime', 'wake time'];
      
      sleepTypes.forEach(type => {
        const data = { type, date: new Date(), value: 8 };
        const result = parser.categorizeData(data);
        expect(result.category).toBe('sleep');
      });
    });

    test('should categorize readiness types correctly', () => {
      const readinessTypes = ['heart rate variability', 'hrv', 'resting heart rate', 'respiratory rate'];
      
      readinessTypes.forEach(type => {
        const data = { type, date: new Date(), value: 45 };
        const result = parser.categorizeData(data);
        expect(result.category).toBe('readiness');
      });
    });

    test('should categorize unknown types as metrics', () => {
      const data = { type: 'unknown metric', date: new Date(), value: 100 };
      const result = parser.categorizeData(data);
      expect(result.category).toBe('metrics');
    });
  });

  describe('extractMetadata', () => {
    test('should extract common metadata fields', () => {
      const row = {
        type: 'Running',
        date: '2024-01-01',
        value: '30',
        device: 'Apple Watch',
        source: 'Health App',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T10:30:00Z',
        duration: '1800',
        distance: '5000',
        calories: '300',
        steps: '6000'
      };

      const metadata = parser.extractMetadata(row);

      expect(metadata.device).toBe('Apple Watch');
      expect(metadata.source).toBe('Health App');
      expect(metadata.startdate).toBe('2024-01-01T10:00:00Z');
      expect(metadata.enddate).toBe('2024-01-01T10:30:00Z');
      expect(metadata.duration).toBe('1800');
      expect(metadata.distance).toBe('5000');
      expect(metadata.calories).toBe('300');
      expect(metadata.steps).toBe('6000');
    });

    test('should handle missing metadata fields gracefully', () => {
      const row = {
        type: 'Running',
        date: '2024-01-01',
        value: '30'
      };

      const metadata = parser.extractMetadata(row);

      expect(metadata).toEqual({});
    });
  });

  describe('processAndValidateData', () => {
    test('should process and validate merged data correctly', () => {
      const rawData = {
        workouts: [
          { type: 'running', date: new Date('2024-01-01'), value: 30, metadata: { duration: '1800' } },
          { type: 'cycling', date: new Date('2024-01-02'), value: 45, metadata: { distance: '20000' } }
        ],
        sleep: [
          { type: 'sleep', date: new Date('2024-01-01'), value: 8, metadata: { duration: '28800' } }
        ],
        readiness: [
          { type: 'hrv', date: new Date('2024-01-01'), value: 45, unit: 'ms' }
        ],
        metrics: [
          { type: 'steps', date: new Date('2024-01-01'), value: 8000 }
        ]
      };

      const result = parser.processAndValidateData(rawData);

      expect(result.workouts).toHaveLength(2);
      expect(result.sleep).toHaveLength(1);
      expect(result.readiness).toHaveLength(1);
      expect(result.metrics).toHaveLength(1);
      expect(result.summary.totalWorkouts).toBe(2);
      expect(result.summary.totalSleepRecords).toBe(1);
      expect(result.summary.totalReadinessRecords).toBe(1);
      expect(result.summary.totalMetrics).toBe(1);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('generateSummary', () => {
    test('should generate correct summary statistics', () => {
      const data = {
        workouts: [
          { type: 'running', date: new Date('2024-01-01') },
          { type: 'cycling', date: new Date('2024-01-02') }
        ],
        sleep: [
          { type: 'sleep', date: new Date('2024-01-01') }
        ],
        readiness: [
          { type: 'hrv', date: new Date('2024-01-01') },
          { type: 'heart rate', date: new Date('2024-01-02') }
        ],
        metrics: [
          { type: 'steps', date: new Date('2024-01-01') }
        ]
      };

      const summary = parser.generateSummary(data);

      expect(summary.totalWorkouts).toBe(2);
      expect(summary.totalSleepRecords).toBe(1);
      expect(summary.totalReadinessRecords).toBe(2);
      expect(summary.totalMetrics).toBe(1);
      expect(summary.workoutTypes).toEqual(['running', 'cycling']);
      expect(summary.readinessTypes).toEqual(['hrv', 'heart rate']);
      expect(summary.dateRange.start).toEqual(new Date('2024-01-01'));
      expect(summary.dateRange.end).toEqual(new Date('2024-01-02'));
    });
  });

  describe('getDataForDateRange', () => {
    test('should filter data for specific date range', async () => {
      const mockData = {
        workouts: [
          { type: 'running', date: new Date('2024-01-01'), value: 30 },
          { type: 'cycling', date: new Date('2024-01-05'), value: 45 }
        ],
        sleep: [
          { type: 'sleep', date: new Date('2024-01-02'), value: 8 }
        ],
        readiness: [
          { type: 'hrv', date: new Date('2024-01-03'), value: 45 }
        ],
        metrics: [
          { type: 'steps', date: new Date('2024-01-04'), value: 8000 }
        ]
      };

      // Mock parseAllHealthData to return our test data
      jest.spyOn(parser, 'parseAllHealthData').mockResolvedValue(mockData);

      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-04');
      const result = await parser.getDataForDateRange(startDate, endDate);

      expect(result.workouts).toHaveLength(0); // Outside range
      expect(result.sleep).toHaveLength(1); // Inside range
      expect(result.readiness).toHaveLength(1); // Inside range
      expect(result.metrics).toHaveLength(1); // Inside range
      expect(result.dateRange.start).toEqual(startDate);
      expect(result.dateRange.end).toEqual(endDate);
    });
  });

  describe('getLatestData', () => {
    test('should return data for last N days', async () => {
      const mockData = {
        workouts: [
          { type: 'running', date: new Date('2024-01-01'), value: 30 }
        ],
        sleep: [],
        readiness: [],
        metrics: []
      };

      jest.spyOn(parser, 'parseAllHealthData').mockResolvedValue(mockData);
      jest.spyOn(parser, 'getDataForDateRange').mockResolvedValue(mockData);

      const result = await parser.getLatestData(7);

      expect(parser.getDataForDateRange).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  describe('Error Handling', () => {
    test('should handle file parsing errors gracefully', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(parser.parseFile('test.json')).rejects.toThrow('Failed to parse file test.json: Failed to parse JSON file: File not found');
    });

    test('should handle CSV parsing errors gracefully', async () => {
      mockCreateReadStream.mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'error') {
              callback(new Error('CSV parsing error'));
            }
            return { on: jest.fn() };
          })
        })
      });

      await expect(parser.parseFile('test.csv')).rejects.toThrow('CSV parsing error');
    });
  });
}); 
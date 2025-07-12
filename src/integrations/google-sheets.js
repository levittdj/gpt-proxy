const { google } = require('googleapis');
const config = require('../config/integrations');

/**
 * Google Sheets API integration for data storage and analysis
 * Handles storing and retrieving fitness data, training plans, and analytics
 */
class GoogleSheetsIntegration {
  constructor() {
    this.spreadsheetId = config.googleSheets.spreadsheetId;
    this.ranges = config.googleSheets.ranges;
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Initialize Google Sheets API authentication
   */
  async initialize() {
    try {
      // Service-account authentication: accept either a file path (local dev)
      // or the raw JSON string injected by Vercel (production).
      const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
      if (!saKey) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var is missing');
      }

      const authOpts = { scopes: ['https://www.googleapis.com/auth/spreadsheets'] };

      // If the value starts with a "{" we assume it is the full JSON string.
      if (saKey.trim().startsWith('{')) {
        try {
          authOpts.credentials = JSON.parse(saKey);
        } catch (err) {
          throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_FILE JSON');
        }
      } else {
        authOpts.keyFile = saKey;
      }

      this.auth = new google.auth.GoogleAuth(authOpts);

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Test the connection
      await this.testConnection();
      
      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets API: ${error.message}`);
    }
  }

  /**
   * Test the connection to Google Sheets
   */
  async testConnection() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to connect to Google Sheets: ${error.message}`);
    }
  }

  /**
   * Initialize spreadsheet structure if it doesn't exist
   */
  async initializeSpreadsheet() {
    try {
      const sheets = [
        { title: 'Workouts', headers: this.getWorkoutHeaders() },
        { title: 'Readiness', headers: this.getReadinessHeaders() },
        { title: 'TrainingPlans', headers: this.getTrainingPlanHeaders() },
        { title: 'Metrics', headers: this.getMetricsHeaders() },
        { title: 'Strength', headers: this.getStrengthHeaders() },
        { title: 'PTProgress', headers: this.getPTProgressHeaders() },
        { title: 'Analytics', headers: this.getAnalyticsHeaders() }
      ];

      for (const sheet of sheets) {
        await this.createSheetIfNotExists(sheet.title, sheet.headers);
      }

      console.log('✅ Spreadsheet structure initialized');
    } catch (error) {
      throw new Error(`Failed to initialize spreadsheet: ${error.message}`);
    }
  }

  /**
   * Create a sheet if it doesn't exist and add headers
   */
  async createSheetIfNotExists(sheetTitle, headers) {
    try {
      // Check if sheet exists
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheetExists = response.data.sheets.some(
        sheet => sheet.properties.title === sheetTitle
      );

      if (!sheetExists) {
        // Create new sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetTitle
                  }
                }
              }
            ]
          }
        });

        // Add headers
        await this.appendData(sheetTitle, [headers]);
      }
    } catch (error) {
      throw new Error(`Failed to create sheet ${sheetTitle}: ${error.message}`);
    }
  }

  /**
   * Get headers for Workouts sheet
   */
  getWorkoutHeaders() {
    return [
      'ID', 'Date', 'Type', 'Duration', 'Distance', 'Calories', 'Source',
      'Sets', 'Weight', 'Reps', 'Notes', 'CreatedAt', 'UpdatedAt'
    ];
  }

  /**
   * Get headers for Readiness sheet
   */
  getReadinessHeaders() {
    return [
      'ID', 'Date', 'Type', 'Value', 'Unit', 'Source', 'ReadinessScore',
      'HRV', 'RestingHeartRate', 'SleepQuality', 'SleepDuration',
      'TrainingLoad', 'Fatigue', 'Notes', 'CreatedAt'
    ];
  }

  /**
   * Get headers for TrainingPlans sheet
   */
  getTrainingPlanHeaders() {
    return [
      'ID', 'WeekStart', 'WeekEnd', 'PlanType', 'SwimSessions', 'BikeSessions',
      'RunSessions', 'StrengthSessions', 'PTSessions', 'RecoverySessions',
      'TotalVolume', 'Intensity', 'Notes', 'CreatedAt', 'UpdatedAt'
    ];
  }

  /**
   * Get headers for Metrics sheet
   */
  getMetricsHeaders() {
    return [
      'ID', 'Date', 'Type', 'Value', 'Unit', 'Source', 'Category',
      'Trend', 'Target', 'Achievement', 'Notes', 'CreatedAt'
    ];
  }

  /**
   * Get headers for Strength sheet (detailed sets)
   * Default layout: Date | Exercise | Set # | Reps | Weight | RPE | Notes | CreatedAt
   */
  getStrengthHeaders() {
    return [
      'Date', 'Exercise', 'SetNumber', 'Reps', 'Weight', 'RPE', 'Notes', 'CreatedAt'
    ];
  }

  /**
   * Get headers for PTProgress sheet
   */
  getPTProgressHeaders() {
    return [
      'ID', 'Date', 'Exercise', 'Sets', 'Weight', 'Reps', 'Duration',
      'Difficulty', 'PainLevel', 'Notes', 'Milestone', 'CreatedAt'
    ];
  }

  /**
   * Get headers for Analytics sheet
   */
  getAnalyticsHeaders() {
    return [
      'ID', 'Date', 'Metric', 'Value', 'Period', 'Trend', 'Insight',
      'Recommendation', 'CreatedAt'
    ];
  }

  /**
   * Append data to a specific sheet
   */
  async appendData(sheetName, data, targetSpreadsheetId = null) {
    try {
      const range = `${sheetName}!A:Z`;
      const sid = targetSpreadsheetId || this.spreadsheetId;
      
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: sid,
        range: range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: data
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to append data to ${sheetName}: ${error.message}`);
    }
  }

  /**
   * Append a missed workout directly to the original HealthFit Workouts sheet
   * workoutRow should be an array in the exact column order that the HealthFit
   * Workouts tab uses (e.g. Date, Type, Duration, Distance, Calories, ...).
   * The spreadsheet ID is supplied via the env var GOOGLE_HF_WORKOUTS_SPREADSHEET_ID.
   */
  async appendMissedWorkout(workoutRow) {
    try {
      const ssId = process.env.GOOGLE_HF_WORKOUTS_SPREADSHEET_ID;
      if (process.env.PREPEND_WORKOUT_ROWS === 'true') {
        return await this.prependRowToSheet(ssId, 'Workouts', workoutRow);
      }
      const range = 'Workouts!A:Z';
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: ssId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [workoutRow]
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to append missed workout: ${error.message}`);
    }
  }

  /**
   * Prepend a row just below the header (row 2) in the target sheet.
   */
  async prependRowToSheet(spreadsheetId, sheetName, rowValues) {
    try {
      // Get sheetId for tab title
      const ssMeta = await this.sheets.spreadsheets.get({ spreadsheetId });
      const targetSheet = ssMeta.data.sheets.find(s => s.properties.title === sheetName);
      if (!targetSheet) throw new Error(`Sheet ${sheetName} not found`);
      const sheetId = targetSheet.properties.sheetId;

      // Insert a new row at position 1 (0-based index), i.e., below header
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: 1,
                  endIndex: 2
                },
                inheritFromBefore: false
              }
            }
          ]
        }
      });

      // Update the newly inserted row (row 2) with the data
      const range = `${sheetName}!A2`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] }
      });

      return { status: 'prepended' };
    } catch (err) {
      throw new Error(`Failed to prepend row: ${err.message}`);
    }
  }

  /**
   * Append a missed workout using an object keyed by column header names.
   * Any headers not provided will be left blank.
   * Example workoutObj: { Date: '2025-07-06', Type: 'Strength', 'Total Time': '00:45:00', 'Active Calories': 350, Source: 'Manual' }
   */
  async appendMissedWorkoutObject(workoutObj) {
    try {
      // Fetch header row to determine order
      const headersRes = await this.readDataFromSheet(process.env.GOOGLE_HF_WORKOUTS_SPREADSHEET_ID, 'Workouts', 'Workouts!1:1');
      const headers = headersRes[0];
      const row = headers.map(h => (h in workoutObj ? workoutObj[h] : ''));
      return await this.appendMissedWorkout(row);
    } catch (err) {
      throw new Error(`Failed to append missed workout (object): ${err.message}`);
    }
  }

  /**
   * Read data from a specific sheet
   */
  async readData(sheetName, range = null) {
    try {
      const sheetRange = range || `${sheetName}!A:Z`;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: sheetRange
      });

      return response.data.values || [];
    } catch (error) {
      throw new Error(`Failed to read data from ${sheetName}: ${error.message}`);
    }
  }

  /**
   * Read data from any spreadsheet ID and sheet name (utility for multi-sheet setups)
   * @param {string} spreadsheetId - The ID of the target spreadsheet
   * @param {string} sheetName - The tab title within that spreadsheet
   * @param {string|null} rangeOverride - Optional explicit A1 range (e.g. "A1:D50"). Defaults to full A:Z range on the sheet.
   * @returns {Promise<Array<Array<string>>>} 2-D array of cell values (may be empty)
   */
  async readDataFromSheet(spreadsheetId, sheetName, rangeOverride = null) {
    try {
      const sheetRange = rangeOverride || `${sheetName}!A:Z`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetRange
      });
      return response.data.values || [];
    } catch (error) {
      throw new Error(`Failed to read data from sheet ${sheetName} (ID: ${spreadsheetId}): ${error.message}`);
    }
  }

  /**
   * Update specific cells in a sheet
   */
  async updateData(sheetName, range, values) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update data in ${sheetName}: ${error.message}`);
    }
  }

  /**
   * Store workout data
   */
  async storeWorkout(workout) {
    const data = [
      [
        workout.id,
        workout.date.toISOString(),
        workout.type,
        workout.duration || '',
        workout.distance || '',
        workout.calories || '',
        workout.source || 'HealthFit',
        workout.sets || '',
        workout.weight || '',
        workout.reps || '',
        workout.notes || '',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    ];

    return await this.appendData('Workouts', data);
  }

  /**
   * Store readiness data
   */
  async storeReadiness(readiness, targetSpreadsheetId = null) {
    const data = [
      [
        readiness.id,
        readiness.date.toISOString(),
        readiness.type,
        readiness.value,
        readiness.unit || '',
        readiness.source || 'Health Auto Export',
        readiness.readinessScore || '',
        readiness.hrv || '',
        readiness.hrvMean || '',
        readiness.hrvSd || '',
        readiness.sleepDuration,
        readiness.sleepMean || '',
        readiness.sleepSd || '',
        readiness.sleepQuality || '',
        readiness.wakeCount || '',
        readiness.awakeMinutes || '',
        readiness.notes || '',
        new Date().toISOString()
      ]
    ];

    return await this.appendData('Readiness', data, targetSpreadsheetId);
  }

  /**
   * Store training plan
   */
  async storeTrainingPlan(plan) {
    const data = [
      [
        plan.id,
        plan.weekStart.toISOString(),
        plan.weekEnd.toISOString(),
        plan.planType,
        plan.swimSessions || 0,
        plan.bikeSessions || 0,
        plan.runSessions || 0,
        plan.strengthSessions || 0,
        plan.ptSessions || 0,
        plan.recoverySessions || 0,
        plan.totalVolume || 0,
        plan.intensity || 'moderate',
        plan.notes || '',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    ];

    return await this.appendData('TrainingPlans', data);
  }

  /**
   * Store PT progress
   */
  async storePTProgress(ptData) {
    const data = [
      [
        ptData.id,
        ptData.date.toISOString(),
        ptData.exercise,
        ptData.sets || '',
        ptData.weight || '',
        ptData.reps || '',
        ptData.duration || '',
        ptData.difficulty || '',
        ptData.painLevel || '',
        ptData.notes || '',
        ptData.milestone || '',
        new Date().toISOString()
      ]
    ];

    return await this.appendData('PTProgress', data);
  }

  /**
   * Store analytics data
   */
  async storeAnalytics(analytics) {
    const data = [
      [
        analytics.id,
        analytics.date.toISOString(),
        analytics.metric,
        analytics.value,
        analytics.period || 'daily',
        analytics.trend || '',
        analytics.insight || '',
        analytics.recommendation || '',
        new Date().toISOString()
      ]
    ];

    return await this.appendData('Analytics', data);
  }

  /**
   * Store a single strength set detail
   * @param {Object} setDetail - { date: Date|string, exercise: string, setNumber: number, reps: number, weight: number, rpe?: number, notes?: string }
   */
  async storeStrengthSet(setDetail) {
    const dateString = setDetail.date instanceof Date ? setDetail.date.toISOString().slice(0, 10) : setDetail.date;
    const data = [[
      dateString,
      setDetail.exercise,
      setDetail.setNumber || '',
      setDetail.reps || '',
      setDetail.weight || '',
      setDetail.rpe || '',
      setDetail.notes || '',
      new Date().toISOString()
    ]];

    return await this.appendData('Strength', data);
  }

  /**
   * Get workouts for a date range
   */
  async getWorkouts(startDate, endDate) {
    const mergeRows = async (rawData) => {
      if (!rawData || rawData.length === 0) return [];
      const headers = rawData[0];
      const rows = rawData.slice(1);
      return rows.map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h.toLowerCase()] = row[idx];
        });
        return obj;
      });
    };

    // Primary sheet
    const mainData = await this.readData('Workouts');
    let workouts = await mergeRows(mainData);

    // Optionally pull workouts from the original HealthFit spreadsheet
    const hfSheetId = process.env.GOOGLE_HF_WORKOUTS_SPREADSHEET_ID;
    if (hfSheetId && hfSheetId !== this.spreadsheetId) {
      try {
        const hfData = await this.readDataFromSheet(hfSheetId, 'Workouts');
        workouts = workouts.concat(await mergeRows(hfData));
      } catch (err) {
        console.warn('⚠️  Unable to read HealthFit Workouts sheet:', err.message);
      }
    }

    // Filter by date range (inclusive)
    return workouts.filter(w => {
      const dVal = w.date || w['date/time'] || w.timestamp || '';
      if (!dVal) return false;
      const d = new Date(typeof dVal === 'string' ? dVal.replace(/\s+UTC$/, '') : dVal);
      return !isNaN(d) && d >= startDate && d <= endDate;
    });
  }

  /**
   * Get readiness data for a date range
   */
  async getReadiness(startDate, endDate) {
    const data = await this.readData('Readiness');
    const headers = data[0];
    const rows = data.slice(1);

    return rows
      .map(row => {
        const readiness = {};
        headers.forEach((header, index) => {
          readiness[header.toLowerCase()] = row[index];
        });
        return readiness;
      })
      .filter(readiness => {
        const readinessDate = new Date(readiness.date);
        return readinessDate >= startDate && readinessDate <= endDate;
      });
  }

  /**
   * Get latest training plan
   */
  async getLatestTrainingPlan() {
    const data = await this.readData('TrainingPlans');
    const headers = data[0];
    const rows = data.slice(1);

    if (rows.length === 0) return null;

    const latestRow = rows[rows.length - 1];
    const plan = {};
    headers.forEach((header, index) => {
      plan[header.toLowerCase()] = latestRow[index];
    });

    return plan;
  }

  /**
   * Get PT progress for a date range
   */
  async getPTProgress(startDate, endDate) {
    const data = await this.readData('PTProgress');
    const headers = data[0];
    const rows = data.slice(1);

    return rows
      .map(row => {
        const ptData = {};
        headers.forEach((header, index) => {
          ptData[header.toLowerCase()] = row[index];
        });
        return ptData;
      })
      .filter(ptData => {
        const ptDate = new Date(ptData.date);
        return ptDate >= startDate && ptDate <= endDate;
      });
  }

  /**
   * Get analytics for a specific period
   */
  async getAnalytics(period = 'daily', limit = 30) {
    const data = await this.readData('Analytics');
    const headers = data[0];
    const rows = data.slice(1);

    return rows
      .map(row => {
        const analytics = {};
        headers.forEach((header, index) => {
          analytics[header.toLowerCase()] = row[index];
        });
        return analytics;
      })
      .filter(analytics => analytics.period === period)
      .slice(-limit); // Get latest N entries
  }

  /**
   * Create summary dashboard data
   */
  async createDashboardData() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const [workouts, readiness, ptProgress] = await Promise.all([
      this.getWorkouts(startDate, endDate),
      this.getReadiness(startDate, endDate),
      this.getPTProgress(startDate, endDate)
    ]);

    return {
      period: '7 days',
      workouts: {
        total: workouts.length,
        byType: this.groupBy(workouts, 'type'),
        totalDuration: workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0),
        totalDistance: workouts.reduce((sum, w) => sum + (parseFloat(w.distance) || 0), 0)
      },
      readiness: {
        total: readiness.length,
        averageScore: readiness.length > 0 
          ? readiness.reduce((sum, r) => sum + (parseFloat(r.readinessscore) || 0), 0) / readiness.length 
          : 0,
        latestHRV: readiness.find(r => r.type === 'hrv')?.value || null
      },
      ptProgress: {
        total: ptProgress.length,
        byExercise: this.groupBy(ptProgress, 'exercise'),
        milestones: ptProgress.filter(p => p.milestone).length
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Group data by a specific field
   */
  groupBy(data, field) {
    return data.reduce((groups, item) => {
      const key = item[field] || 'Unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Clear all data from a sheet (use with caution)
   */
  async clearSheet(sheetName) {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`
      });

      // Re-add headers
      const headers = this.getHeadersForSheet(sheetName);
      if (headers) {
        await this.appendData(sheetName, [headers]);
      }
    } catch (error) {
      throw new Error(`Failed to clear sheet ${sheetName}: ${error.message}`);
    }
  }

  /**
   * Get headers for a specific sheet
   */
  getHeadersForSheet(sheetName) {
    const headerMap = {
      'Workouts': this.getWorkoutHeaders(),
      'Readiness': this.getReadinessHeaders(),
      'TrainingPlans': this.getTrainingPlanHeaders(),
      'Metrics': this.getMetricsHeaders(),
      'Strength': this.getStrengthHeaders(),
      'PTProgress': this.getPTProgressHeaders(),
      'Analytics': this.getAnalyticsHeaders()
    };

    return headerMap[sheetName] || null;
  }
}

module.exports = GoogleSheetsIntegration; 
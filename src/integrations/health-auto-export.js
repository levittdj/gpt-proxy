const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const config = require('../config/integrations');

/**
 * Health Auto Export data parser for Apple Health data
 * Handles CSV and JSON exports from Health Auto Export app
 */
class HealthAutoExportParser {
  constructor() {
    this.dataPath = config.healthAutoExport.dataPath;
    this.supportedFormats = config.healthAutoExport.supportedFormats;
  }

  /**
   * Parse all available health data from the export directory
   */
  async parseAllHealthData() {
    try {
      const files = await this.getExportFiles();
      const parsedData = {
        workouts: [],
        sleep: [],
        readiness: [],
        metrics: []
      };

      for (const file of files) {
        const data = await this.parseFile(file);
        this.mergeData(parsedData, data);
      }

      return this.processAndValidateData(parsedData);
    } catch (error) {
      throw new Error(`Failed to parse health data: ${error.message}`);
    }
  }

  /**
   * Get all export files from the configured directory
   */
  async getExportFiles() {
    try {
      const files = await fs.readdir(this.dataPath);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.supportedFormats.includes(ext.slice(1));
      });
    } catch (error) {
      throw new Error(`Failed to read export directory: ${error.message}`);
    }
  }

  /**
   * Parse a single export file (CSV or JSON)
   */
  async parseFile(filename) {
    const filePath = path.join(this.dataPath, filename);
    const ext = path.extname(filename).toLowerCase();

    try {
      if (ext === '.csv') {
        return await this.parseCSVFile(filePath);
      } else if (ext === '.json') {
        return await this.parseJSONFile(filePath);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse file ${filename}: ${error.message}`);
    }
  }

  /**
   * Parse CSV file using streaming for large files
   */
  parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          const processed = this.processCSVRow(data);
          if (processed) {
            results.push(processed);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse JSON file
   */
  async parseJSONFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      return this.processJSONData(jsonData);
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * Process a single CSV row and categorize the data
   */
  processCSVRow(row) {
    const type = row.type || row.Type || row.dataType || row.DataType;
    const date = row.date || row.Date || row.startDate || row.StartDate;
    const value = row.value || row.Value || row.quantity || row.Quantity;

    if (!type || !date) {
      return null;
    }

    const processed = {
      type: type.toLowerCase(),
      date: new Date(date),
      value: parseFloat(value) || value,
      unit: row.unit || row.Unit || '',
      source: row.source || row.Source || 'Health Auto Export',
      metadata: this.extractMetadata(row)
    };

    return this.categorizeData(processed);
  }

  /**
   * Process JSON data and categorize it
   */
  processJSONData(jsonData) {
    const results = [];
    
    if (Array.isArray(jsonData)) {
      jsonData.forEach(item => {
        const processed = this.processJSONItem(item);
        if (processed) {
          results.push(processed);
        }
      });
    } else if (typeof jsonData === 'object') {
      const processed = this.processJSONItem(jsonData);
      if (processed) {
        results.push(processed);
      }
    }

    return results;
  }

  /**
   * Process a single JSON item
   */
  processJSONItem(item) {
    const type = item.type || item.dataType || item.DataType;
    const date = item.date || item.startDate || item.Date || item.StartDate;
    const value = item.value || item.quantity || item.Value || item.Quantity;

    if (!type || !date) {
      return null;
    }

    const processed = {
      type: type.toLowerCase(),
      date: new Date(date),
      value: parseFloat(value) || value,
      unit: item.unit || item.Unit || '',
      source: item.source || item.Source || 'Health Auto Export',
      metadata: this.extractMetadata(item)
    };

    return this.categorizeData(processed);
  }

  /**
   * Categorize data into workouts, sleep, readiness, or metrics
   */
  categorizeData(data) {
    const workoutTypes = [
      'running', 'cycling', 'swimming', 'walking', 'strength training',
      'yoga', 'pilates', 'hiit', 'cardio', 'workout'
    ];

    const sleepTypes = [
      'sleep analysis', 'sleep', 'bedtime', 'wake time', 'sleep stages'
    ];

    const readinessTypes = [
      'heart rate variability', 'hrv', 'resting heart rate', 'respiratory rate',
      'blood oxygen', 'vo2 max', 'cardio fitness', 'heart rate'
    ];

    const type = data.type.toLowerCase();

    if (workoutTypes.some(wt => type.includes(wt))) {
      return { category: 'workouts', data };
    } else if (sleepTypes.some(st => type.includes(st))) {
      return { category: 'sleep', data };
    } else if (readinessTypes.some(rt => type.includes(rt))) {
      return { category: 'readiness', data };
    } else {
      return { category: 'metrics', data };
    }
  }

  /**
   * Extract additional metadata from data row
   */
  extractMetadata(row) {
    const metadata = {};
    
    // Common metadata fields
    const metadataFields = [
      'device', 'Device', 'source', 'Source', 'startDate', 'StartDate',
      'endDate', 'EndDate', 'duration', 'Duration', 'distance', 'Distance',
      'calories', 'Calories', 'steps', 'Steps', 'flights', 'Flights'
    ];

    metadataFields.forEach(field => {
      if (row[field] !== undefined) {
        metadata[field.toLowerCase()] = row[field];
      }
    });

    return metadata;
  }

  /**
   * Merge parsed data from multiple files
   */
  mergeData(target, source) {
    if (Array.isArray(source)) {
      source.forEach(item => {
        if (item && item.category && item.data) {
          if (!target[item.category]) {
            target[item.category] = [];
          }
          target[item.category].push(item.data);
        }
      });
    }
  }

  /**
   * Process and validate the merged data
   */
  processAndValidateData(data) {
    const processed = {
      workouts: this.processWorkouts(data.workouts || []),
      sleep: this.processSleep(data.sleep || []),
      readiness: this.processReadiness(data.readiness || []),
      metrics: this.processMetrics(data.metrics || [])
    };

    return {
      ...processed,
      summary: this.generateSummary(processed),
      lastUpdated: new Date()
    };
  }

  /**
   * Process workout data
   */
  processWorkouts(workouts) {
    return workouts
      .filter(workout => workout.date && workout.value)
      .map(workout => ({
        id: this.generateId(workout),
        type: workout.type,
        date: workout.date,
        duration: workout.metadata.duration || null,
        distance: workout.metadata.distance || null,
        calories: workout.metadata.calories || null,
        source: workout.source,
        metadata: workout.metadata
      }))
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Process sleep data
   */
  processSleep(sleepData) {
    return sleepData
      .filter(sleep => sleep.date && sleep.value)
      .map(sleep => ({
        id: this.generateId(sleep),
        type: sleep.type,
        date: sleep.date,
        duration: sleep.metadata.duration || sleep.value,
        startTime: sleep.metadata.startdate || null,
        endTime: sleep.metadata.enddate || null,
        source: sleep.source,
        metadata: sleep.metadata
      }))
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Process readiness indicators (HRV, heart rate, etc.)
   */
  processReadiness(readinessData) {
    return readinessData
      .filter(metric => metric.date && metric.value)
      .map(metric => ({
        id: this.generateId(metric),
        type: metric.type,
        date: metric.date,
        value: metric.value,
        unit: metric.unit,
        source: metric.source,
        metadata: metric.metadata
      }))
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Process general metrics
   */
  processMetrics(metrics) {
    return metrics
      .filter(metric => metric.date && metric.value)
      .map(metric => ({
        id: this.generateId(metric),
        type: metric.type,
        date: metric.date,
        value: metric.value,
        unit: metric.unit,
        source: metric.source,
        metadata: metric.metadata
      }))
      .sort((a, b) => b.date - a.date);
  }

  /**
   * Generate a unique ID for data entries
   */
  generateId(data) {
    return `${data.type}-${data.date.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(data) {
    return {
      totalWorkouts: data.workouts.length,
      totalSleepRecords: data.sleep.length,
      totalReadinessRecords: data.readiness.length,
      totalMetrics: data.metrics.length,
      dateRange: {
        start: this.getEarliestDate(data),
        end: this.getLatestDate(data)
      },
      workoutTypes: this.getUniqueValues(data.workouts, 'type'),
      readinessTypes: this.getUniqueValues(data.readiness, 'type')
    };
  }

  /**
   * Get earliest date from all data
   */
  getEarliestDate(data) {
    const allDates = [
      ...data.workouts.map(w => w.date),
      ...data.sleep.map(s => s.date),
      ...data.readiness.map(r => r.date),
      ...data.metrics.map(m => m.date)
    ];
    return allDates.length > 0 ? new Date(Math.min(...allDates)) : null;
  }

  /**
   * Get latest date from all data
   */
  getLatestDate(data) {
    const allDates = [
      ...data.workouts.map(w => w.date),
      ...data.sleep.map(s => s.date),
      ...data.readiness.map(r => r.date),
      ...data.metrics.map(m => m.date)
    ];
    return allDates.length > 0 ? new Date(Math.max(...allDates)) : null;
  }

  /**
   * Get unique values for a specific field
   */
  getUniqueValues(data, field) {
    return [...new Set(data.map(item => item[field]))];
  }

  /**
   * Get data for a specific date range
   */
  async getDataForDateRange(startDate, endDate) {
    const allData = await this.parseAllHealthData();
    
    const filterByDate = (items) => {
      return items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    };

    return {
      workouts: filterByDate(allData.workouts),
      sleep: filterByDate(allData.sleep),
      readiness: filterByDate(allData.readiness),
      metrics: filterByDate(allData.metrics),
      summary: allData.summary,
      dateRange: { start: startDate, end: endDate }
    };
  }

  /**
   * Get latest data (last N days)
   */
  async getLatestData(days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.getDataForDateRange(startDate, endDate);
  }
}

module.exports = HealthAutoExportParser; 
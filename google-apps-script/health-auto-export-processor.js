/**
 * Health Auto Export Processor - Google Apps Script
 * Automatically processes multiple Apple Health data exports from Health Auto Export and updates Google Sheets
 * 
 * Setup Instructions:
 * 1. Go to https://script.google.com/
 * 2. Create a new project
 * 3. Replace the default code with this script
 * 4. Set up triggers (see below)
 */

// Configuration - Update these values
const CONFIG = {
    // Google Drive folders for Health Auto Export files
    WORKOUTS_FOLDER_NAME: 'Health Auto Export/Workouts', // Folder for workouts CSVs
    METRICS_FOLDER_NAME: 'Health Auto Export/Metrics',   // Folder for health metrics CSVs
    
    // Google Sheet where data will be stored
    SPREADSHEET_ID: '1M0iXTGBha6eS31kJLLbGIXjphixfiiQeSm25jSmVCoU', // Your actual spreadsheet ID
    
    // Sheet names in your Google Sheet
    SHEETS: {
      WORKOUTS: 'Workouts',
      WORKOUT_METADATA: 'WorkoutMetadata',
      READINESS: 'Readiness',
      METRICS: 'Metrics',
      SLEEP: 'Sleep'
    },
    
    // File patterns to look for (Health Auto Export default naming)
    FILE_PATTERNS: {
      WORKOUTS: ['workouts_', 'activity_', 'exercise_', 'health_auto_export_'],
      HEALTH: ['health_', 'metrics_', 'heart_', 'sleep_', 'health_auto_export_'],
      ALL: ['health_auto_export_', 'apple_health_', 'workouts_', 'health_'],
      
      // Specific file types that Health Auto Export creates
      HEALTH_AUTO_EXPORT: 'health_auto_export_',
      WORKOUTS_ONLY: 'workouts_',
      HEALTH_METRICS: 'health_'
    },
    
    // Metadata aggregation intervals (in minutes)
    METADATA_INTERVALS: {
      HEART_RATE: 1,      // 1-minute intervals for HR data
      PACE_SPEED: 5,      // 5-minute intervals for pace/speed
      POWER_CADENCE: 5,   // 5-minute intervals for power/cadence
      ELEVATION: 10,      // 10-minute intervals for elevation
      OVERALL: 5          // 5-minute intervals for general metadata
    },
    
    // How often to check for new files (in minutes)
    CHECK_INTERVAL_MINUTES: 60
  };
  
  /**
   * Regex patterns for exact file name matching
   */
  const FILE_NAME_PATTERNS = {
    WORKOUTS: /^Workouts-\d{4}-\d{2}-\d{2}\.csv$/i,
    METRICS: /^HealthMetrics-\d{4}-\d{2}-\d{2}\.csv$/i
  };
  
  /**
   * Main function to process Health Auto Export data
   * This will be triggered automatically
   */
  function processHealthAutoExport() {
    try {
      Logger.log('Starting Health Auto Export processing...');
      processAllExportFolders();
      Logger.log('Health Auto Export processing completed successfully!');
    } catch (error) {
      Logger.log('Error processing Health Auto Export: ' + error);
    }
  }
  
  /**
   * Helper to get a subfolder by name inside a parent folder
   */
  function getSubfolder(parentName, childName) {
    const parentFolders = DriveApp.getFoldersByName(parentName);
    while (parentFolders.hasNext()) {
      const parent = parentFolders.next();
      const subfolders = parent.getFoldersByName(childName);
      if (subfolders.hasNext()) {
        return subfolders.next();
      }
    }
    return null;
  }
  
  /**
   * Update getHealthExportFolder to use the helper for Workouts
   */
  function getHealthExportFolder() {
    const folder = getSubfolder('Health Auto Export', 'Workouts');
    if (folder) {
      console.log('Found folder: Health Auto Export/Workouts');
      return folder;
    }
    console.error('No folder found with name: Health Auto Export/Workouts');
    console.error('Available folders in Google Drive:');
    const allFolders = DriveApp.getFolders();
    while (allFolders.hasNext()) {
      const folder = allFolders.next();
      console.log('- ' + folder.getName());
    }
    throw new Error('Health Auto Export/Workouts folder not found. Please check your configuration.');
  }
  
  /**
   * Add a similar function for Metrics if needed elsewhere in the script
   */
  function getMetricsExportFolder() {
    const folder = getSubfolder('Health Auto Export', 'Metrics');
    if (folder) {
      console.log('Found folder: Health Auto Export/Metrics');
      return folder;
    }
    console.error('No folder found with name: Health Auto Export/Metrics');
    throw new Error('Health Auto Export/Metrics folder not found. Please check your configuration.');
  }
  
  /**
   * List all available folders for debugging
   */
  function listAvailableFolders() {
    console.log('Available folders in Google Drive:');
    const folders = DriveApp.getFolders();
    let count = 0;
    
    while (folders.hasNext() && count < 50) { // Limit to first 50 folders
      const folder = folders.next();
      console.log(`${count + 1}. "${folder.getName()}" (ID: ${folder.getId()})`);
      count++;
    }
    
    if (count >= 50) {
      console.log('... and more folders (showing first 50)');
    }
    
    return count;
  }
  
  /**
   * Get all unprocessed files from the folder
   */
  function getUnprocessedFiles(folder) {
    const files = folder.getFiles();
    const unprocessedFiles = [];
    
    while (files.hasNext()) {
      const file = files.next();
      if (!isFileAlreadyProcessed(file)) {
        unprocessedFiles.push(file);
      }
    }
    
    // Sort by date (oldest first)
    unprocessedFiles.sort((a, b) => a.getLastUpdated() - b.getLastUpdated());
    
    return unprocessedFiles;
  }
  
  /**
   * Check if a file has already been processed
   */
  function isFileAlreadyProcessed(file) {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const processedSheet = spreadsheet.getSheetByName('ProcessedFiles');
    
    if (!processedSheet) {
      // Create the sheet if it doesn't exist
      const newSheet = spreadsheet.insertSheet('ProcessedFiles');
      newSheet.appendRow(['FileName', 'ProcessedDate', 'FileId', 'FileSize']);
      return false;
    }
    
    const data = processedSheet.getDataRange().getValues();
    const fileName = file.getName();
    const fileId = file.getId();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === fileName || data[i][2] === fileId) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Process the export file and extract data
   */
  function processExportFile(file) {
    console.log('Processing file:', file.getName());
    
    const content = file.getBlob().getDataAsString('UTF-8');
    const lines = content.split('\n');
    
    const data = {
      workouts: [],
      workoutMetadata: [],
      readiness: [],
      metrics: [],
      sleep: []
    };
    
    // Determine file type based on filename
    const fileName = file.getName().toLowerCase();
    const fileType = determineFileType(fileName);
    
    if (fileType === 'health_metrics') {
      data.metrics = parseWideMetricsCSV(content);
      console.log(`Parsed ${data.metrics.length} metrics records from wide CSV`);
      return data;
    }
    
    if (fileType === 'workouts') {
      data.workouts = parseWideWorkoutsCSV(content);
      console.log(`Parsed ${data.workouts.length} workout records from wide CSV`);
      return data;
    }
    
    // Parse CSV data
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = parseCSVLine(line);
      if (columns.length < 3) continue;
      
      const record = {
        date: columns[1],
        type: columns[0],
        value: columns[3],
        unit: 'duration',
        source: 'Health Auto Export',
        notes: '',
        fileType: fileType
      };
      
      // Categorize the data based on file type and content
      categorizeRecord(record, data, fileType);
    }
    
    // Process workout metadata if we have workout data
    if (data.workouts.length > 0) {
      data.workoutMetadata = processWorkoutMetadata(data.workouts, content);
    }
    
    console.log(`Processed ${fileType} file: ${data.workouts.length} workouts, ${data.workoutMetadata.length} metadata entries, ${data.readiness.length} readiness, ${data.metrics.length} metrics, ${data.sleep.length} sleep`);
    return data;
  }
  
  /**
   * Determine the type of export file based on filename
   */
  function determineFileType(fileName) {
    const lowerFileName = fileName.toLowerCase();
    
    if (/^workouts-\d{4}-\d{2}-\d{2}\.csv$/.test(fileName)) {
      return 'workouts';
    }
    if (/^healthmetrics-\d{4}-\d{2}-\d{2}\.csv$/.test(fileName)) {
      return 'health_metrics';
    }
    if (lowerFileName.includes('health_auto_export_')) {
      return 'health_auto_export';
    }
    if (lowerFileName.includes('workouts_')) {
      return 'workouts';
    }
    if (lowerFileName.includes('health_') && !lowerFileName.includes('health_auto_export_')) {
      return 'health_metrics';
    }
    if (lowerFileName.includes('activity_') || lowerFileName.includes('exercise_')) {
      return 'workouts';
    }
    if (lowerFileName.includes('metrics_') || lowerFileName.includes('heart_') || lowerFileName.includes('sleep_')) {
      return 'health_metrics';
    }
    return 'health_auto_export';
  }
  
  /**
   * Categorize a record based on its type and file type
   */
  function categorizeRecord(record, data, fileType) {
    const type = record.type.toLowerCase();
    const value = record.value;
    
    // Categorize workouts
    if (isWorkoutType(type)) {
      data.workouts.push(record);
    }
    // Categorize readiness metrics
    else if (isReadinessType(type)) {
      data.readiness.push(record);
    }
    // Categorize sleep data
    else if (isSleepType(type)) {
      data.sleep.push(record);
    }
    // Categorize general health metrics
    else if (isHealthMetricType(type)) {
      data.metrics.push(record);
    }
    // Default: add to metrics
    else {
      data.metrics.push(record);
    }
  }
  
  /**
   * Check if a record type is a workout
   */
  function isWorkoutType(type) {
    const workoutTypes = [
      'workout', 'running', 'cycling', 'swimming', 'walking', 'hiking',
      'strength training', 'yoga', 'pilates', 'rowing', 'elliptical',
      'stair stepper', 'high intensity interval training', 'core training',
      'flexibility', 'sports', 'dance', 'martial arts', 'climbing',
      'skating', 'skiing', 'snowboarding', 'surfing', 'paddle sports',
      'outdoor run', 'indoor run', 'outdoor cycle', 'indoor cycle',
      'functional strength training', 'mixed cardio', 'other', 'aerobics',
      'tai chi', 'stair climbing', 'cross training', 'bootcamp', 'interval training',
      'open water swim', 'treadmill', 'indoor walk', 'indoor swim', 'indoor rower',
      'elliptical trainer', 'wheelchair walk pace', 'wheelchair run pace',
      'hand cycling', 'hockey', 'soccer', 'basketball', 'tennis', 'golf', 'boxing',
      'rugby', 'lacrosse', 'cricket', 'volleyball', 'table tennis', 'badminton',
      'baseball', 'softball', 'football', 'fencing', 'wrestling', 'karate', 'judo',
      'taekwondo', 'sailing', 'canoeing', 'kayaking', 'rowing machine', 'skateboarding',
      'snow sports', 'ice skating', 'roller skating', 'jump rope', 'climbing stairs',
      'mountain biking', 'triathlon', 'duathlon', 'biathlon', 'multisport', 'parkrun'
    ];
    return workoutTypes.some(workoutType => type.includes(workoutType));
  }
  
  /**
   * Check if a record type is a readiness metric
   */
  function isReadinessType(type) {
    const readinessTypes = [
      'heart rate variability', 'hrv', 'resting heart rate', 'vo2 max',
      'respiratory rate', 'oxygen saturation', 'blood pressure',
      'body temperature', 'basal energy burned', 'active energy',
      'apple move time', 'exercise minutes', 'stand hours'
    ];
    
    return readinessTypes.some(readinessType => type.includes(readinessType));
  }
  
  /**
   * Check if a record type is sleep data
   */
  function isSleepType(type) {
    const sleepTypes = [
      'sleep', 'sleep analysis', 'sleep stages', 'bedtime', 'wake time',
      'sleep duration', 'sleep efficiency', 'deep sleep', 'rem sleep',
      'core sleep', 'light sleep'
    ];
    
    return sleepTypes.some(sleepType => type.includes(sleepType));
  }
  
  /**
   * Check if a record type is a health metric
   */
  function isHealthMetricType(type) {
    const healthMetricTypes = [
      'steps', 'distance', 'flights climbed', 'active energy',
      'apple move time', 'exercise minutes', 'stand hours',
      'weight', 'body fat percentage', 'body mass index',
      'blood glucose', 'blood pressure', 'heart rate',
      'respiratory rate', 'oxygen saturation', 'body temperature',
      'basal energy burned', 'dietary energy', 'dietary protein',
      'dietary carbohydrates', 'dietary fat', 'dietary fiber',
      'dietary sugar', 'dietary sodium', 'dietary cholesterol',
      'water intake', 'caffeine', 'alcohol', 'mindful minutes',
      'headphone audio exposures', 'environmental audio exposures'
    ];
    
    return healthMetricTypes.some(metricType => type.includes(metricType));
  }
  
  /**
   * Parse CSV line (handles quoted values)
   */
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  /**
   * Update Google Sheets with processed data
   */
  function updateGoogleSheets(data) {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Update workouts
    if (data.workouts.length > 0) {
      updateSheet(spreadsheet, CONFIG.SHEETS.WORKOUTS, data.workouts, [
        'Date', 'Exercise', 'Sets', 'Reps', 'Weight', 'Duration', 'Distance', 'Pace', 'Notes'
      ]);
    }
    
    // Update workout metadata
    if (data.workoutMetadata.length > 0) {
      updateSheet(spreadsheet, CONFIG.SHEETS.WORKOUT_METADATA, data.workoutMetadata, [
        'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
      ]);
    }
    
    // Update readiness
    if (data.readiness.length > 0) {
      updateSheet(spreadsheet, CONFIG.SHEETS.READINESS, data.readiness, [
        'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
      ]);
    }
    
    // Update metrics
    if (data.metrics.length > 0) {
      updateSheet(spreadsheet, CONFIG.SHEETS.METRICS, data.metrics, [
        'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
      ]);
    }
    
    // Update sleep
    if (data.sleep.length > 0) {
      updateSheet(spreadsheet, CONFIG.SHEETS.SLEEP, data.sleep, [
        'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
      ]);
    }
  }
  
  /**
   * Update a specific sheet with data
   */
  function updateSheet(spreadsheet, sheetName, data, headers) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow(headers);
    }
    
    // Add new data
    data.forEach(record => {
      sheet.appendRow([
        record.date,
        record.type,
        record.value,
        record.unit,
        record.source,
        record.notes,
        record.fileType,
        new Date().toISOString() // Timestamp
      ]);
    });
  }
  
  /**
   * Mark a file as processed
   */
  function markFileAsProcessed(file) {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let processedSheet = spreadsheet.getSheetByName('ProcessedFiles');
    
    if (!processedSheet) {
      processedSheet = spreadsheet.insertSheet('ProcessedFiles');
      processedSheet.appendRow(['FileName', 'ProcessedDate', 'FileId', 'FileSize']);
    }
    
    processedSheet.appendRow([
      file.getName(),
      new Date().toISOString(),
      file.getId(),
      file.getSize()
    ]);
  }
  
  /**
   * Manual trigger function for testing
   */
  function testProcessing() {
    console.log('Running test processing...');
    processHealthAutoExport();
  }
  
  /**
   * Setup function to create initial spreadsheet structure
   */
  function setupSpreadsheet() {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Create sheets if they don't exist
    const sheets = Object.values(CONFIG.SHEETS);
    sheets.forEach(sheetName => {
      if (!spreadsheet.getSheetByName(sheetName)) {
        const sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(['Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp']);
      }
    });
    
    // Create processed files sheet
    if (!spreadsheet.getSheetByName('ProcessedFiles')) {
      const processedSheet = spreadsheet.insertSheet('ProcessedFiles');
      processedSheet.appendRow(['FileName', 'ProcessedDate', 'FileId', 'FileSize']);
    }
    
    console.log('Spreadsheet setup completed!');
  }
  
  /**
   * Function to manually process a specific file
   */
  function processSpecificFile(fileName) {
    const folder = getHealthExportFolder();
    if (!folder) {
      console.log('Health Auto Export folder not found.');
      return;
    }
    
    const files = folder.getFilesByName(fileName);
    if (files.hasNext()) {
      const file = files.next();
      console.log(`Manually processing: ${file.getName()}`);
      const processedData = processExportFile(file);
      updateGoogleSheets(processedData);
      markFileAsProcessed(file);
      console.log('Manual processing completed!');
    } else {
      console.log(`File ${fileName} not found.`);
    }
  }
  
  /**
   * Process workout metadata with proper intervals
   */
  function processWorkoutMetadata(workouts, rawContent) {
    const metadata = [];
    
    workouts.forEach(workout => {
      const workoutDate = new Date(workout.date);
      const workoutType = workout.type.toLowerCase();
      
      // Extract metadata based on workout type
      const workoutMetadata = extractWorkoutMetadata(workout, rawContent, workoutDate);
      
      if (workoutMetadata) {
        metadata.push(workoutMetadata);
      }
    });
    
    return metadata;
  }
  
  /**
   * Extract metadata for a specific workout
   */
  function extractWorkoutMetadata(workout, rawContent, workoutDate) {
    const lines = rawContent.split('\n');
    const workoutType = workout.type.toLowerCase();
    
    // Find all data points for this workout
    const workoutData = [];
    
    for (const line of lines) {
      if (line.includes(workout.date) && line.includes(workout.type)) {
        const columns = parseCSVLine(line);
        if (columns.length >= 6) {
          workoutData.push({
            timestamp: columns[0],
            type: columns[1],
            value: parseFloat(columns[2]) || 0,
            unit: columns[3] || '',
            source: columns[4] || '',
            notes: columns[5] || ''
          });
        }
      }
    }
    
    if (workoutData.length === 0) return null;
    
    // Aggregate metadata based on workout type
    const metadata = {
      workoutId: generateWorkoutId(workout),
      date: workout.date,
      type: workout.type,
      duration: extractDuration(workoutData),
      distance: extractDistance(workoutData),
      calories: extractCalories(workoutData),
      heartRate: extractHeartRateData(workoutData),
      pace: extractPaceData(workoutData, workoutType),
      power: extractPowerData(workoutData, workoutType),
      cadence: extractCadenceData(workoutData, workoutType),
      elevation: extractElevationData(workoutData),
      intervals: extractIntervalData(workoutData),
      weather: extractWeatherData(workoutData),
      timestamp: new Date().toISOString()
    };
    
    return metadata;
  }
  
  /**
   * Extract duration from workout data
   */
  function extractDuration(workoutData) {
    const durationData = workoutData.find(d => 
      d.type.toLowerCase().includes('duration') || 
      d.type.toLowerCase().includes('time')
    );
    
    return durationData ? {
      value: durationData.value,
      unit: durationData.unit,
      formatted: formatDuration(durationData.value, durationData.unit)
    } : null;
  }
  
  /**
   * Extract distance from workout data
   */
  function extractDistance(workoutData) {
    const distanceData = workoutData.find(d => 
      d.type.toLowerCase().includes('distance') || 
      d.type.toLowerCase().includes('length')
    );
    
    return distanceData ? {
      value: distanceData.value,
      unit: distanceData.unit,
      formatted: formatDistance(distanceData.value, distanceData.unit)
    } : null;
  }
  
  /**
   * Extract calories from workout data
   */
  function extractCalories(workoutData) {
    const activeCalories = workoutData.find(d => 
      d.type.toLowerCase().includes('active calories') ||
      d.type.toLowerCase().includes('calories burned')
    );
    
    const totalCalories = workoutData.find(d => 
      d.type.toLowerCase().includes('total calories')
    );
    
    return {
      active: activeCalories ? activeCalories.value : 0,
      total: totalCalories ? totalCalories.value : (activeCalories ? activeCalories.value : 0)
    };
  }
  
  /**
   * Extract heart rate data with intervals
   */
  function extractHeartRateData(workoutData) {
    const hrData = workoutData.filter(d => 
      d.type.toLowerCase().includes('heart rate') ||
      d.type.toLowerCase().includes('hr')
    );
    
    if (hrData.length === 0) return null;
    
    const values = hrData.map(d => d.value).filter(v => v > 0);
    
    return {
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      intervals: aggregateIntervals(hrData, CONFIG.METADATA_INTERVALS.HEART_RATE),
      zones: calculateHeartRateZones(values)
    };
  }
  
  /**
   * Extract pace/speed data
   */
  function extractPaceData(workoutData, workoutType) {
    const paceData = workoutData.filter(d => 
      d.type.toLowerCase().includes('pace') ||
      d.type.toLowerCase().includes('speed')
    );
    
    if (paceData.length === 0) return null;
    
    const values = paceData.map(d => d.value).filter(v => v > 0);
    
    return {
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      unit: paceData[0]?.unit || '',
      intervals: aggregateIntervals(paceData, CONFIG.METADATA_INTERVALS.PACE_SPEED)
    };
  }
  
  /**
   * Extract power data (for cycling)
   */
  function extractPowerData(workoutData, workoutType) {
    if (!workoutType.includes('cycling') && !workoutType.includes('bike')) {
      return null;
    }
    
    const powerData = workoutData.filter(d => 
      d.type.toLowerCase().includes('power') ||
      d.type.toLowerCase().includes('watts')
    );
    
    if (powerData.length === 0) return null;
    
    const values = powerData.map(d => d.value).filter(v => v > 0);
    
    return {
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      normalized: calculateNormalizedPower(values),
      intervals: aggregateIntervals(powerData, CONFIG.METADATA_INTERVALS.POWER_CADENCE)
    };
  }
  
  /**
   * Extract cadence data
   */
  function extractCadenceData(workoutData, workoutType) {
    const cadenceData = workoutData.filter(d => 
      d.type.toLowerCase().includes('cadence') ||
      d.type.toLowerCase().includes('rpm') ||
      d.type.toLowerCase().includes('spm')
    );
    
    if (cadenceData.length === 0) return null;
    
    const values = cadenceData.map(d => d.value).filter(v => v > 0);
    
    return {
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      unit: workoutType.includes('cycling') ? 'rpm' : 'spm',
      intervals: aggregateIntervals(cadenceData, CONFIG.METADATA_INTERVALS.POWER_CADENCE)
    };
  }
  
  /**
   * Extract elevation data
   */
  function extractElevationData(workoutData) {
    const elevationData = workoutData.filter(d => 
      d.type.toLowerCase().includes('elevation') ||
      d.type.toLowerCase().includes('altitude')
    );
    
    if (elevationData.length === 0) return null;
    
    const values = elevationData.map(d => d.value).filter(v => v !== 0);
    
    return {
      gain: values.length > 0 ? Math.max(...values) - Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      intervals: aggregateIntervals(elevationData, CONFIG.METADATA_INTERVALS.ELEVATION)
    };
  }
  
  /**
   * Extract interval data
   */
  function extractIntervalData(workoutData) {
    const intervalData = workoutData.filter(d => 
      d.type.toLowerCase().includes('interval') ||
      d.type.toLowerCase().includes('lap')
    );
    
    if (intervalData.length === 0) return null;
    
    return {
      count: intervalData.length,
      data: intervalData.map(d => ({
        type: d.type,
        value: d.value,
        unit: d.unit,
        notes: d.notes
      }))
    };
  }
  
  /**
   * Extract weather data
   */
  function extractWeatherData(workoutData) {
    const weatherData = workoutData.find(d => 
      d.type.toLowerCase().includes('weather') ||
      d.type.toLowerCase().includes('temperature')
    );
    
    return weatherData ? {
      temperature: weatherData.value,
      unit: weatherData.unit,
      description: weatherData.notes
    } : null;
  }
  
  /**
   * Aggregate data into intervals
   */
  function aggregateIntervals(data, intervalMinutes) {
    if (data.length === 0) return [];
    
    const intervals = [];
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Group data by time intervals
    const grouped = {};
    
    data.forEach(point => {
      const timestamp = new Date(point.timestamp);
      const intervalStart = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
      const key = intervalStart.toISOString();
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(point.value);
    });
    
    // Calculate averages for each interval
    Object.keys(grouped).forEach(key => {
      const values = grouped[key].filter(v => v > 0);
      if (values.length > 0) {
        intervals.push({
          timestamp: key,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          count: values.length
        });
      }
    });
    
    return intervals.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  
  /**
   * Calculate heart rate zones
   */
  function calculateHeartRateZones(hrValues) {
    if (hrValues.length === 0) return null;
    
    // Simple zone calculation (you can customize based on your max HR)
    const maxHR = Math.max(...hrValues);
    const zones = {
      zone1: hrValues.filter(hr => hr < maxHR * 0.6).length,
      zone2: hrValues.filter(hr => hr >= maxHR * 0.6 && hr < maxHR * 0.7).length,
      zone3: hrValues.filter(hr => hr >= maxHR * 0.7 && hr < maxHR * 0.8).length,
      zone4: hrValues.filter(hr => hr >= maxHR * 0.8 && hr < maxHR * 0.9).length,
      zone5: hrValues.filter(hr => hr >= maxHR * 0.9).length
    };
    
    return zones;
  }
  
  /**
   * Calculate normalized power (for cycling)
   */
  function calculateNormalizedPower(powerValues) {
    if (powerValues.length === 0) return 0;
    
    // Simple NP calculation (30-second rolling average, then 4th power average)
    const rollingAverages = [];
    const windowSize = Math.min(30, powerValues.length);
    
    for (let i = windowSize - 1; i < powerValues.length; i++) {
      const window = powerValues.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      rollingAverages.push(avg);
    }
    
    if (rollingAverages.length === 0) return 0;
    
    // 4th power average
    const fourthPowerSum = rollingAverages.reduce((sum, power) => sum + Math.pow(power, 4), 0);
    return Math.pow(fourthPowerSum / rollingAverages.length, 0.25);
  }
  
  /**
   * Generate unique workout ID
   */
  function generateWorkoutId(workout) {
    return `${workout.type}_${workout.date.replace(/[^0-9]/g, '')}_${Date.now()}`;
  }
  
  /**
   * Format duration
   */
  function formatDuration(value, unit) {
    if (unit === 'seconds' || unit === 's') {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = value % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${value} ${unit}`;
  }
  
  /**
   * Format distance
   */
  function formatDistance(value, unit) {
    if (unit === 'meters' || unit === 'm') {
      return `${(value / 1000).toFixed(2)} km`;
    }
    return `${value} ${unit}`;
  }
  
  /**
   * Debug function to find where Health Auto Export files are being saved
   */
  function debugFindHealthExportFiles() {
    console.log('=== DEBUG: Finding Health Auto Export Files ===');
    
    // Search for recent CSV files in Google Drive
    const files = DriveApp.getFiles();
    const csvFiles = [];
    const recentFiles = [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      const fileDate = file.getLastUpdated();
      
      // Check if it's a CSV file with health export naming
      if (fileName.toLowerCase().includes('.csv') && 
          (fileName.toLowerCase().includes('health') || 
           fileName.toLowerCase().includes('workout') ||
           fileName.toLowerCase().includes('export'))) {
        
        csvFiles.push({
          name: fileName,
          id: file.getId(),
          date: fileDate,
          folder: getParentFolderName(file),
          url: file.getUrl()
        });
        
        // Check if it's recent (within last week)
        if (fileDate > oneWeekAgo) {
          recentFiles.push({
            name: fileName,
            id: file.getId(),
            date: fileDate,
            folder: getParentFolderName(file),
            url: file.getUrl()
          });
        }
      }
    }
    
    console.log(`Found ${csvFiles.length} total CSV files with health/workout/export in name`);
    console.log(`Found ${recentFiles.length} recent CSV files (last 7 days)`);
    
    if (recentFiles.length > 0) {
      console.log('\n=== RECENT FILES (Last 7 Days) ===');
      recentFiles.forEach((file, index) => {
        console.log(`${index + 1}. "${file.name}"`);
        console.log(`   Folder: "${file.folder}"`);
        console.log(`   Date: ${file.date}`);
        console.log(`   URL: ${file.url}`);
        console.log('');
      });
    }
    
    // Check specific folders
    console.log('\n=== CHECKING SPECIFIC FOLDERS ===');
    const targetFolders = ['Health Auto Export', 'Health Data', 'Apple Health', 'Fitness Data'];
    
    targetFolders.forEach(folderName => {
      try {
        const folders = DriveApp.getFoldersByName(folderName);
        if (folders.hasNext()) {
          const folder = folders.next();
          const folderFiles = folder.getFiles();
          let fileCount = 0;
          
          while (folderFiles.hasNext()) {
            const file = folderFiles.next();
            if (file.getName().toLowerCase().includes('.csv')) {
              fileCount++;
            }
          }
          
          console.log(`✅ Folder "${folderName}": ${fileCount} CSV files`);
        } else {
          console.log(`❌ Folder "${folderName}": Not found`);
        }
      } catch (error) {
        console.log(`❌ Error checking folder "${folderName}": ${error}`);
      }
    });
    
    return {
      totalFiles: csvFiles.length,
      recentFiles: recentFiles.length,
      recentFileDetails: recentFiles
    };
  }
  
  /**
   * Get the name of the parent folder for a file
   */
  function getParentFolderName(file) {
    try {
      const parents = file.getParents();
      if (parents.hasNext()) {
        return parents.next().getName();
      }
      return 'Root';
    } catch (error) {
      return 'Unknown';
    }
  }
  
  /**
   * List all folders in Google Drive (for debugging)
   */
  function listAllFolders() {
    console.log('=== ALL FOLDERS IN GOOGLE DRIVE ===');
    const folders = DriveApp.getFolders();
    let count = 0;
    
    while (folders.hasNext() && count < 100) {
      const folder = folders.next();
      console.log(`${count + 1}. "${folder.getName()}" (ID: ${folder.getId()})`);
      count++;
    }
    
    if (count >= 100) {
      console.log('... and more folders (showing first 100)');
    }
    
    return count;
  }
  
  /**
   * Manual function to process files from a specific folder
   */
  function processFilesFromFolder(folderName) {
    console.log(`Processing files from folder: "${folderName}"`);
    
    try {
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        const folder = folders.next();
        const files = folder.getFiles();
        let processedCount = 0;
        
        while (files.hasNext()) {
          const file = files.next();
          const fileName = file.getName();
          
          if (fileName.toLowerCase().includes('.csv')) {
            console.log(`Processing: ${fileName}`);
            try {
              processExportFile(file);
              processedCount++;
            } catch (error) {
              console.error(`Error processing ${fileName}:`, error);
            }
          }
        }
        
        console.log(`Successfully processed ${processedCount} files from "${folderName}"`);
        return processedCount;
      } else {
        console.error(`Folder "${folderName}" not found`);
        return 0;
      }
    } catch (error) {
      console.error(`Error processing folder "${folderName}":`, error);
      return 0;
    }
  }
  
  /**
   * Get the folder for a given type
   */
  function getExportFolder(folderType) {
    if (folderType === 'workouts') {
      const folder = getSubfolder('Health Auto Export', 'Workouts');
      if (folder) {
        Logger.log('Found folder: Health Auto Export/Workouts');
        return folder;
      }
      Logger.log('ERROR: Folder not found: Health Auto Export/Workouts');
      throw new Error('Folder not found: Health Auto Export/Workouts');
    } else if (folderType === 'metrics') {
      const folder = getSubfolder('Health Auto Export', 'Metrics');
      if (folder) {
        Logger.log('Found folder: Health Auto Export/Metrics');
        return folder;
      }
      Logger.log('ERROR: Folder not found: Health Auto Export/Metrics');
      throw new Error('Folder not found: Health Auto Export/Metrics');
    } else {
      throw new Error('Unknown folder type: ' + folderType);
    }
  }
  
  /**
   * Process all files in both folders using exact file name patterns
   */
  function processAllExportFolders() {
    Logger.log('--- Processing Workouts Folder ---');
    const workoutsFolder = getExportFolder('workouts');
    Logger.log('Workouts folder obtained');
    const workoutFiles = workoutsFolder.getFiles();
    while (workoutFiles.hasNext()) {
      const file = workoutFiles.next();
      Logger.log('Found file in workouts folder: "' + file.getName() + '"');
      if (FILE_NAME_PATTERNS.WORKOUTS.test(file.getName())) {
        Logger.log('Processing workouts file: "' + file.getName() + '"');
        processAndUpdateSheets(file, 'workouts');
      }
    }
  
    Logger.log('--- Processing Metrics Folder ---');
    const metricsFolder = getExportFolder('metrics');
    Logger.log('Metrics folder obtained');
    const metricsFiles = metricsFolder.getFiles();
    while (metricsFiles.hasNext()) {
      const file = metricsFiles.next();
      Logger.log('Found file in metrics folder: "' + file.getName() + '"');
      if (FILE_NAME_PATTERNS.METRICS.test(file.getName())) {
        Logger.log('Processing metrics file: "' + file.getName() + '"');
        processAndUpdateSheets(file, 'metrics');
      }
    }
  }
  
  /**
   * Process a file and update the correct sheets
   */
  function processAndUpdateSheets(file, folderType) {
    const data = processExportFile(file);
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
    if (folderType === 'workouts') {
      if (data.workouts.length > 0) {
        updateSheet(spreadsheet, CONFIG.SHEETS.WORKOUTS, data.workouts, [
          'Date', 'Exercise', 'Sets', 'Reps', 'Weight', 'Duration', 'Distance', 'Pace', 'Notes'
        ]);
      }
      if (data.workoutMetadata.length > 0) {
        updateSheet(spreadsheet, CONFIG.SHEETS.WORKOUT_METADATA, data.workoutMetadata, [
          'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
        ]);
      }
    } else if (folderType === 'metrics') {
      if (data.metrics.length > 0) {
        updateSheet(spreadsheet, CONFIG.SHEETS.METRICS, data.metrics, [
          'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
        ]);
      }
      if (data.readiness.length > 0) {
        updateSheet(spreadsheet, CONFIG.SHEETS.READINESS, data.readiness, [
          'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
        ]);
      }
      if (data.sleep.length > 0) {
        updateSheet(spreadsheet, CONFIG.SHEETS.SLEEP, data.sleep, [
          'Date', 'Type', 'Value', 'Unit', 'Source', 'Notes', 'FileType', 'Timestamp'
        ]);
      }
    }
  }
  
  /**
   * Add this function for wide-format workouts CSV
   */
  function parseWideWorkoutsCSV(content) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const workoutType = cols[0] ? cols[0].trim() : '';
      const date = cols[1] ? cols[1].trim() : '';
      // Start at index 3 to include Duration column; numeric check will skip non-numeric duration automatically
      for (let j = 3; j < headers.length; j++) {
        const value = cols[j] ? cols[j].trim() : '';
        if (value !== '' && !isNaN(parseFloat(value))) {
          records.push({
            date: date,
            type: headers[j],
            value: value,
            unit: '',
            source: 'Health Auto Export',
            notes: '',
            fileType: 'workouts'
          });
        }
      }
    }
    return records;
  }
  
  /**
   * Add this function near the top-level helpers
   */
  function parseWideMetricsCSV(content) {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const date = cols[0].trim();
      for (let j = 1; j < headers.length; j++) {
        const value = cols[j] ? cols[j].trim() : '';
        if (value !== '' && !isNaN(parseFloat(value))) {
          records.push({
            date: date,
            type: headers[j],
            value: value,
            unit: '',
            source: 'Health Auto Export',
            notes: '',
            fileType: 'health_metrics'
          });
        }
      }
    }
    return records;
  } 
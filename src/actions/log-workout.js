const GoogleSheets = require('../integrations/google-sheets');

/**
 * Append one workout entry (run, bike, swim, etc.) to the Workouts tab in Google Sheets.
 * @param {Object} params
 * @param {string} params.date – ISO yyyy-mm-dd or today
 * @param {string} params.type – Activity type (e.g. Run, Bike)
 * @param {number} [params.duration] – minutes
 * @param {number} [params.distance] – kilometers
 * @param {number} [params.calories]
 * @param {number} [params.sets]
 * @param {number} [params.weight]
 * @param {number} [params.reps]
 * @param {string} [params.notes]
 */
module.exports = async function logWorkout(params = {}) {
  const required = ['date', 'type'];
  for (const f of required) {
    if (params[f] === undefined || params[f] === null || params[f] === '') {
      throw new Error(`Missing required field: ${f}`);
    }
  }

  const gs = new GoogleSheets();
  await gs.initialize();

  // Build detail object (lowercase keys for easier mapping)
  const workoutDetail = {
    id: '',
    date: params.date,
    exercise: params.type, // existing sheet uses 'Exercise' header
    type: params.type,
    duration: params.duration || '',
    distance: params.distance || '',
    calories: params.calories || '',
    source: 'ChatGPT',
    sets: params.sets || '',
    weight: params.weight || '',
    reps: params.reps || '',
    notes: params.notes || ''
  };

  // Fetch current headers from the Workouts sheet to ensure correct column order
  const sheetData = await gs.readData('Workouts', 'Workouts!1:1');
  const headers = sheetData[0].map(h => (h || '').toString());

  // Fallback: if headers are missing, create them (legacy sheets)
  if (!headers || headers.length === 0) {
    await gs.appendData('Workouts', [gs.getWorkoutHeaders()]);
  }

  // Helper to convert numeric minutes to duration string "0h:MMm:00s"
  const minutesToDuration = (mins) => {
    if (!mins) return '';
    const m = parseFloat(mins);
    if (isNaN(m)) return mins.toString();
    const h = Math.floor(m / 60);
    const rem = Math.round(m % 60);
    return `${h}h:${String(rem).padStart(2, '0')}m:00s`;
  };

  // Helper to convert kilometers to miles
  const kmToMiles = (km) => {
    if (!km) return '';
    const k = parseFloat(km);
    if (isNaN(k)) return km.toString();
    return (k * 0.621371).toFixed(2); // Convert km to miles
  };

  // Build row in header order
  const row = headers.map(h => {
    const key = h.toLowerCase();
    switch (key) {
      case 'id':
        return workoutDetail.id;
      case 'date':
        return workoutDetail.date;
      case 'exercise':
      case 'type':
        return workoutDetail.exercise || workoutDetail.type;
      case 'duration':
      case 'total time':
        return minutesToDuration(workoutDetail.duration);
      case 'moving time':
        return minutesToDuration(workoutDetail.duration);
      case 'elapsed time':
        return minutesToDuration(workoutDetail.duration);
              case 'distance':
          return kmToMiles(workoutDetail.distance);
      case 'calories':
      case 'active calories':
        return workoutDetail.calories;
      case 'source':
        return workoutDetail.source;
      case 'sets':
        return workoutDetail.sets;
      case 'weight':
        return workoutDetail.weight;
      case 'reps':
        return workoutDetail.reps;
      case 'pace':
        return '';
      case 'notes':
        return workoutDetail.notes;
      case 'createdat':
        return new Date().toISOString();
      case 'updatedat':
        return new Date().toISOString();
      default:
        return '';
    }
  });

  // Prepend the new workout at the top of the sheet (below headers)
  await gs.prependRowToSheet(gs.spreadsheetId, 'Workouts', row);

  // --- New: Also log to sport-specific tab if applicable ---
  // Map type to tab name and header function
  const typeToTab = {
    running: { tab: 'Running', getHeaders: gs.getWorkoutHeaders.bind(gs) },
    cycling: { tab: 'Cycling', getHeaders: gs.getWorkoutHeaders.bind(gs) },
    swimming: { tab: 'Swimming', getHeaders: gs.getWorkoutHeaders.bind(gs) },
    walking: { tab: 'Walking', getHeaders: gs.getWorkoutHeaders.bind(gs) }
    // strength excluded
  };
  
  // Normalize type and find matching sport
  const typeKey = (params.type || '').toLowerCase();
  console.log('🔍 Debug: workout type =', params.type, 'normalized =', typeKey);
  console.log('🔍 Available sport keys:', Object.keys(typeToTab));
  
  // Find matching sport tab
  let matchedSport = null;
  for (const sportKey in typeToTab) {
    // Check if the sport name appears anywhere in the type (case insensitive)
    const includesCheck = typeKey.includes(sportKey);
    console.log(`🔍 Checking "${sportKey}" in "${typeKey}": ${includesCheck}`);
    if (includesCheck) {
      matchedSport = sportKey;
      console.log('✅ Matched sport:', sportKey, 'for type:', params.type);
      break;
    }
  }
  
  if (matchedSport) {
    const { tab, getHeaders } = typeToTab[matchedSport];
    console.log('✅ Logging to sport tab:', tab);
    
    // Ensure tab exists with correct headers
    await gs.createSheetIfNotExists(tab, getHeaders());
    
    // Build row for this tab
    const tabHeaders = await gs.readData(tab, `${tab}!1:1`).then(h => h[0] || getHeaders());
    const tabRow = tabHeaders.map(h => {
      const k = h.toLowerCase();
      switch (k) {
        case 'id':
          return workoutDetail.id;
        case 'date':
          return workoutDetail.date;
        case 'exercise':
        case 'type':
          return workoutDetail.exercise || workoutDetail.type;
        case 'duration':
        case 'total time':
          return minutesToDuration(workoutDetail.duration);
        case 'moving time':
          return minutesToDuration(workoutDetail.duration);
        case 'elapsed time':
          return minutesToDuration(workoutDetail.duration);
        case 'distance':
          return kmToMiles(workoutDetail.distance);
        case 'calories':
        case 'active calories':
          return workoutDetail.calories;
        case 'source':
          return workoutDetail.source;
        case 'sets':
          return workoutDetail.sets;
        case 'weight':
          return workoutDetail.weight;
        case 'reps':
          return workoutDetail.reps;
        case 'pace':
          return '';
        case 'notes':
          return workoutDetail.notes;
        case 'createdat':
          return new Date().toISOString();
        case 'updatedat':
          return new Date().toISOString();
        case 'setnumber':
          return '';
        case 'rpe':
          return '';
        default:
          return '';
      }
    });
    await gs.prependRowToSheet(gs.spreadsheetId, tab, tabRow);
    console.log('✅ Successfully logged to sport tab:', tab);
  } else {
    console.log('ℹ️  No sport-specific tab matched for type:', params.type);
  }
  // --- End new logic ---

  return { status: 'ok', stored: workoutDetail };
}; 
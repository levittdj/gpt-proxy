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
        return workoutDetail.distance;
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

  await gs.appendData('Workouts', [row]);
  return { status: 'ok', stored: workoutDetail };
}; 
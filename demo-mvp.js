const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const GoogleSheetsIntegration = require('./src/integrations/google-sheets');

// Very light argument parsing (avoid extra deps)
const args = process.argv.slice(2);
const addMissedIdx = args.indexOf('--add-missed');
const addStrengthIdx = args.indexOf('--add-strength');
let missedWorkoutRow = null;
let strengthSet = null;
let missedWorkoutObj = null;
if (addMissedIdx !== -1 && args[addMissedIdx + 1]) {
  try {
    // Expect JSON array OR object
    const parsed = JSON.parse(args[addMissedIdx + 1]);
    if (Array.isArray(parsed)) {
      missedWorkoutRow = parsed;
    } else if (typeof parsed === 'object') {
      missedWorkoutObj = parsed;
    } else {
      throw new Error('Argument to --add-missed must be JSON array or object');
    }
  } catch (err) {
    console.error('Failed to parse --add-missed value:', err.message);
    process.exit(1);
  }
}

if (addStrengthIdx !== -1 && args[addStrengthIdx + 1]) {
  try {
    strengthSet = JSON.parse(args[addStrengthIdx + 1]);
    if (typeof strengthSet !== 'object' || Array.isArray(strengthSet)) {
      throw new Error('Argument to --add-strength must be a JSON object');
    }
  } catch (err) {
    console.error('Failed to parse --add-strength value:', err.message);
    process.exit(1);
  }
}

(async () => {
  const sheets = new GoogleSheetsIntegration();
  await sheets.initialize();

  const WORKOUTS_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const METRICS_ID = process.env.GOOGLE_METRICS_SPREADSHEET_ID;

  const SOURCES = [
    { id: WORKOUTS_ID, tab: 'Workouts' },
    { id: METRICS_ID,  tab: 'Daily Metrics' },
    { id: METRICS_ID,  tab: 'Sleep' }
  ];

  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  console.log('📊 Daily Summary (' + todayISO + ')');

  for (const src of SOURCES) {
    if (!src.id) {
      console.log(`• ${src.tab}: skipped (no sheet ID set)`);
      continue;
    }
    try {
      const rows = await sheets.readDataFromSheet(src.id, src.tab);
      if (rows.length === 0) {
        console.log(`• ${src.tab}: no data`);
        continue;
      }
      const header = rows[0].map(h => (h || '').toString());
      const dateCol = header.findIndex(h => h.toLowerCase() === 'date');
      if (dateCol === -1) {
        console.log(`• ${src.tab}: date column not found`);
        continue;
      }
      const todayRows = rows.slice(1).filter(r => r[dateCol] && r[dateCol].toString().startsWith(todayISO));
      console.log(`• ${src.tab}: ${todayRows.length} rows for today`);
    } catch (err) {
      console.error(`Error reading ${src.tab}:`, err.message);
    }
  }

  if (missedWorkoutRow) {
    try {
      await sheets.appendMissedWorkout(missedWorkoutRow);
      console.log('✅ Missed workout appended to HealthFit Workouts sheet.');
    } catch (err) {
      console.error('Failed to append missed workout:', err.message);
    }
  }

  if (missedWorkoutObj) {
    try {
      await sheets.appendMissedWorkoutObject(missedWorkoutObj);
      console.log('✅ Missed workout (object) appended to HealthFit Workouts sheet.');
    } catch (err) {
      console.error('Failed to append missed workout (object):', err.message);
    }
  }

  if (strengthSet) {
    try {
      await sheets.storeStrengthSet(strengthSet);
      console.log('✅ Strength set appended to Strength sheet.');
    } catch (err) {
      console.error('Failed to append strength set:', err.message);
    }
  }
})(); 
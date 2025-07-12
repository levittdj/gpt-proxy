const { parseISO, formatISO, getISOWeek, getISOWeekYear, subDays } = require('date-fns');
const GoogleSheets = require('../integrations/google-sheets');

/**
 * Compute weekly workout trends for the last N weeks.
 * Handles both strength (tonnage) and endurance (distance / duration).
 * @param {number} weeks - number of ISO weeks to include (default 4)
 * @returns {Promise<Object>} summary object
 */
module.exports = async function getWorkoutTrends(weeks = 4) {
  if (weeks <= 0) throw new Error('weeks parameter must be > 0');

  const gs = new GoogleSheets();
  await gs.initialize();

  const endDate = new Date();
  const startDate = subDays(endDate, weeks * 7);

  const workouts = await gs.getWorkouts(startDate, endDate);

  // Also include individual strength sets from the Strength sheet
  try {
    const strengthRows = await gs.readData('Strength');
    const headers = strengthRows[0].map(h => (h || '').toString().toLowerCase());
    const idx = name => headers.indexOf(name);
    const dateCol = idx('date');
    const exerciseCol = idx('exercise');
    const repsCol = idx('reps');
    const weightCol = idx('weight');

    strengthRows.slice(1).forEach(row => {
      const dateStr = row[dateCol];
      if (!dateStr) return;
      const d = parseISO(dateStr.toString().slice(0, 10));
      if (isNaN(d) || d < startDate || d > endDate) return;

      workouts.push({
        date: dateStr.toString().slice(0, 10),
        type: row[exerciseCol] || 'Strength',
        reps: row[repsCol],
        weight: row[weightCol],
        sets: 1
      });
    });
  } catch (err) {
    console.warn('⚠️  Unable to read Strength sheet:', err.message);
  }
  if (!workouts.length) return { weeks: [], progressing: [], stalling: [] };

  // Helper to get week key
  const isoKey = (d) => {
    const year = getISOWeekYear(d);
    const week = String(getISOWeek(d)).padStart(2, '0');
    return `${year}-W${week}`;
  };

  // Aggregate by week and type
  const weekMap = {};
  workouts.forEach(w => {
    const dateObj = parseISO(w.date || w.dateiso || w.date_iso || w.date_iso8601 || w.date_new || w.date_old || w.date);
    if (isNaN(dateObj)) return;

    const weekKey = isoKey(dateObj);
    const type = (w.type || w.exercise || 'Unknown').toString();

    if (!weekMap[weekKey]) weekMap[weekKey] = {};
    if (!weekMap[weekKey][type]) weekMap[weekKey][type] = { distance: 0, duration: 0, tonnage: 0, sessions: 0 };

    const entry = weekMap[weekKey][type];
    entry.sessions += 1;

    // Distance (assumes km if > 0)
    const dist = parseFloat(w.distance || 0);
    if (!isNaN(dist)) entry.distance += dist;

    // Duration (assumes minutes)
    const dur = parseFloat(w.duration || 0);
    if (!isNaN(dur)) entry.duration += dur;

    // Tonnage for strength: Weight * Reps * Sets (default sets=1)
    const weight = parseFloat(w.weight || 0);
    const reps = parseFloat(w.reps || 0);
    const sets = parseFloat(w.sets || 1);
    if (!isNaN(weight) && weight > 0 && !isNaN(reps) && reps > 0) {
      entry.tonnage += weight * reps * (isNaN(sets) || sets === 0 ? 1 : sets);
    }
  });

  // Convert map to sorted array
  const weekKeys = Object.keys(weekMap).sort();
  const weekData = weekKeys.map(k => ({ week: k, metrics: weekMap[k] }));

  // Identify progressing vs stalling per type comparing last week vs previous week
  const progressing = [];
  const stalling = [];
  if (weekData.length >= 2) {
    const last = weekData[weekData.length - 1].metrics;
    const prev = weekData[weekData.length - 2].metrics;

    Object.keys(last).forEach(type => {
      // choose metric priority: tonnage > distance > duration
      const metricLast = last[type].tonnage || last[type].distance || last[type].duration || 0;
      const metricPrev = prev[type] ? (prev[type].tonnage || prev[type].distance || prev[type].duration || 0) : 0;
      if (metricLast > metricPrev) progressing.push(type);
      else stalling.push(type);
    });
  }

  return { weeks: weekData, progressing, stalling };
}; 
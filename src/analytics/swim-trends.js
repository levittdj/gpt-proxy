const { getISOWeek, getISOWeekYear, subDays, parseISO } = require('date-fns');
const GoogleSheets = require('../integrations/google-sheets');

module.exports = async function getSwimTrends(weeks = 4) {
  if (weeks <= 0) throw new Error('weeks parameter must be > 0');

  const gs = new GoogleSheets();
  await gs.initialize();

  const endDate = new Date();
  const startDate = subDays(endDate, weeks * 7);

  const workouts = await gs.getWorkouts(startDate, endDate);
  if (!workouts.length) return { weeks: [], progressing: false };

  const isoKey = (d) => `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;

  const weekMap = {};
  workouts.forEach(w => {
    const type = (w.type || w.exercise || '').toString().toLowerCase();
    if (!type.includes('swim')) return;

    const dateVal = w.date || w['date/time'] || w.timestamp || '';
    if (!dateVal) return;
    const dateObj = parseISO(dateVal.toString().slice(0, 10));
    if (isNaN(dateObj)) return;

    const key = isoKey(dateObj);
    if (!weekMap[key]) weekMap[key] = { distance: 0, duration: 0, sessions: 0 };
    const entry = weekMap[key];

    entry.sessions += 1;
    const dist = parseFloat(w.distance || 0);
    if (!isNaN(dist)) entry.distance += dist;
    const dur = parseFloat(w.duration || 0);
    if (!isNaN(dur)) entry.duration += dur;
  });

  const weeksArr = Object.keys(weekMap).sort().map(k => {
    const d = weekMap[k];
    return {
      week: k,
      distance: d.distance,
      duration: d.duration,
      sessions: d.sessions,
      avgPace: d.distance > 0 ? d.duration / d.distance : null // min per km (or 1000m)
    };
  });

  let progressing = false;
  if (weeksArr.length >= 2) {
    const last = weeksArr[weeksArr.length - 1];
    const prev = weeksArr[weeksArr.length - 2];
    progressing = (last.distance || 0) > (prev.distance || 0);
  }

  return { weeks: weeksArr, progressing };
}; 
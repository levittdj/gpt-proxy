const { getISOWeek, getISOWeekYear, subDays, parseISO } = require('date-fns');
const GoogleSheets = require('../integrations/google-sheets');

/**
 * Compute weekly cycling trends (distance, duration, speed, sessions) for the last N iso weeks.
 * @param {number} weeks - number of weeks to include, default 4
 * @returns {Promise<Object>} { weeks:[{week, distance, duration, sessions, avgSpeed}], progressing:boolean } 
 */
module.exports = async function getCycleTrends(weeks = 4) {
  if (weeks <= 0) throw new Error('weeks parameter must be > 0');

  const gs = new GoogleSheets();
  await gs.initialize();

  const endDate = new Date();
  const startDate = subDays(endDate, weeks * 7);

  const workouts = await gs.getWorkouts(startDate, endDate);
  if (!workouts.length) return { weeks: [], progressing: false };

  // Helper iso week key
  const isoKey = (d) => {
    const year = getISOWeekYear(d);
    const wk = String(getISOWeek(d)).padStart(2, '0');
    return `${year}-W${wk}`;
  };

  const weekMap = {};
  workouts.forEach(w => {
    const type = (w.type || w.exercise || '').toString();
    // Check for various cycling workout types
    const isCycling = type.toLowerCase().includes('cycle') || 
                     type.toLowerCase().includes('cycling') ||
                     type.toLowerCase().includes('bike') ||
                     type.toLowerCase() === 'bike';
    if (!isCycling) return; // skip non-cycling workouts

    // parse date - handle various date formats
    const dateVal = w.date || w['date/time'] || w.timestamp || '';
    if (!dateVal) return;
    
    let dateObj;
    if (typeof dateVal === 'string') {
      // Handle "7/11/2025" format
      if (dateVal.includes('/')) {
        const [month, day, year] = dateVal.split('/');
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Try ISO format
        dateObj = parseISO(dateVal.toString().slice(0, 10));
      }
    } else {
      dateObj = new Date(dateVal);
    }
    
    if (isNaN(dateObj)) return;

    const key = isoKey(dateObj);
    if (!weekMap[key]) weekMap[key] = { distance: 0, duration: 0, sessions: 0 };
    const entry = weekMap[key];

    entry.sessions += 1;
    const dist = parseFloat(w.distance || 0);
    if (!isNaN(dist)) entry.distance += dist; // now stored in miles
    
    // Parse duration from "Total Time" field (format: "0h:19m:19s" or "0:19")
    const timeStr = w['total time'] || w['total time'] || w.duration || '';
    let dur = 0;
    if (timeStr) {
      // Handle "0h:19m:19s" format
      const timeMatch = timeStr.toString().match(/(\d+)h:(\d+)m:(\d+)s/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]) || 0;
        const minutes = parseInt(timeMatch[2]) || 0;
        const seconds = parseInt(timeMatch[3]) || 0;
        dur = hours * 60 + minutes + seconds / 60;
      } else {
        // Handle "0:19" format (hours:minutes)
        const simpleMatch = timeStr.toString().match(/(\d+):(\d+)/);
        if (simpleMatch) {
          const hours = parseInt(simpleMatch[1]) || 0;
          const minutes = parseInt(simpleMatch[2]) || 0;
          dur = hours * 60 + minutes;
        } else {
          // Fallback: try to parse as simple number (minutes)
          dur = parseFloat(timeStr) || 0;
        }
      }
    }
    if (dur > 0) entry.duration += dur;
  });

  const weekKeys = Object.keys(weekMap).sort();
  const weeksArr = weekKeys.map(k => {
    const d = weekMap[k];
    return {
      week: k,
      distance: d.distance,
      distanceUnit: 'miles',
      duration: d.duration,
      durationUnit: 'minutes',
      sessions: d.sessions,
      avgSpeed: d.duration > 0 ? d.distance / (d.duration / 60) : null, // mph
      avgSpeedUnit: 'mph'
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
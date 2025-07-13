const { parseISO, subDays } = require('date-fns');
const uuid = require('crypto').randomUUID;
const GoogleSheets = require('../integrations/google-sheets');

/**
 * Simple readiness calculator based on HRV and sleep hours.
 * Weights: 60% HRV (relative to 14-day baseline), 40% Sleep (vs 8 h).
 */
async function calculateAndStoreReadiness(dateISO) {
  const gs = new GoogleSheets();
  await gs.initialize();

  const workoutsId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const metricsId  = process.env.GOOGLE_METRICS_SPREADSHEET_ID;

  // Fetch Daily Metrics rows (contains HRV, Resting HR, etc.)
  const dailyMetrics = await gs.readDataFromSheet(metricsId, 'Daily Metrics');
  const metricsHeader = dailyMetrics[0].map(h => (h || '').toString().toLowerCase());
  const hrvCol = metricsHeader.indexOf('hrv');
  if (hrvCol === -1) throw new Error('HRV column not found in Daily Metrics');
  const dateColMetrics = metricsHeader.indexOf('date');

  const todayRow = dailyMetrics.find((row, idx) => idx>0 && cellDateISO(row[dateColMetrics])===dateISO);
  if (!todayRow) throw new Error('Today\'s row not found in Daily Metrics');
  const hrvToday = parseFloat(todayRow[hrvCol]);

  // Compute baseline HRV (avg last 14 days excluding today)
  const baselineWindowStart = subDays(parseISO(dateISO), 30).toISOString().slice(0,10);
  const baselineRows = dailyMetrics.filter((row, idx) => {
    if(idx===0) return false;
    const dISO=cellDateISO(row[dateColMetrics]);
    return dISO && dISO<dateISO && dISO>=baselineWindowStart;
  });

  const hrvValues = baselineRows.map(r=>parseFloat(r[hrvCol])).filter(v=>!isNaN(v));
  const hrvMean = hrvValues.reduce((a,b)=>a+b,0)/(hrvValues.length||1);
  const hrvSd = Math.sqrt(hrvValues.reduce((sum,v)=>sum+Math.pow(v-hrvMean,2),0)/(hrvValues.length||1));

  function logisticSub(z,k=0.87){
    return 100/(1+Math.exp(-k*z));
  }

  const hrvZ = hrvSd? (hrvToday-hrvMean)/hrvSd : 0;
  const hrvScore = Math.round(logisticSub(hrvZ));

  // Sleep sheet — parse multiple quality fields
  const sleepRows = await gs.readDataFromSheet(metricsId, 'Sleep');
  const sleepHeader = sleepRows[0].map(h=> (h||'').toString().toLowerCase());
  const col = name => sleepHeader.indexOf(name);
  const sleepTodayRow = sleepRows.find((row,idx)=> idx>0 && cellDateISO(row[col('date')])===dateISO);

  const asleepRaw = sleepTodayRow ? sleepTodayRow[col('asleep')] : 0;
  const inBedRaw = sleepTodayRow ? sleepTodayRow[col('inbed')] : 0;
  const awakeRaw = sleepTodayRow ? sleepTodayRow[col('awake')] : 0;
  const wakeCount = sleepTodayRow ? (sleepTodayRow[col('wake count')] ? parseInt(sleepTodayRow[col('wake count')], 10) : 0) : 0;
  const efficiencyPct = sleepTodayRow ? (sleepTodayRow[col('efficiency')] ? parseFloat(sleepTodayRow[col('efficiency')]) : 0) : 0;

  // HealthFit may export hours already (e.g. 6.75) or minutes (~405). Detect:
  const toHours = val => (val <= 25 ? val : val/60);
  const toMinutes = val => (val <= 25 ? val*60 : val);

  const sleepHours = rawToHours(asleepRaw);
  const inBedHours = rawToHours(inBedRaw);
  const awakeMinutes = Math.round((rawToHours(awakeRaw)||0)*60);

  // Duration component (0-100)
  const durScore = Math.min(1, sleepHours/8) * 100;
  // Efficiency component – if provided, use it; else compute as asleep / inBed.
  const effScore = efficiencyPct ? efficiencyPct : (inBedHours ? (sleepHours/inBedHours)*100 : 0);
  // Awake penalty: subtract 2 points for each full 10 min awake beyond first 10.
  const awakePenalty = Math.max(0, Math.floor((awakeMinutes-10)/10)*2);
  // Wake count penalty: -3 per wake after 2.
  const wakePenalty = Math.max(0, (wakeCount-2)*3);

  // Stats for quantity
  const sleepDurValues = sleepRows.slice(1).map(r=>rawToHours(r[col('asleep')]||0)).filter(v=>!isNaN(v));
  const sleepMean = sleepDurValues.reduce((a,b)=>a+b,0)/(sleepDurValues.length||1);
  const sleepSd = Math.sqrt(sleepDurValues.reduce((s,v)=>s+Math.pow(v-sleepMean,2),0)/(sleepDurValues.length||1));
  const quantityZ = sleepSd? (sleepHours - sleepMean)/sleepSd : 0;
  let quantityScore = logisticSub(quantityZ);
  quantityScore = sleepHours <4 ? 0 : quantityScore;

  // Quality / Fragmentation score based on efficiency minus penalties
  let qualityScore = Math.max(0, effScore - awakePenalty - wakePenalty);

  // Architecture score placeholder (until we have REM/Deep minutes)
  const architectureScore = 50;

  // Physiology score: reuse hrvScore (already 0-100)
  const physiologyScore = hrvScore;

  // Regularity & timing: compute SD of bedtime over last 7 nights (placeholder)
  const startCol = col('start');
  const bedtimes = sleepRows.slice(1).map(r=>r[startCol]).filter(Boolean);
  let regularityScore = 50;
  if (bedtimes.length>3) {
    const times = bedtimes.map(t=>{
      // Parse time in HH:MM format directly
      const [hours, minutes] = t.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        let normalizedHours = hours + minutes/60;
        // Normalize to a consistent reference: if after 12 PM, treat as negative hours from midnight
        // This handles cases like 23:30 (11:30 PM) becoming -0.5 hours
        if (normalizedHours > 12) {
          normalizedHours = normalizedHours - 24;
        }
        return normalizedHours;
      }
      return NaN;
    }).filter(t => !isNaN(t)); // Filter out invalid times
    
    if (times.length > 3) {
      const meanBed = times.reduce((a,b)=>a+b,0)/times.length;
      const sdBed = Math.sqrt(times.reduce((s,v)=>s+Math.pow(v-meanBed,2),0)/times.length);
      regularityScore = Math.max(0, 100 - sdBed*10); // each hour SD deduct 10
      
      // Detailed debug logging
      console.log('DEBUG regularityScore detailed analysis:', {
        originalBedtimes: bedtimes.slice(0, 10), // First 10 bedtimes
        normalizedTimes: times.slice(0, 10), // First 10 normalized times
        totalTimes: times.length,
        meanBedtime: meanBed,
        standardDeviation: sdBed,
        regularityScore: regularityScore,
        calculation: `100 - (${sdBed} * 10) = ${regularityScore}`
      });
    }
  }
  
  // Debug log for regularityScore calculation
  console.log('DEBUG regularityScore calculation:', {
    bedtimes: bedtimes.slice(0, 5), // Show first 5 bedtimes
    bedtimesLength: bedtimes.length,
    regularityScore
  });
  
  // Fallback: if regularityScore is NaN, set to 50
  if (isNaN(regularityScore)) {
    console.log('WARNING: regularityScore is NaN, setting to 50');
    regularityScore = 50;
  }

  // Subjective placeholder
  const subjectiveScore = 50;

  // Debug log for sleepScore components
  console.log('DEBUG sleepScore components:', {
    quantityScore,
    qualityScore,
    architectureScore,
    physiologyScore,
    regularityScore,
    subjectiveScore
  });

  // Combine
  const sleepScore = Math.round(
    0.25*quantityScore +
    0.20*qualityScore +
    0.15*architectureScore +
    0.25*physiologyScore +
    0.10*regularityScore +
    0.05*subjectiveScore
  );

  // Training load component: recent workout duration over past N days
  const loadWindowDays = parseInt(process.env.READINESS_TRAINING_LOAD_DAYS) || 7;
  const dateObj = parseISO(dateISO);
  const loadStartDate = subDays(dateObj, loadWindowDays);
  // Fetch workouts in the load window
  let recentWorkouts = [];
  try {
    recentWorkouts = await gs.getWorkouts(loadStartDate, dateObj);
  } catch (e) {
    console.warn('⚠️  Unable to read workouts for training load:', e.message);
  }
  const totalLoadDuration = recentWorkouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0);
  const targetLoad = loadWindowDays * 60; // target minutes (60 min per day)
  const loadRatio = Math.min(1, totalLoadDuration / targetLoad);
  const trainingLoadScore = Math.round(loadRatio * 100);
  console.log('DEBUG trainingLoadScore components:', { loadWindowDays, totalLoadDuration, targetLoad, trainingLoadScore });

  // Combine HRV, sleep, and training load into final readiness score
  const readinessScore = Math.round(
    0.45 * hrvScore +
    0.45 * sleepScore +
    0.10 * trainingLoadScore
  );

  // Debug log for all calculated values
  console.log('DEBUG calculated values:', {
    readinessScore,
    sleepScore,
    hrvScore,
    hrvMean,
    hrvSd,
    sleepMean,
    sleepSd,
    hrvToday,
    sleepHours,
    wakeCount,
    awakeMinutes
  });

  // Store into Readiness sheet (same workbook)
  const readinessObj = {
    id: uuid(),
    date: new Date(dateISO),
    type: 'daily',
    value: readinessScore,
    unit: 'score',
    source: 'Agent',
    readinessScore: readinessScore,
    hrvMean: hrvMean,
    hrvSd: hrvSd,
    sleepMean: sleepMean,
    sleepSd: sleepSd,
    hrv: hrvToday,
    sleepDuration: isNaN(sleepHours)?0:sleepHours,
    sleepQuality: sleepScore,
    wakeCount: wakeCount,
    awakeMinutes: awakeMinutes,
    trainingLoadScore: trainingLoadScore,
    trainingLoadWindowDays: loadWindowDays,
    notes: ''
  };
  const targetId = process.env.READINESS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  console.log('Readiness object to store:', JSON.stringify(readinessObj, null, 2));
  await gs.storeReadiness(readinessObj, targetId);
  console.log('Readiness stored', readinessScore);
}

function cellDateISO(cell){
  if(typeof cell==='string'){
    if(cell.includes('/')){
      const d=new Date(cell);
      if(!isNaN(d)) return d.toISOString().slice(0,10);
    }
    return cell.slice(0,10);
  }
  if(typeof cell==='number'){
    const ms=(cell-25569)*86400*1000;
    return new Date(ms).toISOString().slice(0,10);
  }
  return '';
}

function hhmmToHours(str){
  const m=str.match(/(\d+)h:(\d+)m/);
  if(!m) return NaN;
  return parseInt(m[1],10)+parseInt(m[2],10)/60;
}

function rawToHours(val){
  if(typeof val==='string'){
    if(val.includes('h:')) return hhmmToHours(val);
    if(val.includes(':')){ // maybe HH:MM
      const [h,m]=val.split(':').map(Number);
      if(!isNaN(h)&&!isNaN(m)) return h+m/60;
    }
    const num=parseFloat(val);
    if(!isNaN(num)) return num<25?num:num/60;
    return NaN;
  }
  if(typeof val==='number') return val>25? val/60 : val;
  return NaN;
}

if (require.main === module) {
  const todayISO = new Date().toISOString().slice(0,10);
  calculateAndStoreReadiness(todayISO).catch(err=>{
    console.error('Readiness calc failed:', err.message);
    process.exit(1);
  });
}

module.exports = { calculateAndStoreReadiness }; 
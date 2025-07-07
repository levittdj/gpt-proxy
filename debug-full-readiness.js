const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Set the correct Health Metrics sheet ID
process.env.GOOGLE_METRICS_SPREADSHEET_ID = '1QCsf4_WoAvkJSZ1woyXvVTs5wkZTfyZDVB2CrCzaMe0';

const GoogleSheets = require('./src/integrations/google-sheets');

async function debugFullReadiness() {
  const gs = new GoogleSheets();
  await gs.initialize();

  const workoutsId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const metricsId = process.env.GOOGLE_METRICS_SPREADSHEET_ID;
  const dateISO = '2025-07-02';

  console.log('=== DEBUGGING READINESS CALCULATION FOR', dateISO, '===');
  console.log('Workouts ID:', workoutsId);
  console.log('Metrics ID:', metricsId);

  try {
    // Check HRV data
    console.log('\n--- HRV DATA ---');
    const dailyMetrics = await gs.readDataFromSheet(metricsId, 'Daily Metrics');
    console.log('Daily Metrics rows:', dailyMetrics.length);
    
    if (dailyMetrics.length > 0) {
      const metricsHeader = dailyMetrics[0].map(h => (h || '').toString().toLowerCase());
      console.log('Metrics header:', metricsHeader);
      
      const hrvCol = metricsHeader.indexOf('hrv');
      const dateColMetrics = metricsHeader.indexOf('date');
      
      console.log('HRV column index:', hrvCol);
      console.log('Date column index:', dateColMetrics);
      
      if (hrvCol === -1) {
        console.log('❌ HRV column not found!');
        return;
      }
      
      const todayRow = dailyMetrics.find((row, idx) => {
        if (idx === 0) return false;
        const dateCell = row[dateColMetrics];
        console.log(`Row ${idx} date:`, dateCell, typeof dateCell);
        return cellDateISO(dateCell) === dateISO;
      });
      
      if (todayRow) {
        console.log('Found today\'s HRV row:', todayRow);
        const hrvToday = parseFloat(todayRow[hrvCol]);
        console.log('HRV today:', hrvToday);
      } else {
        console.log('❌ Today\'s HRV row not found!');
        return;
      }
    }

    // Check Sleep data
    console.log('\n--- SLEEP DATA ---');
    const sleepRows = await gs.readDataFromSheet(metricsId, 'Sleep');
    console.log('Sleep rows:', sleepRows.length);
    
    if (sleepRows.length > 0) {
      const sleepHeader = sleepRows[0].map(h => (h || '').toString().toLowerCase());
      const col = name => sleepHeader.indexOf(name);
      
      const sleepTodayRow = sleepRows.find((row, idx) => {
        if (idx === 0) return false;
        return cellDateISO(row[col('date')]) === dateISO;
      });
      
      if (sleepTodayRow) {
        console.log('Found today\'s sleep row:', sleepTodayRow);
        
        const asleepRaw = sleepTodayRow[col('asleep')];
        const inBedRaw = sleepTodayRow[col('inbed')];
        const awakeRaw = sleepTodayRow[col('awake')];
        const wakeCount = sleepTodayRow[col('wake count')];
        const efficiencyPct = sleepTodayRow[col('efficiency')];
        
        const sleepHours = rawToHours(asleepRaw);
        const inBedHours = rawToHours(inBedRaw);
        const awakeMinutes = Math.round((rawToHours(awakeRaw) || 0) * 60);
        
        console.log('Parsed sleep values:');
        console.log('- sleepHours:', sleepHours);
        console.log('- inBedHours:', inBedHours);
        console.log('- awakeMinutes:', awakeMinutes);
        console.log('- wakeCount:', wakeCount);
        console.log('- efficiencyPct:', efficiencyPct);
      } else {
        console.log('❌ Today\'s sleep row not found!');
        return;
      }
    }

    console.log('\n--- CALCULATION TEST ---');
    
    // Test the actual calculation logic
    const dailyMetrics2 = await gs.readDataFromSheet(metricsId, 'Daily Metrics');
    const metricsHeader2 = dailyMetrics2[0].map(h => (h || '').toString().toLowerCase());
    const hrvCol2 = metricsHeader2.indexOf('hrv');
    const dateColMetrics2 = metricsHeader2.indexOf('date');
    
    const todayRow2 = dailyMetrics2.find((row, idx) => idx > 0 && cellDateISO(row[dateColMetrics2]) === dateISO);
    const hrvToday = parseFloat(todayRow2[hrvCol2]);
    
    // HRV calculation
    const { subDays, parseISO } = require('date-fns');
    const baselineWindowStart = subDays(parseISO(dateISO), 30).toISOString().slice(0, 10);
    const baselineRows = dailyMetrics2.filter((row, idx) => {
      if (idx === 0) return false;
      const dISO = cellDateISO(row[dateColMetrics2]);
      return dISO && dISO < dateISO && dISO >= baselineWindowStart;
    });
    
    const hrvValues = baselineRows.map(r => parseFloat(r[hrvCol2])).filter(v => !isNaN(v));
    const hrvMean = hrvValues.reduce((a, b) => a + b, 0) / (hrvValues.length || 1);
    const hrvSd = Math.sqrt(hrvValues.reduce((sum, v) => sum + Math.pow(v - hrvMean, 2), 0) / (hrvValues.length || 1));
    
    console.log('HRV calculation:');
    console.log('- hrvToday:', hrvToday);
    console.log('- baseline rows:', baselineRows.length);
    console.log('- hrvMean:', hrvMean);
    console.log('- hrvSd:', hrvSd);
    
    function logisticSub(z, k = 0.87) {
      return 100 / (1 + Math.exp(-k * z));
    }
    
    const hrvZ = hrvSd ? (hrvToday - hrvMean) / hrvSd : 0;
    const hrvScore = Math.round(logisticSub(hrvZ));
    
    console.log('- hrvZ:', hrvZ);
    console.log('- hrvScore:', hrvScore);
    
    // Sleep calculation
    const sleepRows2 = await gs.readDataFromSheet(metricsId, 'Sleep');
    const sleepHeader2 = sleepRows2[0].map(h => (h || '').toString().toLowerCase());
    const col2 = name => sleepHeader2.indexOf(name);
    const sleepTodayRow2 = sleepRows2.find((row, idx) => idx > 0 && cellDateISO(row[col2('date')]) === dateISO);
    
    const asleepRaw = sleepTodayRow2 ? parseFloat(sleepTodayRow2[col2('asleep')] || 0) : 0;
    const inBedRaw = sleepTodayRow2 ? parseFloat(sleepTodayRow2[col2('inbed')] || 0) : 0;
    const awakeRaw = sleepTodayRow2 ? parseFloat(sleepTodayRow2[col2('awake')] || 0) : 0;
    const wakeCount = sleepTodayRow2 ? parseInt(sleepTodayRow2[col2('wake count')] || 0, 10) : 0;
    const efficiencyPct = sleepTodayRow2 ? parseFloat(sleepTodayRow2[col2('efficiency')] || 0) : 0;
    
    const sleepHours = rawToHours(asleepRaw);
    const inBedHours = rawToHours(inBedRaw);
    const awakeMinutes = Math.round((rawToHours(awakeRaw) || 0) * 60);
    
    console.log('\nSleep calculation:');
    console.log('- sleepHours:', sleepHours);
    console.log('- inBedHours:', inBedHours);
    console.log('- awakeMinutes:', awakeMinutes);
    console.log('- wakeCount:', wakeCount);
    console.log('- efficiencyPct:', efficiencyPct);
    
    // Duration component
    const durScore = Math.min(1, sleepHours / 8) * 100;
    const effScore = efficiencyPct ? efficiencyPct : (inBedHours ? (sleepHours / inBedHours) * 100 : 0);
    const awakePenalty = Math.max(0, Math.floor((awakeMinutes - 10) / 10) * 2);
    const wakePenalty = Math.max(0, (wakeCount - 2) * 3);
    
    console.log('- durScore:', durScore);
    console.log('- effScore:', effScore);
    console.log('- awakePenalty:', awakePenalty);
    console.log('- wakePenalty:', wakePenalty);
    
    // Sleep stats
    const sleepDurValues = sleepRows2.slice(1).map(r => rawToHours(r[col2('asleep')] || 0)).filter(v => !isNaN(v));
    const sleepMean = sleepDurValues.reduce((a, b) => a + b, 0) / (sleepDurValues.length || 1);
    const sleepSd = Math.sqrt(sleepDurValues.reduce((s, v) => s + Math.pow(v - sleepMean, 2), 0) / (sleepDurValues.length || 1));
    const quantityZ = sleepSd ? (sleepHours - sleepMean) / sleepSd : 0;
    let quantityScore = logisticSub(quantityZ);
    quantityScore = sleepHours < 4 ? 0 : quantityScore;
    
    console.log('- sleepMean:', sleepMean);
    console.log('- sleepSd:', sleepSd);
    console.log('- quantityZ:', quantityZ);
    console.log('- quantityScore:', quantityScore);
    
    // Quality score
    let qualityScore = Math.max(0, effScore - awakePenalty - wakePenalty);
    console.log('- qualityScore:', qualityScore);
    
    // Final scores
    const architectureScore = 50;
    const physiologyScore = hrvScore;
    const regularityScore = 50;
    const subjectiveScore = 50;
    
    const sleepScore = Math.round(
      0.25 * quantityScore +
      0.20 * qualityScore +
      0.15 * architectureScore +
      0.25 * physiologyScore +
      0.10 * regularityScore +
      0.05 * subjectiveScore
    );
    
    const readinessScore = Math.round((0.5 * hrvScore) + (0.5 * sleepScore));
    
    console.log('\nFinal scores:');
    console.log('- hrvScore:', hrvScore);
    console.log('- sleepScore:', sleepScore);
    console.log('- readinessScore:', readinessScore);
    
  } catch (error) {
    console.error('Error in debug:', error);
  }
}

function cellDateISO(cell) {
  if (typeof cell === 'string') {
    if (cell.includes('/')) {
      const d = new Date(cell);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
    return cell.slice(0, 10);
  }
  if (typeof cell === 'number') {
    const ms = (cell - 25569) * 86400 * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  return '';
}

function hhmmToHours(str) {
  const m = str.match(/(\d+)h:(\d+)m/);
  if (!m) return NaN;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function rawToHours(val) {
  if (typeof val === 'string') {
    if (val.includes('h:')) return hhmmToHours(val);
    if (val.includes(':')) { // maybe HH:MM
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) return h + m / 60;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) return num < 25 ? num : num / 60;
    return NaN;
  }
  if (typeof val === 'number') return val > 25 ? val / 60 : val;
  return NaN;
}

debugFullReadiness(); 
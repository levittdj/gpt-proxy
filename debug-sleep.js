const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Set the correct Health Metrics sheet ID
process.env.GOOGLE_METRICS_SPREADSHEET_ID = '1QCsf4_WoAvkJSZ1woyXvVTs5wkZTfyZDVB2CrCzaMe0';

const GoogleSheets = require('./src/integrations/google-sheets');

async function debugSleep() {
  const gs = new GoogleSheets();
  await gs.initialize();

  const metricsId = process.env.GOOGLE_METRICS_SPREADSHEET_ID;
  const dateISO = '2025-07-02';

  console.log('Reading sleep data from sheet:', metricsId);
  
  try {
    const sleepRows = await gs.readDataFromSheet(metricsId, 'Sleep');
    console.log('Sleep rows count:', sleepRows.length);
    
    if (sleepRows.length > 0) {
      const sleepHeader = sleepRows[0].map(h => (h || '').toString().toLowerCase());
      console.log('Sleep header:', sleepHeader);
      
      const col = name => sleepHeader.indexOf(name);
      console.log('Column indices:');
      console.log('- date:', col('date'));
      console.log('- asleep:', col('asleep'));
      console.log('- inbed:', col('inbed'));
      console.log('- awake:', col('awake'));
      console.log('- wake count:', col('wake count'));
      console.log('- efficiency:', col('efficiency'));
      
      // Find today's row
      const sleepTodayRow = sleepRows.find((row, idx) => {
        if (idx === 0) return false;
        const dateCell = row[col('date')];
        console.log(`Row ${idx} date:`, dateCell, typeof dateCell);
        return cellDateISO(dateCell) === dateISO;
      });
      
      if (sleepTodayRow) {
        console.log('Found today\'s sleep row:', sleepTodayRow);
        
        const asleepRaw = sleepTodayRow[col('asleep')];
        const inBedRaw = sleepTodayRow[col('inbed')];
        const awakeRaw = sleepTodayRow[col('awake')];
        const wakeCount = sleepTodayRow[col('wake count')];
        const efficiencyPct = sleepTodayRow[col('efficiency')];
        
        console.log('Raw values:');
        console.log('- asleepRaw:', asleepRaw, typeof asleepRaw);
        console.log('- inBedRaw:', inBedRaw, typeof inBedRaw);
        console.log('- awakeRaw:', awakeRaw, typeof awakeRaw);
        console.log('- wakeCount:', wakeCount, typeof wakeCount);
        console.log('- efficiencyPct:', efficiencyPct, typeof efficiencyPct);
        
        // Test parsing
        const sleepHours = rawToHours(asleepRaw);
        const inBedHours = rawToHours(inBedRaw);
        const awakeMinutes = Math.round((rawToHours(awakeRaw) || 0) * 60);
        
        console.log('Parsed values:');
        console.log('- sleepHours:', sleepHours);
        console.log('- inBedHours:', inBedHours);
        console.log('- awakeMinutes:', awakeMinutes);
      } else {
        console.log('No sleep row found for date:', dateISO);
        console.log('Available dates:');
        sleepRows.slice(1, 5).forEach((row, idx) => {
          console.log(`Row ${idx + 1}:`, row[col('date')]);
        });
      }
    }
  } catch (error) {
    console.error('Error reading sleep data:', error);
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

debugSleep(); 
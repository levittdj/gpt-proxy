const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Set the correct Health Metrics sheet ID
process.env.GOOGLE_METRICS_SPREADSHEET_ID = '1QCsf4_WoAvkJSZ1woyXvVTs5wkZTfyZDVB2CrCzaMe0';

const { calculateAndStoreReadiness } = require('./src/analytics/readiness.js');
const { subDays } = require('date-fns');

async function testReadinessBatch() {
  try {
    console.log('Calculating readiness scores for the last 10 days...');
    console.log('Using Health Metrics sheet ID:', process.env.GOOGLE_METRICS_SPREADSHEET_ID);
    
    const results = [];
    
    // Calculate for last 10 days
    for (let i = 0; i < 10; i++) {
      const date = subDays(new Date(), i);
      const dateISO = date.toISOString().slice(0, 10);
      
      console.log(`\n--- Processing ${dateISO} (${i === 0 ? 'Today' : `${i} days ago`}) ---`);
      
      try {
        await calculateAndStoreReadiness(dateISO);
        results.push({ date: dateISO, status: 'Success' });
      } catch (error) {
        console.error(`❌ Failed for ${dateISO}:`, error.message);
        results.push({ date: dateISO, status: 'Failed', error: error.message });
      }
    }
    
    console.log('\n=== BATCH RESULTS ===');
    results.forEach(result => {
      console.log(`${result.date}: ${result.status}`);
    });
    
    const successCount = results.filter(r => r.status === 'Success').length;
    console.log(`\n✅ Completed: ${successCount}/10 days processed successfully`);
    
  } catch (error) {
    console.error('❌ Batch readiness calculation failed:', error.message);
    console.error(error.stack);
  }
}

testReadinessBatch(); 
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Set the correct Health Metrics sheet ID
process.env.GOOGLE_METRICS_SPREADSHEET_ID = '1QCsf4_WoAvkJSZ1woyXvVTs5wkZTfyZDVB2CrCzaMe0';

const { calculateAndStoreReadiness } = require('./src/analytics/readiness.js');

async function testReadiness() {
  try {
    // Get date from command line argument or use today
    const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
    console.log(`Testing readiness calculation for ${targetDate}...`);
    console.log('Using Health Metrics sheet ID:', process.env.GOOGLE_METRICS_SPREADSHEET_ID);
    await calculateAndStoreReadiness(targetDate);
    console.log('✅ Readiness calculation completed successfully!');
  } catch (error) {
    console.error('❌ Readiness calculation failed:', error.message);
    console.error(error.stack);
  }
}

testReadiness(); 
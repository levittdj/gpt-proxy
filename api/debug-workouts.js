const validateApiKey = require('./_validate-api-key');
const GoogleSheets = require('../src/integrations/google-sheets');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  if (!validateApiKey(req, res)) return;

  try {
    const gs = new GoogleSheets();
    await gs.initialize();

    // Read raw data from Workouts tab
    const rawData = await gs.readData('Workouts');
    const headers = rawData[0];
    const rows = rawData.slice(1);

    // Show first 10 rows with headers
    const sampleData = rows.slice(0, 10).map(row => {
      const obj = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = row[idx];
      });
      return obj;
    });

    res.status(200).json({
      headers: headers,
      totalRows: rows.length,
      sampleData: sampleData
    });
  } catch (err) {
    console.error('❌ Debug Workouts API error:', err);
    res.status(500).json({ error: err.message });
  }
} 
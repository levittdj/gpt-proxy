const validateApiKey = require('./_validate-api-key');
const getWorkoutTrends = require('../src/analytics/workout-trends');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  if (!validateApiKey(req, res)) return;

  try {
    const weeks = req.query.weeks ? parseInt(req.query.weeks, 10) : 4;
    const summary = await getWorkoutTrends(isNaN(weeks) || weeks <= 0 ? 4 : weeks);
    res.status(200).json(summary);
  } catch (err) {
    console.error('❌ Trends API error:', err);
    res.status(500).json({ error: err.message });
  }
} 
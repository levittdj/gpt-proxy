const logWorkout = require('../src/actions/log-workout');
const validateApiKey = require('./_validate-api-key');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  if (!validateApiKey(req, res)) return;

  try {
    const result = await logWorkout(req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Workout API error:', err);
    return res.status(500).json({ error: err.message });
  }
} 
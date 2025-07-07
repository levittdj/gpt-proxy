const logStrengthSet = require('../src/actions/log-strength-set');
const validateApiKey = require('./_validate-api-key');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  if (!validateApiKey(req, res)) return;

  try {
    const result = await logStrengthSet(req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ Strength API error:', err);
    return res.status(500).json({ error: err.message });
  }
} 
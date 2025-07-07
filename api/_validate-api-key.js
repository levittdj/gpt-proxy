// Simple middleware-like helper for API key validation
module.exports = function validateApiKey(req, res) {
  const configuredKey = process.env.FITNESS_AGENT_API_KEY;
  if (!configuredKey) {
    console.warn('⚠️  FITNESS_AGENT_API_KEY is not set; skipping auth');
    return true;
  }

  const headerKey = req.headers['x-api-key'];
  if (headerKey && headerKey === configuredKey) return true;

  res.status(401).json({ error: 'Unauthorized: invalid API key' });
  return false;
}; 
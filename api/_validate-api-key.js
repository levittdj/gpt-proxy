// Simple middleware-like helper for API key validation
module.exports = function validateApiKey(req, res) {
  // Trim any accidental whitespace/newlines that can be introduced
  const configuredKey = (process.env.FITNESS_AGENT_API_KEY || '').trim();
  if (!configuredKey) {
    console.warn('⚠️  FITNESS_AGENT_API_KEY is not set; skipping auth');
    return true;
  }

  const headerKeyRaw = req.headers['x-api-key'];
  const headerKey = typeof headerKeyRaw === 'string' ? headerKeyRaw.trim() : '';

  if (headerKey && headerKey === configuredKey) return true;

  res.status(401).json({ error: 'Unauthorized: invalid API key' });
  return false;
}; 
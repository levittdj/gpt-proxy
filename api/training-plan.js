const validateApiKey = require('./_validate-api-key');
const GoogleSheets = require('../src/integrations/google-sheets');

export default async function handler(req, res) {
  if (!validateApiKey(req, res)) return;

  const gs = new GoogleSheets();
  await gs.initialize();

  try {
    if (req.method === 'GET') {
      // Get latest training plan
      const plan = await gs.getLatestTrainingPlan();
      return res.status(200).json({ plan });
    } else if (req.method === 'POST') {
      // Create new training plan
      const plan = req.body;
      
      // Validate required fields
      if (!plan.weekStart || !plan.weekEnd || !plan.planType) {
        return res.status(400).json({ 
          error: 'Missing required fields: weekStart, weekEnd, planType' 
        });
      }

      // Convert date strings to Date objects
      plan.weekStart = new Date(plan.weekStart);
      plan.weekEnd = new Date(plan.weekEnd);
      
      await gs.storeTrainingPlan(plan);
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Training plan created successfully',
        plan 
      });
    } else {
      return res.status(405).json({ error: 'Only GET and POST methods allowed' });
    }
  } catch (err) {
    console.error('❌ Training Plan API error:', err);
    return res.status(500).json({ error: err.message });
  }
} 
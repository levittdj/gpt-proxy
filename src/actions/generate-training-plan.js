const GoogleSheets = require('../integrations/google-sheets');

/**
 * Generate a new training plan based on current progress and goals
 * @param {Object} params
 * @param {string} params.weekStart – ISO date for start of training week
 * @param {string} params.weekEnd – ISO date for end of training week
 * @param {string} params.planType – build, maintain, recovery, race-prep
 * @param {number} [params.swimSessions] – Number of swim sessions
 * @param {number} [params.bikeSessions] – Number of bike sessions
 * @param {number} [params.runSessions] – Number of run sessions
 * @param {number} [params.strengthSessions] – Number of strength sessions
 * @param {number} [params.ptSessions] – Number of PT sessions
 * @param {number} [params.recoverySessions] – Number of recovery sessions
 * @param {string} [params.intensity] – low, moderate, high
 * @param {string} [params.notes] – Additional notes
 */
module.exports = async function generateTrainingPlan(params = {}) {
  const required = ['weekStart', 'weekEnd', 'planType'];
  for (const f of required) {
    if (params[f] === undefined || params[f] === null || params[f] === '') {
      throw new Error(`Missing required field: ${f}`);
    }
  }

  const gs = new GoogleSheets();
  await gs.initialize();

  // Build training plan object
  const plan = {
    weekStart: params.weekStart,
    weekEnd: params.weekEnd,
    planType: params.planType,
    swimSessions: params.swimSessions || 0,
    bikeSessions: params.bikeSessions || 0,
    runSessions: params.runSessions || 0,
    strengthSessions: params.strengthSessions || 0,
    ptSessions: params.ptSessions || 0,
    recoverySessions: params.recoverySessions || 0,
    intensity: params.intensity || 'moderate',
    notes: params.notes || ''
  };

  // Calculate total volume
  plan.totalVolume = plan.swimSessions + plan.bikeSessions + plan.runSessions + 
                    plan.strengthSessions + plan.ptSessions + plan.recoverySessions;

  // Store the training plan
  await gs.storeTrainingPlan(plan);

  return { 
    status: 'ok', 
    message: 'Training plan generated and stored successfully',
    plan 
  };
}; 
// Wrapper action: logStrengthSet
// Usage: await logStrengthSet({ date:'2025-07-07', exercise:'Squat', setNumber:1, reps:8, weight:135, rpe:7, notes:'' });
const GoogleSheets = require('../integrations/google-sheets');

/**
 * Append one strength-training set to the Strength tab in Google Sheets.
 * @param {Object} params
 * @param {string} params.date – ISO yyyy-mm-dd or today
 * @param {string} params.exercise
 * @param {number} params.setNumber – 1-based index
 * @param {number} params.reps
 * @param {number} params.weight
 * @param {number} [params.rpe]
 * @param {string} [params.notes]
 */
module.exports = async function logStrengthSet(params = {}) {
  // Basic validation – throw early if required fields missing
  const required = ['date', 'exercise', 'setNumber', 'reps', 'weight'];
  for (const f of required) {
    if (params[f] === undefined || params[f] === null || params[f] === '') {
      throw new Error(`Missing required field: ${f}`);
    }
  }

  const gs = new GoogleSheets();
  await gs.initialize();

  const setDetail = {
    date: params.date,
    exercise: params.exercise,
    setNumber: params.setNumber,
    reps: params.reps,
    weight: params.weight,
    rpe: params.rpe || '',
    notes: params.notes || ''
  };

  await gs.storeStrengthSet(setDetail);
  return { status: 'ok', stored: setDetail };
}; 
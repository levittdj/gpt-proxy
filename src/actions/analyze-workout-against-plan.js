const GoogleSheets = require('../integrations/google-sheets');

/**
 * Analyze a logged workout against the current training plan and provide recommendations
 * @param {Object} params
 * @param {string} params.workoutType – Type of workout logged (Run, Bike, Swim, etc.)
 * @param {number} params.duration – Duration in minutes
 * @param {number} [params.distance] – Distance in km
 * @param {string} [params.date] – Date of workout (defaults to today)
 */
module.exports = async function analyzeWorkoutAgainstPlan(params = {}) {
  const required = ['workoutType', 'duration'];
  for (const f of required) {
    if (params[f] === undefined || params[f] === null || params[f] === '') {
      throw new Error(`Missing required field: ${f}`);
    }
  }

  const gs = new GoogleSheets();
  await gs.initialize();

  // Get current training plan
  const currentPlan = await gs.getLatestTrainingPlan();
  
  // Get recent workouts for context
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Last 7 days
  const recentWorkouts = await gs.getWorkouts(startDate, endDate);

  // Analyze the workout type against plan
  const workoutType = params.workoutType.toLowerCase();
  let planTarget = 0;
  let planType = 'unknown';

  if (workoutType.includes('run')) {
    planTarget = currentPlan?.runsessions || 0;
    planType = 'running';
  } else if (workoutType.includes('bike') || workoutType.includes('cycle')) {
    planTarget = currentPlan?.bikesessions || 0;
    planType = 'cycling';
  } else if (workoutType.includes('swim')) {
    planTarget = currentPlan?.swimsessions || 0;
    planType = 'swimming';
  } else if (workoutType.includes('strength')) {
    planTarget = currentPlan?.strengthsessions || 0;
    planType = 'strength';
  }

  // Count recent workouts of this type
  const recentWorkoutsOfType = recentWorkouts.filter(w => 
    w.type && w.type.toLowerCase().includes(workoutType.split(' ')[0])
  ).length;

  // Generate analysis and recommendations
  const analysis = {
    workoutLogged: {
      type: params.workoutType,
      duration: params.duration,
      distance: params.distance || null,
      date: params.date || new Date().toISOString().split('T')[0]
    },
    currentPlan: currentPlan ? {
      planType: currentPlan.plantype,
      intensity: currentPlan.intensity,
      targetSessions: planTarget,
      totalVolume: currentPlan.totalvolume
    } : null,
    progress: {
      recentSessionsOfType: recentWorkoutsOfType,
      planTarget: planTarget,
      onTrack: recentWorkoutsOfType <= planTarget,
      remainingSessions: Math.max(0, planTarget - recentWorkoutsOfType)
    },
    recommendations: []
  };

  // Generate recommendations based on analysis
  if (!currentPlan) {
    analysis.recommendations.push("No current training plan found. Consider creating a new plan.");
  } else {
    if (analysis.progress.onTrack) {
      analysis.recommendations.push(`Good progress on ${planType}! You're on track with your plan.`);
    } else {
      analysis.recommendations.push(`You're ahead on ${planType} sessions. Consider adding a recovery day or cross-training.`);
    }

    if (analysis.progress.remainingSessions > 0) {
      analysis.recommendations.push(`You have ${analysis.progress.remainingSessions} more ${planType} sessions planned for this week.`);
    }

    // Volume recommendations
    if (params.duration > 90) {
      analysis.recommendations.push("Long session completed. Ensure adequate recovery before next intense workout.");
    } else if (params.duration < 30) {
      analysis.recommendations.push("Short session. Consider adding more volume if feeling fresh.");
    }
  }

  return {
    status: 'ok',
    analysis,
    message: 'Workout analyzed against current training plan'
  };
}; 
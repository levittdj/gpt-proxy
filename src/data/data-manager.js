const HealthAutoExportParser = require('../integrations/health-auto-export');
const GoogleSheetsIntegration = require('../integrations/google-sheets');
const { v4: uuidv4 } = require('crypto');

/**
 * Data Manager - Coordinates data flow between Health Auto Export and Google Sheets
 * Provides unified interface for data operations and synchronization
 */
class DataManager {
  constructor() {
    this.healthParser = new HealthAutoExportParser();
    this.sheetsIntegration = new GoogleSheetsIntegration();
    this.initialized = false;
  }

  /**
   * Initialize all data integrations
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Data Manager...');
      
      // Initialize Health Auto Export parser
      await this.healthParser.initialize();
      
      // Initialize Google Sheets integration
      await this.sheetsIntegration.initialize();
      await this.sheetsIntegration.initializeSpreadsheet();
      
      this.initialized = true;
      console.log('✅ Data Manager initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Data Manager: ${error.message}`);
    }
  }

  /**
   * Sync Health Auto Export data to Google Sheets
   */
  async syncHealthData(startDate = null, endDate = null) {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      console.log('🔄 Syncing Health Auto Export data to Google Sheets...');
      
      // Parse Health Auto Export data
      const healthData = await this.healthParser.parseData(startDate, endDate);
      
      let syncStats = {
        workouts: 0,
        readiness: 0,
        metrics: 0,
        errors: 0
      };

      // Sync workouts
      for (const workout of healthData.workouts) {
        try {
          workout.id = workout.id || uuidv4();
          await this.sheetsIntegration.storeWorkout(workout);
          syncStats.workouts++;
        } catch (error) {
          console.error(`Failed to sync workout ${workout.id}:`, error.message);
          syncStats.errors++;
        }
      }

      // Sync readiness data
      for (const readiness of healthData.readiness) {
        try {
          readiness.id = readiness.id || uuidv4();
          await this.sheetsIntegration.storeReadiness(readiness);
          syncStats.readiness++;
        } catch (error) {
          console.error(`Failed to sync readiness ${readiness.id}:`, error.message);
          syncStats.errors++;
        }
      }

      // Sync metrics
      for (const metric of healthData.metrics) {
        try {
          metric.id = metric.id || uuidv4();
          await this.sheetsIntegration.storeAnalytics({
            id: metric.id,
            date: metric.date,
            metric: metric.type,
            value: metric.value,
            period: 'daily',
            trend: metric.trend || '',
            insight: metric.insight || '',
            recommendation: metric.recommendation || ''
          });
          syncStats.metrics++;
        } catch (error) {
          console.error(`Failed to sync metric ${metric.id}:`, error.message);
          syncStats.errors++;
        }
      }

      console.log(`✅ Health data sync completed:`, syncStats);
      return syncStats;
    } catch (error) {
      throw new Error(`Failed to sync health data: ${error.message}`);
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(period = '7 days') {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate start date based on period
      switch (period) {
        case '7 days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30 days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90 days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get data from Google Sheets
      const [workouts, readiness, ptProgress, analytics] = await Promise.all([
        this.sheetsIntegration.getWorkouts(startDate, endDate),
        this.sheetsIntegration.getReadiness(startDate, endDate),
        this.sheetsIntegration.getPTProgress(startDate, endDate),
        this.sheetsIntegration.getAnalytics('daily', 30)
      ]);

      // Calculate insights
      const insights = this.calculateInsights(workouts, readiness, ptProgress, analytics);

      return {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        workouts: {
          total: workouts.length,
          byType: this.groupBy(workouts, 'type'),
          totalDuration: workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0),
          totalDistance: workouts.reduce((sum, w) => sum + (parseFloat(w.distance) || 0), 0),
          averageDuration: workouts.length > 0 
            ? workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0) / workouts.length 
            : 0
        },
        readiness: {
          total: readiness.length,
          averageScore: readiness.length > 0 
            ? readiness.reduce((sum, r) => sum + (parseFloat(r.readinessscore) || 0), 0) / readiness.length 
            : 0,
          latestHRV: readiness.find(r => r.type === 'hrv')?.value || null,
          latestRestingHR: readiness.find(r => r.type === 'restingheartrate')?.value || null,
          sleepQuality: readiness.filter(r => r.type === 'sleepquality').map(r => r.value)
        },
        ptProgress: {
          total: ptProgress.length,
          byExercise: this.groupBy(ptProgress, 'exercise'),
          milestones: ptProgress.filter(p => p.milestone).length,
          recentExercises: ptProgress.slice(-5)
        },
        analytics: {
          total: analytics.length,
          recent: analytics.slice(-10),
          trends: this.calculateTrends(analytics)
        },
        insights,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  /**
   * Store training plan
   */
  async storeTrainingPlan(plan) {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      plan.id = plan.id || uuidv4();
      await this.sheetsIntegration.storeTrainingPlan(plan);
      console.log(`✅ Training plan stored: ${plan.id}`);
      return plan;
    } catch (error) {
      throw new Error(`Failed to store training plan: ${error.message}`);
    }
  }

  /**
   * Store PT progress
   */
  async storePTProgress(ptData) {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      ptData.id = ptData.id || uuidv4();
      await this.sheetsIntegration.storePTProgress(ptData);
      console.log(`✅ PT progress stored: ${ptData.id}`);
      return ptData;
    } catch (error) {
      throw new Error(`Failed to store PT progress: ${error.message}`);
    }
  }

  /**
   * Get training recommendations based on readiness and recent activity
   */
  async getTrainingRecommendations() {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const [readiness, workouts, latestPlan] = await Promise.all([
        this.sheetsIntegration.getReadiness(startDate, endDate),
        this.sheetsIntegration.getWorkouts(startDate, endDate),
        this.sheetsIntegration.getLatestTrainingPlan()
      ]);

      // Get latest readiness score
      const latestReadiness = readiness.length > 0 
        ? readiness[readiness.length - 1] 
        : null;

      // Calculate training load
      const trainingLoad = this.calculateTrainingLoad(workouts);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        latestReadiness,
        trainingLoad,
        latestPlan
      );

      return {
        readiness: latestReadiness,
        trainingLoad,
        recommendations,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get training recommendations: ${error.message}`);
    }
  }

  /**
   * Calculate insights from data
   */
  calculateInsights(workouts, readiness, ptProgress, analytics) {
    const insights = [];

    // Workout insights
    if (workouts.length > 0) {
      const avgDuration = workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0) / workouts.length;
      if (avgDuration > 3600) {
        insights.push({
          type: 'workout',
          message: 'Average workout duration is over 1 hour - consider shorter, more frequent sessions',
          priority: 'medium'
        });
      }
    }

    // Readiness insights
    if (readiness.length > 0) {
      const avgReadiness = readiness.reduce((sum, r) => sum + (parseFloat(r.readinessscore) || 0), 0) / readiness.length;
      if (avgReadiness < 70) {
        insights.push({
          type: 'readiness',
          message: 'Average readiness score is low - consider more recovery time',
          priority: 'high'
        });
      }
    }

    // PT progress insights
    if (ptProgress.length > 0) {
      const recentPT = ptProgress.slice(-7);
      if (recentPT.length < 3) {
        insights.push({
          type: 'pt',
          message: 'Limited PT progress in the last week - consider increasing frequency',
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  /**
   * Calculate training load from workouts
   */
  calculateTrainingLoad(workouts) {
    if (workouts.length === 0) return { load: 'low', score: 0 };

    const totalDuration = workouts.reduce((sum, w) => sum + (parseFloat(w.duration) || 0), 0);
    const totalDistance = workouts.reduce((sum, w) => sum + (parseFloat(w.distance) || 0), 0);

    // Simple training load calculation
    let loadScore = (totalDuration / 3600) * 10; // Hours * 10
    loadScore += (totalDistance / 10000); // Distance in km

    let load = 'low';
    if (loadScore > 50) load = 'high';
    else if (loadScore > 25) load = 'medium';

    return {
      load,
      score: Math.round(loadScore),
      duration: totalDuration,
      distance: totalDistance,
      workouts: workouts.length
    };
  }

  /**
   * Generate training recommendations
   */
  generateRecommendations(readiness, trainingLoad, latestPlan) {
    const recommendations = [];

    if (!readiness) {
      recommendations.push({
        type: 'general',
        message: 'No readiness data available - consider tracking HRV and sleep',
        priority: 'medium'
      });
      return recommendations;
    }

    const readinessScore = parseFloat(readiness.readinessscore) || 0;

    // Readiness-based recommendations
    if (readinessScore < 60) {
      recommendations.push({
        type: 'recovery',
        message: 'Low readiness score - focus on recovery and light activity',
        priority: 'high'
      });
    } else if (readinessScore > 85) {
      recommendations.push({
        type: 'training',
        message: 'High readiness score - good time for intense training',
        priority: 'medium'
      });
    }

    // Training load recommendations
    if (trainingLoad.load === 'high') {
      recommendations.push({
        type: 'recovery',
        message: 'High training load detected - consider recovery day',
        priority: 'high'
      });
    } else if (trainingLoad.load === 'low' && readinessScore > 70) {
      recommendations.push({
        type: 'training',
        message: 'Low training load with good readiness - time to increase intensity',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Calculate trends from analytics data
   */
  calculateTrends(analytics) {
    if (analytics.length < 2) return [];

    const trends = [];
    const recent = analytics.slice(-7);

    // Simple trend calculation
    for (let i = 1; i < recent.length; i++) {
      const current = parseFloat(recent[i].value) || 0;
      const previous = parseFloat(recent[i-1].value) || 0;
      
      if (current > previous * 1.1) {
        trends.push({
          metric: recent[i].metric,
          trend: 'increasing',
          change: ((current - previous) / previous * 100).toFixed(1)
        });
      } else if (current < previous * 0.9) {
        trends.push({
          metric: recent[i].metric,
          trend: 'decreasing',
          change: ((current - previous) / previous * 100).toFixed(1)
        });
      }
    }

    return trends;
  }

  /**
   * Group data by field
   */
  groupBy(data, field) {
    return data.reduce((groups, item) => {
      const key = item[field] || 'Unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  /**
   * Export data for backup or analysis
   */
  async exportData(startDate, endDate, format = 'json') {
    if (!this.initialized) {
      throw new Error('Data Manager not initialized. Call initialize() first.');
    }

    try {
      const [workouts, readiness, ptProgress, analytics] = await Promise.all([
        this.sheetsIntegration.getWorkouts(startDate, endDate),
        this.sheetsIntegration.getReadiness(startDate, endDate),
        this.sheetsIntegration.getPTProgress(startDate, endDate),
        this.sheetsIntegration.getAnalytics('daily', 1000)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        data: {
          workouts,
          readiness,
          ptProgress,
          analytics
        }
      };

      if (format === 'json') {
        return exportData;
      } else {
        throw new Error(`Export format '${format}' not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }
}

module.exports = DataManager; 
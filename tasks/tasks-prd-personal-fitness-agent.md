# Tasks for Personal Fitness Agent & Physical Therapy-Informed Trainer

## Core Infrastructure
- [x] **Project setup and configuration management**
  - [x] Create project structure
  - [x] Set up package.json with dependencies
  - [x] Configure environment variables
  - [x] Set up testing framework (Jest)
  - [x] Create README and documentation

- [x] **Health Auto Export integration** *(DEPRECATED - Replaced with HealthFit)*
  - [x] Create parser for CSV and JSON formats
  - [x] Implement data categorization (workouts, sleep, readiness, metrics)
  - [x] Add metadata extraction and date filtering
  - [x] Create comprehensive test suite
  - [x] Handle different data formats and edge cases

- [x] **Google Sheets API integration**
  - [x] Set up Google Sheets API authentication
  - [x] Create spreadsheet structure with organized sheets
  - [x] Implement data storage for workouts, readiness, training plans, PT progress, analytics
  - [x] Add data retrieval with date filtering
  - [x] Create dashboard data aggregation
  - [x] Implement comprehensive test coverage

- [x] **Data Manager**
  - [x] Create unified interface for data operations
  - [x] Implement data synchronization between HealthFit and Google Sheets
  - [x] Add dashboard data generation
  - [x] Create training load calculation based on workout intensity and volume
  - [x] Implement readiness-based recommendations
  - [x] Add insights and analytics generation
  - [x] Create comprehensive test suite

- [x] **MVP: Automated Data Flow (Google Apps Script)**
  - [x] Create Google Apps Script for automatic HealthFit processing
  - [x] Implement cloud-based data flow (HealthFit → Google Drive → Google Sheets)
  - [x] Add automatic file detection and processing
  - [x] Create data categorization and sheet organization
  - [x] Add duplicate file prevention
  - [x] Create comprehensive setup guide
  - [x] Set up automated triggers for continuous processing

- [x] **HealthFit + QS Access integration**
  - [x] Configure HealthFit auto-export to Google Drive (CSV/FIT)
  - [ ] Build Apple Shortcut that triggers QS Access daily CSV export to the same Drive folder (P2)
  - [ ] Update Google Apps Script parser for HealthFit workout CSV/FIT files (P2)
  - [ ] Update Google Apps Script parser for QS Access metrics CSV — primarily to capture VO₂ max or niche fields (P2)
  - [ ] Add duplicate-file prevention for new file names (P2)
  - [ ] Update setup guide to reflect new workflow (P2)
  - [x] Update Google Sheets structure: create Workouts and Strength tabs with new column layouts
  - [x] Adjust parser/mapping to write workout summary rows to Workouts tab
  - [x] Add logic to write strength set rows to Strength tab (when source data provides sets/reps/weight)

## Training Planning & Readiness
- [x] **Readiness scoring system**
  - [x] Implement HRV-based readiness calculation
  - [x] Add sleep quality integration
  - [ ] Create training load balancing
  - [ ] Build readiness trend analysis

- [ ] **Training plan generation**  *(see detailed spec in `prd-personal-fitness-agent.md`)*
  - [ ] Generate **rolling 6-week training plans** (swim, bike, run, strength, PT) with progressive overload and periodisation
  - [ ] Auto-adjust plans **daily & weekly** based on readiness, performance, knee status, travel, etc.
  - [ ] Create triathlon-specific training templates (Olympic distance focus)
  - [ ] Implement ACL recovery protocols and milestone gates
  - [ ] Build progressive overload tracking & validation
  - [ ] Generate **quarterly OKRs/targets** (distance, volume, VO₂ max, weight) and write them to **Master Performance Tracker** tab
  - [ ] Maintain OKR alignment and quarterly goal checkpoints

- [ ] **PT integration**
  - [ ] Create PT exercise library
  - [ ] Implement progress tracking
  - [ ] Add milestone achievement system
  - [ ] Build pain level monitoring

## Communication & User Interface
- [ ] **ChatGPT GPT Interface (MVP Priority)**
  - [ ] Create GPT Actions for data access and analysis
  - [ ] **`generate_6week_training_plan()` action** – returns a structured 6-week plan (JSON → Google Sheets)
  - [ ] **`update_training_plan(changes)` action** – modifies plan when readiness/performance shifts
  - [ ] Implement workout recommendation actions (single-day context)
  - [ ] Add readiness score explanation actions
  - [ ] Build PT progress tracking actions
  - [ ] Add data visualization actions (charts, trends)
  - [ ] Implement coaching and motivation actions
  - [ ] Set up authentication and security for API access
  - [ ] Create comprehensive GPT instructions and personality
  - [ ] Test and validate GPT responses with real data

- [ ] **API endpoints**
  - [ ] Create RESTful API for data access
  - [ ] Implement dashboard endpoints
  - [ ] Add training recommendation endpoints
  - [ ] Build data sync endpoints

- [ ] **Web interface**
  - [ ] Create modern, responsive dashboard
  - [ ] Implement real-time data visualization
  - [ ] Add training plan display
  - [ ] Build PT progress tracking interface

## Analytics & Insights
- [x] **Performance analytics**
  - [x] Implement trend analysis
  - [x] Create performance comparisons
  - [ ] Add goal tracking
  - [ ] Build predictive analytics

- [x] **Health insights**
  - [x] Create recovery recommendations
  - [x] Implement readiness scoring with HRV and sleep analysis
  - [x] Add sleep optimization suggestions
  - [ ] Build nutrition integration

- [x] **Advanced Analytics & Insights**
  - [x] **Training load monitoring** with intensity scoring
  - [x] **Readiness trend analysis** for recovery optimization
  - [x] **Performance insights** with actionable recommendations
  - [x] **PT progress tracking** with milestone achievement
  - [x] **Data visualization preparation** for dashboard

## Testing & Quality Assurance
- [x] **Unit testing**
  - [x] Google Sheets integration tests
  - [x] Data Manager tests
  - [ ] API endpoint tests
  - [ ] Integration tests

- [ ] **End-to-end testing**
  - [ ] Complete data flow testing
  - [ ] User scenario testing
  - [ ] Performance testing
  - [ ] Error handling validation

## Deployment & Operations
- [ ] **Production setup**
  - [ ] Configure production environment
  - [ ] Set up monitoring and logging
  - [ ] Implement error handling
  - [ ] Create backup and recovery procedures

- [ ] **Documentation**
  - [ ] API documentation
  - [ ] User guides
  - [ ] Deployment instructions
  - [ ] Troubleshooting guides

## Deferred Integrations (Future Phases)
- [ ] **Eight Sleep integration** - Deferred
- [ ] **MyFitnessPal integration** - Deferred  
- [ ] **Google Calendar integration** - Deferred

## Current Status
**✅ COMPLETED:**
- Core infrastructure and configuration management
- Google Sheets API integration with full data storage and retrieval
- Data Manager for coordinating all data operations
- Comprehensive test coverage for all core components
- Dashboard data aggregation and insights generation
- Training load calculation and readiness-based recommendations
- **MVP: Automated data flow using Google Apps Script**
- **Cloud-based automation (HealthFit → Google Drive → Google Sheets)**
- **Complete setup guide and configuration**
- **Readiness scoring system with HRV and sleep integration**

**🔄 IN PROGRESS:**
- HealthFit + QS Access integration (partially complete)
- Ready to implement training plan generation
- Ready to create API endpoints

**📋 NEXT PRIORITIES:**
1. **Build ChatGPT GPT Interface (MVP Core)**
   - Create GPT Actions for data access and analysis
   - Implement workout recommendation and coaching actions
   - Set up authentication and security
2. Complete HealthFit + QS Access integration (remaining P2 tasks)
3. Set up QS Access Apple Shortcut for daily export
4. Update Google Apps Script parsers for new file formats
5. Implement readiness score optimization with subjective input

**🎯 PROJECT STATUS: 60% Complete**
- Core data infrastructure: ✅ Complete
- Data storage and management: ✅ Complete
- Automated data flow (MVP): ✅ Complete
- Readiness scoring system: ✅ Complete
- Basic analytics and insights: ✅ Complete
- HealthFit + QS Access integration: 🔄 In Progress
- Training planning: 📋 Ready to implement
- User interface: 📋 Pending
- Advanced features: 📋 Pending

**🚀 MVP READY FOR DEPLOYMENT**
The automated data flow is now complete and ready for immediate use. Follow the setup guide in `google-apps-script/SETUP_GUIDE.md` to get your HealthFit data automatically flowing into Google Sheets!

## Post-MVP Enhancements (P1)
- [ ] **ChatGPT → Vercel → Sheets workflow**
  - [ ] Extend current strength-set endpoint to support generic **workout rows** (all types, not just strength)
  - [ ] Update OpenAPI schema & ChatGPT action so users can log any workout via chat
  - [ ] Validate data mapping and ensure progressive-overload analytics still work

### QS Access Sleep-Stage Integration (Better Readiness Scoring)
- [ ] **Enable data source on phone**
  - [ ] In QS Access → Create Table named `DailyExtra` with columns: Date, REM Minutes, Deep Minutes, Core Minutes, VO₂ Max (optional extras).
- [ ] **Shortcut & automation**
  - [ ] Build iOS Shortcut "Export QS DailyExtra":
    - Run QS Access export for `DailyExtra`.
    - Save file to iCloud Drive/QS-Exports as `qs-daily-[[Current Date]].csv` (overwrite).
    - Copy the same file to the Google Drive folder used by HealthFit exports.
  - [ ] Add Personal Automation: run the shortcut daily at 05:00.
- [ ] **Backend ingestion**
  - [ ] Extend Drive watcher to detect files matching `qs-daily-*.csv`.
  - [ ] Implement `parseQSDailyCSV` to total REM/Deep/Core minutes and append/update those columns in the **Sleep** tab.
  - [ ] Add duplicate-file prevention (skip if date already processed).
- [ ] **Google Sheets updates**
  - [ ] Add columns REM (min), Deep (min), Core (min) to the Sleep tab.
  - [ ] **Add Sleep architecture to Sleep tab (REM / Deep / Core mins)**
  - [ ] Add **OKRs/Quarterly Targets** tab in Master Performance Tracker with fields: Quarter, Target Metric, Baseline, Goal, Status.
  - [ ] Add corresponding headers to any downstream IMPORTRANGE sheets.
- [ ] **Analytics updates**
  - [ ] Replace placeholder sleep-architecture score in `src/analytics/readiness.js` with:
    `archRatio = (REM + Deep) / Total Sleep` → logistic transform.
  - [ ] Re-weight sleep sub-scores if needed.
- [ ] **Documentation**
  - [ ] Update setup guide with QS Access table + Shortcut instructions.
  - [ ] Document new parser and readiness logic.

// After pulling asleepM and awakeM …

// Detect unit: if value < 25 we assume hours, else minutes
function toHours(value) {
  return value < 25 ? value : value / 60;
}

const rawToHours = val => {
  if (typeof val === 'string' && val.includes('h:')) return hhmmToHours(val);
  if (typeof val === 'number' && val > 25) return val / 60;   // minutes
  if (typeof val === 'number') return val;                    // already hours
  return NaN;
};

const sleepHours   = rawToHours(asleepRaw);
const inBedHours   = rawToHours(inBedRaw);
const awakeMinutes = Math.round(rawToHours(awakeRaw) * 60);

function hhmmToHours(str) {
  const m = str.match(/(\d+)h:(\d+)m/);
  if (!m) return NaN;
  return (+m[1]) + (+m[2]) / 60;
}

const sleepDurValues = sleepRows.slice(1)
  .map(r => rawToHours(r[col('asleep')]))
  .filter(v => !isNaN(v));

### Automated Readiness Scheduling & Proactive Coaching (P1)
- [ ] **Daily Readiness Job**  – choose one implementation below and automate `src/analytics/readiness.js`
  - [ ] Local cron job on dev/server machine
  - [ ] GitHub Actions scheduled workflow
  - [ ] Google Cloud Scheduler → Cloud Function
- [ ] **GPT Daily Summary**  (runs right after readiness calc)
  - [ ] Pull latest readiness + plan from Sheets
  - [ ] Call OpenAI function to generate short coach message
  - [ ] Post to Slack / e-mail webhook
- [ ] **Proactive Coaching Loop (optional upgrade)**
  - [ ] Cloud Function reads readiness + calendar + planned workout
  - [ ] GPT adjusts workout (volume/intensity) & produces coach message
  - [ ] Write adjusted workout to TrainingPlans tab
  - [ ] Deliver coach message via Slack / SMS
- [ ] **Documentation & Ops**
  - [ ] Add README section for chosen automation path
  - [ ] Set up secrets (service-account key, OpenAI key) in CI/CD or Cloud Secret Manager 

### Readiness Score Optimization & Subjective Input (P1)
- [ ] **Subjective Morning Feeling Input**
  - [ ] Create simple chat interface (Slack bot / web form / mobile app) for daily morning feeling input
  - [ ] Add subjective score (1-10 scale): "How rested do you feel this morning?"
  - [ ] Store subjective feeling in Readiness tab with timestamp
  - [ ] Integrate subjective score into readiness calculation (replace placeholder 50)
  - [ ] Add correlation analysis between subjective feeling and objective metrics (HRV, sleep quality, etc.)
- [ ] **Readiness Score Validation & Optimization**
  - [ ] **HRV Component Analysis**
    - [ ] Validate 30-day baseline window calculation
    - [ ] Test different baseline periods (14-day, 30-day, 60-day)
    - [ ] Optimize logistic transform parameters (k=0.87)
    - [ ] Add HRV trend analysis (improving/declining)
  - [ ] **Sleep Component Analysis**
    - [ ] Validate sleep duration scoring (8-hour target vs personal baseline)
    - [ ] Test sleep efficiency calculation and penalties
    - [ ] Optimize wake count and awake time penalties
    - [ ] Validate sleep architecture scoring (when REM/Deep data available)
    - [ ] Test bedtime regularity calculation and normalization
  - [ ] **Score Weighting Optimization**
    - [ ] Analyze current weights: 50% HRV, 50% Sleep
    - [ ] Test different weight combinations based on correlation with subjective feeling
    - [ ] Consider seasonal/contextual weight adjustments
    - [ ] Add confidence intervals for readiness predictions
- [ ] **Data Quality & Validation**
  - [ ] Add outlier detection for HRV and sleep metrics
  - [ ] Implement data quality scoring for each component
  - [ ] Add missing data handling and interpolation
  - [ ] Create data validation alerts for suspicious readings
- [ ] **Correlation Analysis Dashboard**
  - [ ] Build visualization showing subjective feeling vs objective readiness score
  - [ ] Track correlation trends over time
  - [ ] Identify which metrics best predict subjective feeling
  - [ ] Generate insights on readiness score accuracy
- [ ] **Documentation & Testing**
  - [ ] Document all scoring algorithms and parameters
  - [ ] Create test cases with known expected scores
  - [ ] Add A/B testing framework for score improvements
  - [ ] Document correlation findings and optimization recommendations 

- [ ] **Walking load & trends**
  - [ ] Combine **Walking workout rows** (type contains "Walk") from the Workouts tab **AND** total daily **step count** from the Health Metrics tab.
  - [ ] Compute weekly trends (distance, duration, steps, sessions, avg pace) and expose via `/api/walk-trends` endpoint.
  - [ ] Update OpenAPI schema & ChatGPT actions to allow `getWalkTrends` (similar to run/cycle/swim).
  - [ ] Add test coverage for mixed-source aggregation (workouts + daily metrics).
  - [ ] Ensure trends analytics classify progression/stalling based on weekly step distance/load. 
# Google Apps Script Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Google Apps Script Project

1. **Go to Google Apps Script**: https://script.google.com/
2. **Click "New Project"**
3. **Replace the default code** with the content from `health-auto-export-processor.js`
4. **Save the project** (Ctrl+S or Cmd+S)

### Step 2: Configure the Script

1. **Find your Google Sheet ID**:
   - Open your Google Sheet
   - Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit`
   - Replace `YOUR_SPREADSHEET_ID_HERE` in the script

2. **Update folder name** (if needed):
   - Change `HEALTH_EXPORT_FOLDER_NAME: 'Health Auto Export'` to match your Google Drive folder name

### Step 3: Set Up Health Auto Export App (Multiple Exports)

#### **Export 1: Workouts (with Metadata)**
1. **Open Health Auto Export app**
2. **Tap "Export" → "Custom Export"**
3. **Select categories**:
   - ✅ Activity (workouts, steps, calories)
   - ✅ Workouts (all types)
   - ✅ **Heart Rate** (for workout metadata)
   - ✅ **Distance** (for pace calculations)
   - ✅ **Power** (for cycling workouts)
   - ✅ **Cadence** (for running/cycling)
   - ✅ **Elevation** (for outdoor activities)
   - ✅ **Active Energy** (for daily activity tracking)
   - ✅ **Apple Move Time** (for exercise minutes)
4. **Configure export**:
   - **Format: CSV** (NOT Google Sheets - the script expects CSV)
   - Destination: **Google Drive**
   - Folder: **Health Auto Export** (or your renamed folder)
   - **File naming**: Health Auto Export uses default naming like `workouts_YYYY-MM-DD.csv`
   - Schedule: **Daily at 7 AM**
   - **Include detailed data**: Yes (for metadata processing)

#### **Export 2: Health Metrics**
1. **Create another export** in Health Auto Export
2. **Select categories**:
   - ✅ Heart (HRV, resting HR, heart rate)
   - ✅ Sleep (duration, quality, stages)
   - ✅ Body Measurements (weight, body fat)
   - ✅ **Active Energy** (daily calorie burn)
   - ✅ **Apple Move Time** (exercise minutes)
   - ✅ **Stand Hours** (daily standing goals)
   - ✅ **Steps** (daily step count)
   - ✅ **Distance** (daily distance covered)
   - ✅ **Flights Climbed** (daily elevation)
3. **Configure export**:
   - **Format: CSV** (NOT Google Sheets)
   - Destination: **Google Drive**
   - Folder: **Health Auto Export** (or your renamed folder)
   - **File naming**: Default `health_YYYY-MM-DD.csv`
   - Schedule: **Daily at 7 AM**

#### **Export 3: All Data (Optional)**
1. **Create a third export** for comprehensive data
2. **Select all categories** you want to track
3. **Configure export**:
   - **Format: CSV** (NOT Google Sheets)
   - Destination: **Google Drive**
   - Folder: **Fitness Agent Data** (or your renamed folder)
   - **File naming**: Default `health_auto_export_YYYY-MM-DD.csv`
   - Schedule: **Daily at 7 AM**

### **📝 Important Notes:**

#### **File Format:**
- ✅ **Use CSV format** - The script is designed to parse CSV files
- ❌ **Don't use Google Sheets format** - Would require different parsing logic

#### **File Naming:**
- Health Auto Export uses **fixed naming conventions**
- You **cannot customize** the file naming in the app
- The script automatically detects files based on these patterns:
  - `workouts_YYYY-MM-DD.csv` → Workout data
  - `health_YYYY-MM-DD.csv` → Health metrics
  - `health_auto_export_YYYY-MM-DD.csv` → All data

#### **Folder Setup:**
- Make sure your Google Drive folder name matches what you set in the script
- The script will look for files in the folder you specify
- All export files should go to the same folder

### Step 4: Set Up Automation Triggers

1. **In Google Apps Script, click "Triggers"** (clock icon)
2. **Click "Add Trigger"**
3. **Configure**:
   - Function: `processHealthAutoExport`
   - Event source: `Time-driven`
   - Type of time: `Minutes timer`
   - Every: `60 minutes` (or your preferred interval)
4. **Click "Save"**

### Step 5: Test the Setup

1. **Run the setup function**:
   - In the script editor, select `setupSpreadsheet` from the function dropdown
   - Click the play button
   - This creates the initial sheet structure

2. **Test processing**:
   - Select `testProcessing` from the function dropdown
   - Click the play button
   - Check the logs for any errors

## 📋 What This Does

### Automatic Data Flow:
1. **Health Auto Export** app exports multiple CSV files to Google Drive
2. **Google Apps Script** checks for new files every hour
3. **Script processes** all CSV files and categorizes the data
4. **Data is added** to your Google Sheet in organized tabs

### Data Categories:
- **Workouts**: Running, cycling, swimming, strength training, etc.
- **Readiness**: HRV, resting heart rate, recovery scores
- **Sleep**: Sleep duration, quality, stages
- **Metrics**: Steps, calories, other health data

### File Processing:
- **Multiple files**: Script processes all export files automatically
- **Smart categorization**: Based on filename and content
- **Duplicate prevention**: Won't process the same file twice
- **Error handling**: Continues processing even if one file fails

## 🔧 Customization Options

### Change Check Frequency:
```javascript
CHECK_INTERVAL_MINUTES: 30  // Check every 30 minutes
```

### Add More File Patterns:
```javascript
FILE_PATTERNS: {
  WORKOUTS: ['workouts_', 'activity_', 'exercise_', 'training_'],
  HEALTH: ['health_', 'metrics_', 'heart_', 'sleep_', 'vitals_'],
  ALL: ['health_auto_export_', 'apple_health_', 'complete_']
}
```

### Add More Workout Types:
```javascript
const workoutTypes = [
  'Running', 'Cycling', 'Swimming', 'Walking', 'Hiking',
  'Strength Training', 'Yoga', 'Pilates', 'Cross Training',
  'Elliptical', 'Rowing', 'Stair Stepper', 'Dance',
  'Functional Strength Training', 'Core Training',
  'High Intensity Interval Training', 'Mixed Cardio',
  'Your Custom Workout Type'  // Add here
];
```

### Change Sheet Names:
```javascript
SHEETS: {
  WORKOUTS: 'My Workouts',
  READINESS: 'Recovery Data',
  METRICS: 'Health Metrics',
  SLEEP: 'Sleep Data'
}
```

## 🐛 Troubleshooting

### Script Not Running:
1. **Check triggers**: Go to Triggers page, ensure trigger is active
2. **Check permissions**: First run may ask for permissions
3. **Check logs**: View execution logs for errors

### Data Not Appearing:
1. **Check folder name**: Ensure Health Auto Export folder name matches
2. **Check file format**: Ensure Health Auto Export is set to CSV
3. **Check file naming**: Ensure files match the expected patterns
4. **Run test function**: Use `testProcessing()` to debug

### Multiple Files Not Processing:
1. **Check file patterns**: Ensure your export filenames match the patterns
2. **Check processed files**: Look at "ProcessedFiles" sheet to see what's been processed
3. **Manual processing**: Use `processSpecificFile('filename.csv')` to process a specific file

### Permission Errors:
1. **Enable Google Drive API**: In Apps Script, go to Services → Google Drive API
2. **Enable Google Sheets API**: In Apps Script, go to Services → Google Sheets API

## 📊 Monitoring

### View Execution Logs:
1. **In Apps Script**: Click "Executions" to see recent runs
2. **Check logs**: Each run shows processing details for each file

### Check Processed Files:
- Look at the "ProcessedFiles" sheet in your Google Sheet
- This shows which files have been processed and when

### Manual File Processing:
- Use `processSpecificFile('workouts_2024-01-15.csv')` to manually process a specific file
- Useful for testing or reprocessing files

## 🔄 Migration Path

When you're ready to extend with the Node.js agent:

1. **Keep the Google Apps Script running** for basic data collection
2. **Use the Node.js agent** for advanced analytics and features
3. **Both can read from the same Google Sheet**
4. **Gradually migrate** features as needed

## 🎯 Next Steps

Once this is set up:
1. **Test with real data** from Health Auto Export
2. **Customize the data categories** if needed
3. **Set up notifications** for errors (optional)
4. **Consider migrating to Node.js** when you want advanced features

## 📱 Health Auto Export App Tips

### Recommended Export Schedule:
- **Workouts**: Daily at 7 AM
- **Health Metrics**: Daily at 7 AM
- **All Data**: Weekly (for backup)

### File Naming Convention:
- `workouts_YYYY-MM-DD.csv`
- `health_YYYY-MM-DD.csv`
- `health_auto_export_YYYY-MM-DD.csv`

### Data Categories to Include:
- **Essential**: Workouts, HRV, Sleep, Steps, Calories
- **Optional**: Weight, Body Fat, Blood Pressure, Blood Oxygen
- **Advanced**: Sleep Stages, Heart Rate Zones, VO2 Max

## 📊 Workout Metadata Configuration

### **What Metadata is Processed:**

#### **Essential Metadata (Always Included):**
- ✅ **Duration** - Total workout time
- ✅ **Distance** - Total distance covered
- ✅ **Calories** - Active and total calories burned
- ✅ **Heart Rate** - Average, max, min, and zones
- ✅ **Pace/Speed** - Average and max pace

#### **Advanced Metadata (Sport-Specific):**
- ✅ **Power** - Average, max, normalized power (cycling)
- ✅ **Cadence** - Steps per minute (running) or RPM (cycling)
- ✅ **Elevation** - Gain, max, min elevation (outdoor activities)
- ✅ **Intervals** - Lap times and interval data
- ✅ **Weather** - Temperature and conditions (if available)

### **Metadata Aggregation Intervals:**

The script automatically aggregates data into intervals for analysis:

```javascript
METADATA_INTERVALS: {
  HEART_RATE: 1,      // 1-minute intervals for HR data
  PACE_SPEED: 5,      // 5-minute intervals for pace/speed
  POWER_CADENCE: 5,   // 5-minute intervals for power/cadence
  ELEVATION: 10,      // 10-minute intervals for elevation
  OVERALL: 5          // 5-minute intervals for general metadata
}
```

#### **Why These Intervals?**

- **1-minute HR intervals**: Perfect for heart rate variability analysis and zone training
- **5-minute pace/power**: Good balance between detail and performance for training load calculation
- **10-minute elevation**: Sufficient for elevation gain tracking without data overload

### **Customizing Intervals:**

You can adjust the intervals in the script:

```javascript
// For more detailed analysis (more data, slower processing)
METADATA_INTERVALS: {
  HEART_RATE: 0.5,    // 30-second intervals
  PACE_SPEED: 1,      // 1-minute intervals
  POWER_CADENCE: 1,   // 1-minute intervals
  ELEVATION: 5,       // 5-minute intervals
  OVERALL: 1          // 1-minute intervals
}

// For faster processing (less detail, faster performance)
METADATA_INTERVALS: {
  HEART_RATE: 5,      // 5-minute intervals
  PACE_SPEED: 10,     // 10-minute intervals
  POWER_CADENCE: 10,  // 10-minute intervals
  ELEVATION: 15,      // 15-minute intervals
  OVERALL: 10         // 10-minute intervals
}
```

### **What You'll See in Google Sheets:**

#### **Workouts Sheet:**
```
Date | Type | Value | Unit | Source | Notes | FileType | Timestamp
2024-01-15 | Running | 1800 | seconds | Health Auto Export | Easy recovery run | workouts | 2024-01-15T10:30:00Z
```

#### **WorkoutMetadata Sheet:**
```
WorkoutId | Date | Type | Duration | Distance | Calories | HeartRate | Pace | Power | Cadence | Elevation | Intervals | Weather | Timestamp
Running_20240115_123456 | 2024-01-15 | Running | 30:00 | 5.2 km | 450 | 145 avg | 5:45/km | null | 175 spm | 45m gain | 5 laps | 72°F | 2024-01-15T10:30:00Z
```

### **Training Analysis Benefits:**

#### **Heart Rate Zones:**
- Zone 1-5 breakdown for each workout
- Time in each zone for training intensity analysis
- Recovery and aerobic base tracking

#### **Power Analysis (Cycling):**
- Normalized Power (NP) calculation
- Training Stress Score (TSS) ready data
- Power curve analysis

#### **Pace Analysis (Running):**
- Average and max pace tracking
- Pace variability analysis
- Training load calculation

#### **Elevation Analysis:**
- Elevation gain tracking
- Climbing performance
- Route difficulty assessment

### **Performance Considerations:**

#### **Data Volume:**
- **1-minute intervals**: ~60 data points per hour workout
- **5-minute intervals**: ~12 data points per hour workout
- **10-minute intervals**: ~6 data points per hour workout

#### **Processing Time:**
- **Detailed intervals**: Slower processing, more data
- **Standard intervals**: Balanced performance and detail
- **Coarse intervals**: Fastest processing, less detail

#### **Storage Impact:**
- Each workout generates ~1-5 metadata records
- Metadata includes aggregated interval data
- Total storage: ~10-50KB per workout

### **Recommended Settings by Use Case:**

#### **For Triathlon Training:**
```javascript
METADATA_INTERVALS: {
  HEART_RATE: 1,      // Detailed HR analysis
  PACE_SPEED: 5,      // Good for swim/bike/run analysis
  POWER_CADENCE: 5,   // Cycling power analysis
  ELEVATION: 10,      // Route analysis
  OVERALL: 5          // Training load calculation
}
```

#### **For ACL Recovery:**
```javascript
METADATA_INTERVALS: {
  HEART_RATE: 1,      // Monitor recovery and intensity
  PACE_SPEED: 5,      // Track progress safely
  POWER_CADENCE: 5,   // Cycling rehab tracking
  ELEVATION: 10,      // Gradual progression
  OVERALL: 5          // Overall progress
}
```

#### **For General Fitness:**
```javascript
METADATA_INTERVALS: {
  HEART_RATE: 5,      // Basic HR tracking
  PACE_SPEED: 10,     // General pace tracking
  POWER_CADENCE: 10,  // Basic cycling data
  ELEVATION: 15,      // Basic elevation
  OVERALL: 10         // General tracking
}
```

## 🏋️‍♂️ Workout Data Handling (Updated)

- The script now robustly detects a wide range of workout types from Health Auto Export (e.g., "Workout", "Running", "Outdoor Run", "Cycling", etc.).
- **All workout data will be written to the `Workouts` sheet** in your Google Sheet.
- You do **not** need to manually create the `Workouts` sheet or add headers—the script will do this automatically if the sheet does not exist or is empty.
- If you want to reprocess a file (e.g., after fixing a bug or updating the script):
  1. Delete the entry for that file from the `ProcessedFiles` sheet.
  2. (Optional) Delete the `Workouts` sheet if it is empty or contains incorrect data.
  3. Re-run the script. It will recreate the sheet, add headers, and write the data.

### 🏷️ Supported Workout Types
The script recognizes all common Apple Health and Health Auto Export workout types, including but not limited to:
- Workout, Running, Outdoor Run, Indoor Run, Cycling, Outdoor Cycle, Indoor Cycle, Swimming, Walking, Hiking, Strength Training, Yoga, Pilates, Rowing, Elliptical, HIIT, Core Training, Flexibility, Sports, Dance, Martial Arts, Climbing, Skating, Skiing, Snowboarding, Surfing, Paddle Sports, Functional Strength Training, Mixed Cardio, Bootcamp, Interval Training, Treadmill, Indoor Walk, Indoor Swim, Indoor Rower, Wheelchair Walk Pace, Wheelchair Run Pace, Hand Cycling, Hockey, Soccer, Basketball, Tennis, Golf, Boxing, Rugby, Lacrosse, Cricket, Volleyball, Table Tennis, Badminton, Baseball, Softball, Football, Fencing, Wrestling, Karate, Judo, Taekwondo, Sailing, Canoeing, Kayaking, Rowing Machine, Skateboarding, Snow Sports, Ice Skating, Roller Skating, Jump Rope, Climbing Stairs, Mountain Biking, Triathlon, Duathlon, Biathlon, Multisport, Parkrun, and more.

If you use a workout type not listed here, the script will still attempt to categorize it correctly. If you find a type that is not being recognized, you can add it to the list in the script for even more robust detection.

---

**That's it! Your multiple Health Auto Export files will now automatically flow into Google Sheets every hour.** 
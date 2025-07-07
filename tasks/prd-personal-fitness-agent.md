# Product Requirements Document: Personal Fitness Agent & Physical Therapy-Informed Trainer

## Introduction/Overview

A comprehensive AI-powered personal fitness agent designed specifically for a highly motivated adult male recovering from ACL reconstruction. The agent serves as a physical therapy-informed trainer that designs, manages, and adapts triathlon training plans while respecting orthopedic constraints and promoting safe progression. The system integrates with multiple fitness platforms to track progress, provides structured guidance, and maintains a grounded, realistic coaching approach.

**Problem Statement:** Post-ACL reconstruction athletes need specialized training guidance that balances aggressive fitness goals with orthopedic safety, requiring constant adaptation based on recovery status, performance metrics, and life circumstances.

**Goal:** Create an intelligent training companion that optimizes triathlon preparation while preventing re-injury through data-driven, adaptive planning and comprehensive progress tracking.

## Goals

1. **Safe Progression Management:** Design training plans that respect ACL reconstruction recovery timeline while building toward Olympic triathlon completion by Q2 2026
2. **Comprehensive Data Integration:** Seamlessly collect and analyze fitness data from multiple sources (Apple Health, Eight Sleep, MyFitnessPal)
3. **Adaptive Planning:** Continuously adjust training based on user feedback, fatigue levels, knee condition, and external factors
4. **Progress Tracking:** Monitor and report on OKRs, performance metrics, and injury prevention indicators
5. **Educational Coaching:** Provide science-based explanations for training decisions in accessible language
6. **Privacy-First Design:** Minimize data sharing while maintaining functionality and performance
7. **PT Integration:** Seamlessly incorporate physical therapy mobility and strength work into training plans
8. **Readiness-Based Training:** Adapt training intensity and volume based on comprehensive readiness metrics

## User Stories

1. **As a recovering athlete**, I want daily training plans that adapt to my knee condition so that I can train safely without risking re-injury.

2. **As a triathlon trainee**, I want integrated swim/bike/run/strength plans that build toward my Olympic distance goal so that I can progress systematically toward race day.

3. **As a data-driven user**, I want automatic tracking of all my workouts and recovery metrics so that I can see my progress over time without manual logging.

4. **As a busy professional**, I want weekly summaries and upcoming plans delivered proactively so that I can plan my schedule around training.

5. **As a learner**, I want explanations of training decisions and underlying science so that I can understand the reasoning behind my program.

6. **As a privacy-conscious user**, I want my health data kept secure and local where possible so that I can trust the system with sensitive information.

7. **As a PT patient**, I want my mobility and strength work automatically integrated into my training plan so that I can maintain rehabilitation progress alongside fitness goals.

8. **As a calendar user**, I want training sessions automatically scheduled with accurate time estimates so that I can plan my day effectively.

9. **As a recovery-focused athlete**, I want training plans that adapt to my daily readiness based on HRV, sleep quality, and other health metrics so that I can optimize performance and prevent overtraining.

## Functional Requirements

### Core Training Management
1. The system must generate quarterly OKRs based on triathlon goals and current fitness levels
2. The system must create weekly training plans integrating swim, bike, run, strength, recovery, and PT components
3. The system must design progressive overload programs focusing on VO₂ max development and endurance building
4. The system must cycle strength training through bilateral, unilateral, and controlled explosive movements
5. The system must track mobility routines focused on posterior chain health and knee rehabilitation
6. The system must calculate and track a daily "readiness score" based on multiple data points including HRV, sleep metrics, recovery indicators, and training load
7. The system must include PT mobility and strength work in training plans and track completion
8. The system must adapt training intensity and volume based on daily readiness scores

### Data Integration & Tracking
9. The system must integrate with Apple Health via **HealthFit** for automatic workout exports (full GPS, heart-rate, power, cadence) to Google Drive in CSV/FIT format.
10. The system must integrate with **QS Access** + an Apple Shortcut for scheduled daily exports of readiness / sleep / HRV / general metrics to Google Drive in CSV format.
11. The system must ingest the HealthFit and QS Access CSV files from Google Drive, parse them, and write structured data to Google Sheets.
12. The system must track manual workout data including sets, weight, and reps for strength training
13. The system must monitor PT milestones and mobility/strength progress toward rehabilitation goals
14. The system must store all data in Google Sheets for analysis and historical tracking
15. The system must streamline overlapping inputs by updating imported workouts with user-provided details (sets, weights, etc.)
16. The system must track monthly and quarterly metrics in addition to weekly tracking
17. The system must analyze readiness trends and correlate with performance outcomes

### Communication & Planning
18. The system must provide daily training plans upon user request each morning
19. The system must send scheduled notifications for training reminders and check-ins
20. The system must automatically sync with user's calendar and include estimated time for each training session
21. The system must adjust estimated time based on user input and iteration over time
22. The system must generate weekly summary reports without prompting
23. The system must provide upcoming week's training plan proactively
24. The system must adapt missed sessions thoughtfully based on overall program goals
25. The system must explain training decisions when asked, using moderate detail for users with limited PT knowledge
26. The system must provide readiness score explanations and training recommendations based on current metrics

### Adaptive Intelligence
27. The system must learn from user feedback to improve recommendations over time
28. The system must adjust goals weekly based on user feedback, fatigue, knee condition, and travel/PT appointments
29. The system must maintain training consistency while being responsive to life circumstances
30. The system must track long-run, ride, and swim milestones for progress monitoring
31. The system must understand and merge overlapping data inputs from different sources
32. The system must learn individual readiness patterns and optimize training recommendations accordingly

### Progress Tracking & Analysis
33. The system must track weekly metrics including distance, pace, perceived effort, volume, and VO₂ max
34. The system must track monthly metrics for trend analysis and quarterly planning
35. The system must track quarterly metrics for OKR assessment and long-term progress
36. The system must monitor training plan adherence rates
37. The system must track performance improvements against OKRs
38. The system must monitor injury prevention indicators
39. The system must provide quarterly check-ins and progress reviews
40. The system must correlate readiness scores with training performance and injury risk

### Training Log Structure (Google Sheets)

The system will maintain **two dedicated tabs** in the master spreadsheet:

1. **Workouts** – one row per session (all modalities)
   | Date | Exercise | Duration | Distance | Pace | Calories | Avg HR | Notes |
   |------|----------|----------|----------|------|----------|--------|-------|
   • Strength sessions appear here with duration / calories / HR only – no set data.

2. **Strength** – detailed set data for strength sessions
   | Date | Exercise | Set | Reps | Weight | Notes |
   |------|----------|-----|------|--------|-------|
   • Each set is a separate row and links back to the parent session by Date + Exercise.

All import/parsing logic must populate these tabs automatically from HealthFit (workout summaries) and from any strength-tracking source (manual entry, future GymTrack integration).

## Non-Goals (Out of Scope)

- Real-time coaching during workouts
- Integration with healthcare providers or physical therapists (Phase 3 consideration)
- Nutrition guidance and meal planning (Phase 2 consideration)
- Social features or community aspects
- Integration with Strava (handled through Apple Health)
- Integration with Peloton (removed from scope)
- Advanced analytics requiring complex data science expertise
- Mobile app development (chatbot interface only)

## Design Considerations

- **Chatbot Interface:** Conversational, natural language interaction through OpenAI API
- **Calendar Integration:** Seamless scheduling of training sessions with appropriate time blocks and automatic time estimation
- **Data Visualization:** Clear, simple charts and progress indicators for Google Sheets
- **Notification System:** Non-intrusive, actionable alerts for training and check-ins
- **Privacy-First UI:** Clear data usage indicators and minimal data sharing
- **Data Merging:** Intelligent handling of overlapping data from multiple sources
- **Readiness Dashboard:** Clear visualization of readiness metrics and their impact on training recommendations

## Technical Considerations

- **Platform:** OpenAI API-based chatbot with webhook capabilities
- **Data Storage:** Google Sheets as primary data repository for simplicity and accessibility
- **Integrations:** Apple HealthKit (workouts + sleep + readiness metrics), Eight Sleep API, MyFitnessPal API
- **Calendar:** Google Calendar API for training session scheduling with time estimation
- **Privacy:** Local data processing where possible, minimal third-party data sharing
- **Scalability:** Prototype-focused but designed for potential expansion
- **Data Deduplication:** Logic to merge and reconcile overlapping workout data
- **Readiness Algorithm:** Multi-factor readiness scoring incorporating HRV, sleep, recovery, and training load

## Success Metrics

1. **Training Adherence:** Maintain >80% weekly training plan completion rate
2. **Performance Improvement:** Achieve VO₂ max target of 48 (from current 46.1) within 6 months
3. **Injury Prevention:** Zero ACL-related setbacks or overuse injuries
4. **Goal Achievement:** Meet weight target of 160 lbs and distance milestones (6-mile run, 40-mile bike, 1-mile swim)
5. **User Satisfaction:** Positive feedback on training plan quality and adaptability
6. **Data Accuracy:** >95% successful data integration from all connected platforms
7. **Calendar Integration:** >90% accuracy in training session time estimates
8. **PT Integration:** 100% of PT mobility/strength work included in training plans
9. **Readiness Accuracy:** >85% correlation between readiness scores and actual training performance

## Open Questions

1. What specific VO₂ max testing protocol should be used for tracking progress?
2. How should the system handle conflicting data from different platforms?
3. What backup plan should be implemented if API integrations fail?
4. How should the system handle travel weeks with limited training access?
5. What specific PT milestones should be tracked for ACL recovery progression?
6. How should the readiness score algorithm be calibrated for this specific user profile?
7. What is the preferred method for user input of PT mobility/strength work details?
8. How should the system prioritize conflicting sleep data between Apple Health and Eight Sleep?
9. What weight should be given to different readiness metrics (HRV vs. sleep vs. training load)?
10. How should the system handle missing readiness data on certain days?

## Target Timeline

- **Phase 1 (MVP):** Core training plan generation and basic data integration (4-6 weeks)
- **Phase 2:** Advanced analytics and nutrition integration (8-10 weeks)
- **Phase 3:** Healthcare provider integration and advanced features (12+ weeks)

**Race Target:** Olympic Triathlon completion by end of Q2 2026 
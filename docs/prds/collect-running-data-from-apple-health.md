# Feature Spec: Apple Health Integration for Running Workouts

## Overview

Add Apple Health integration to the goal tracker app to automatically import running workout data on app startup. The app reads new indoor/outdoor run workouts from HealthKit (since the metric was last updated) and adds the distance to a metric called "KMs run".

## Goals

- Automatically sync running data from Apple Health on app startup
- Support both indoor runs (treadmill) and outdoor runs
- Add cumulative distance to a "KMs run" metric
- Only import workouts that occurred after the metric's last update

## Technical Requirements

### Platform & Libraries

- **Platform**: iOS only (HealthKit is Apple-specific)
- **Library**: `react-native-health` (most mature React Native HealthKit library)
- **Expo consideration**: Requires a development build (not compatible with Expo Go) - this aligns with current sideloading setup

### HealthKit Permissions Required

```javascript
const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
    ],
  },
};
```

### Workout Types to Query

- `HKWorkoutActivityType.running` (outdoor runs)
- `HKWorkoutActivityType.running` with `HKWorkoutSessionLocationType.indoor` (treadmill)

In `react-native-health`, these map to:
- `AppleHealthKit.Constants.Activities.Running`

## Data Model

### Sync Reference

- Use the "KMs run" metric's `lastUpdated` timestamp as the sync anchor
- Query HealthKit for workouts that started after this timestamp
- No separate sync state needed — the metric's update time serves as the reference

### Metric Requirements

- User must manually create a metric named "KMs run" to enable sync
- If "KMs run" doesn't exist, sync is skipped silently
- Metric type: cumulative/additive (each sync adds to the total)
- Unit: kilometers
- The metric's `lastUpdated` field determines which workouts to import
- **Non-editable from home page**: This metric should not show the quick-edit controls on the home screen (prevents accidental manual updates that would advance `lastUpdated` and skip workouts)
- Still editable via the edit metric view for corrections if needed

### Metric Schema Addition

```typescript
interface Metric {
  // ... existing fields
  homeEditable?: boolean;  // If false, hide quick-edit controls on home page
                           // Default: true for backwards compatibility
}
```

When creating "KMs run" manually, user should set `homeEditable: false` (or the app could auto-set this when the metric name matches "KMs run").

## User Flow

### Initial Setup (One-time)

1. User manually creates a "KMs run" metric (with `homeEditable: false`)
2. On next app launch, app requests HealthKit permissions
3. iOS shows system permission dialog for Health data access
4. User approves access to workout data

### Automatic Sync on Startup

1. App launches
2. App checks if HealthKit permission is granted
3. If granted, query for running workouts since "KMs run" metric's `lastUpdated` date
4. If new distance found, add to "KMs run" metric (this updates `lastUpdated`)
5. Sync happens silently in background — no UI feedback needed

### Sync Logic Pseudocode

```javascript
async function syncRunningWorkoutsOnStartup() {
  // 1. Check if "KMs run" metric exists
  const metric = await getMetric('KMs run');
  if (!metric) {
    // No metric, skip sync silently
    return;
  }
  
  // 2. Check HealthKit permission
  const hasPermission = await checkHealthKitPermission();
  if (!hasPermission) {
    // Request permission on first launch, otherwise skip silently
    return;
  }
  
  // 3. Query HealthKit for workouts since metric was last updated
  const workouts = await getRunningWorkouts(
    metric.lastUpdated,
    new Date()
  );
  
  // 4. Calculate total distance (convert to km)
  const totalDistanceKm = workouts.reduce((sum, w) => {
    return sum + (w.distance / 1000); // meters to km
  }, 0);
  
  // 5. Add to metric if there's new distance
  if (totalDistanceKm > 0) {
    await addToMetric('KMs run', totalDistanceKm);
    // This updates lastUpdated, so next sync won't re-import these
  }
}
```

## Implementation Details

### Installing react-native-health

```bash
npm install react-native-health
cd ios && pod install
```

### Required iOS Configuration

**Info.plist additions:**
```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to your workout data to track your running distance.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app needs access to update your health data.</string>
```

**Xcode Capabilities:**
- Enable "HealthKit" capability in Signing & Capabilities

### Querying Workouts Example

```javascript
import AppleHealthKit from 'react-native-health';

function getRunningWorkouts(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: 'Running', // Includes both indoor and outdoor
    };
    
    AppleHealthKit.getSamples(
      {
        ...options,
        type: 'Workout',
      },
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Filter for running workouts only
        const runningWorkouts = results.filter(
          w => w.activityName === 'Running'
        );
        
        resolve(runningWorkouts);
      }
    );
  });
}
```

### Workout Data Structure from HealthKit

```javascript
{
  activityId: number,           // Activity type ID
  activityName: string,         // "Running"
  calories: number,             // Active calories
  distance: number,             // Distance in meters
  start: string,                // ISO date string
  end: string,                  // ISO date string
  sourceName: string,           // e.g., "Apple Watch"
  sourceId: string,             // Source bundle ID
  uuid: string,                 // Unique identifier - USE THIS FOR DEDUP
}
```

## Edge Cases & Considerations

### Duplicate Prevention
- Using metric's `lastUpdated` as the query start date prevents duplicates
- When we add distance to the metric, `lastUpdated` advances past those workouts
- Next sync will only find workouts newer than that timestamp

### Unit Conversion
- HealthKit returns distance in meters
- Convert to kilometers: `distanceKm = distanceMeters / 1000`
- Round to 2 decimal places for display

### Permission Denied
- If user denies HealthKit access, skip sync silently
- App functions normally without Health integration
- Don't repeatedly prompt — check permission status before requesting

### No "KMs run" Metric Exists
- Sync is skipped silently
- User must manually create the metric to enable Health sync
- This gives user control over when to start tracking

### First-Time Sync / Historical Data
- When user creates "KMs run", the metric's `lastUpdated` determines how far back to sync
- If `lastUpdated` is set to the creation time, only future workouts will be imported
- If user wants historical data, they can set the metric's initial value and adjust `lastUpdated` via edit view

### Workouts with Zero Distance
- Some workouts might have 0 distance (data issues)
- Skip these in the import (don't add 0 to metric)

### App Backgrounded During Sync
- Sync should be fast enough this isn't a concern
- If it becomes an issue, can add timeout

### Metric Manually Updated
- Editing via the edit metric view is still possible for corrections
- This will advance `lastUpdated` and may skip unsynced workouts
- Acceptable since this requires deliberate action through the edit screen

## Testing Checklist

- [ ] HealthKit permission request appears on first launch
- [ ] Permission denied is handled gracefully (app works without it)
- [ ] Sync is skipped silently if "KMs run" metric doesn't exist
- [ ] Running workouts are correctly queried
- [ ] Indoor and outdoor runs are both captured
- [ ] Distance is correctly converted to kilometers
- [ ] Only workouts after metric's `lastUpdated` are imported
- [ ] "KMs run" does not show quick-edit controls on home page
- [ ] "KMs run" is still editable via the edit metric view
- [ ] Metric value and `lastUpdated` are correctly updated after sync
- [ ] Subsequent app launches don't re-import old workouts
- [ ] Sync doesn't block app startup (runs async)

## Future Enhancements (Out of Scope for MVP)

- Background sync (sync even when app isn't opened)
- Manual "resync" option to re-import from a specific date
- Sync other workout types (cycling, swimming, etc.)
- Write data back to HealthKit
- Show workout history/details in app
- Sync to multiple metrics based on workout type
- Settings screen to enable/disable Health sync

## Files to Create/Modify

1. **New**: `src/services/healthKit.js` - HealthKit integration logic
2. **Modify**: `ios/[AppName]/Info.plist` - Add health usage descriptions
3. **Modify**: Xcode project - Enable HealthKit capability
4. **Modify**: App entry point (App.js or similar) - Call sync on startup
5. **Modify**: Metric storage/service - Add `homeEditable` field to schema
6. **Modify**: Home screen component - Respect `homeEditable` flag, hide quick-edit controls when false

## Open Questions for Implementation

1. Should the app show any indication that sync happened?
   - Could be completely silent
   - Could show a brief toast/notification if new data was imported
   - Recommendation: Silent for MVP

2. Should `homeEditable: false` be auto-set when a metric is named "KMs run"?
   - Or require user to toggle it manually when creating the metric
   - Recommendation: Auto-set based on name for simplicity
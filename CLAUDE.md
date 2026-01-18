# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Mobile App (Expo/React Native)
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator (expo run:ios)
npm run android        # Run on Android emulator (expo run:android)
```

### Server (Express API)
```bash
cd server
npm install            # Install server dependencies
npm run dev            # Start with auto-reload (nodemon)
npm start              # Start production server
```

Server requires `.env` file with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Architecture

### Overview
React Native (Expo) mobile app with Express.js REST API backend, using Supabase (PostgreSQL) for persistence.

### Metric Types
The app tracks three types of metrics:
- **cumulative**: Counter-based (tap to increment, e.g., "pages read")
- **timed**: Timer-based (tap to start/stop, logs minutes elapsed)
- **checkin**: Rating-based (opens modal for 1-10 rating, calculates averages over timeframe)

Each metric has a `timeframe` (week/month/year) that determines when it auto-resets.

### Data Flow
- `App.js` manages all state and API calls via `metricsApi` (from `api.js`)
- API uses snake_case (`current_value`), app uses camelCase (`currentValue`) - conversion happens in `App.js:loadMetrics()` and `server/database.js`
- Optimistic updates: UI updates immediately, reverts on API error

### Offline Support
The app works offline with automatic sync:
- On launch: loads cached data from AsyncStorage immediately, then syncs with API if online
- Offline changes are queued and persisted locally
- When coming back online: processes queued operations, then fetches fresh data from server
- Server wins on conflicts (single-client, no merge needed)

Offline-related files:
- `storage.js` - AsyncStorage wrapper for metrics cache and offline queue
- `networkStatus.js` - `useNetworkStatus()` hook for connectivity detection
- `offlineQueue.js` - Queue management for offline operations (create, update, increment, archive, reset)

### Key Files
- `App.js` - Main component, all metric CRUD operations, timer logic, reset checking, offline handling
- `api.js` - Axios client pointing to Vercel-hosted API
- `storage.js` - AsyncStorage persistence layer
- `networkStatus.js` - Network connectivity hook
- `offlineQueue.js` - Offline operation queue
- `components/MetricCircle.jsx` - Handles tap (action) vs double-tap (edit) detection
- `components/utils/needsReset.js` - Timeframe-based reset logic (weeks start Monday)
- `server/database.js` - Supabase queries with `dbHelpers` object
- `server/index.js` - Express routes for `/api/metrics/*`

### Database Tables
- `metrics` - Main data (title, icon, unit, timeframe, goal, current_value, type, last_reset, archived)
- `metric_logs` - History entries (metric_id, value, created_at) for averages and tracking

# Goal Tracker API Server

Express.js REST API for the Goal Tracker mobile app with Supabase (PostgreSQL) database.

## Setup

### 1. Install dependencies
```bash
cd server
npm install
```

### 2. Configure Supabase
Create a `.env` file in the server directory:

```bash
cp .env.example .env
```

Then edit `.env` with your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase project settings:
- Go to Settings → API
- Copy the Project URL → SUPABASE_URL
- Copy the anon/public key → SUPABASE_ANON_KEY

### 3. Database Schema
Ensure your Supabase database has these tables:

**metrics table:**
```sql
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  unit TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('week', 'month', 'year')),
  goal INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**metric_logs table:**
```sql
CREATE TABLE metric_logs (
  id BIGSERIAL PRIMARY KEY,
  metric_id BIGINT REFERENCES metrics(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Start the server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Metrics

#### Get all metrics
```
GET /api/metrics
```
Response:
```json
{
  "metrics": [
    {
      "id": 1,
      "title": "KMs RAN",
      "icon": "🏃",
      "unit": "KMs",
      "timeframe": "week",
      "goal": 10,
      "current_value": 5,
      "archived": false,
      "created_at": "2026-01-07T12:00:00Z",
      "updated_at": "2026-01-07T12:00:00Z"
    }
  ]
}
```

#### Get single metric
```
GET /api/metrics/:id
```

#### Create new metric
```
POST /api/metrics
Content-Type: application/json

{
  "title": "PAGES READ",
  "icon": "📚",
  "unit": "Pages",
  "timeframe": "week",
  "goal": 50,
  "currentValue": 0
}
```

#### Update metric
```
PUT /api/metrics/:id
Content-Type: application/json

{
  "title": "KMs RAN",
  "icon": "🏃",
  "unit": "KMs",
  "timeframe": "week",
  "goal": 15,
  "currentValue": 7
}
```

#### Archive metric
```
DELETE /api/metrics/:id
```

#### Increment metric value
```
POST /api/metrics/:id/increment
```
Increments the metric's current_value by 1 and creates a log entry.

### Metric Logs

#### Get logs for a metric
```
GET /api/metrics/:id/logs
```
Returns all logged entries for a specific metric.

### Sync

#### Sync all metrics
```
POST /api/sync
Content-Type: application/json

{
  "metrics": [
    {
      "id": 1,
      "title": "KMs RAN",
      "icon": "🏃",
      "unit": "KMs",
      "timeframe": "week",
      "goal": 10,
      "currentValue": 5
    }
  ]
}
```

## Technologies

- Express.js - Web framework
- Supabase - PostgreSQL database with real-time capabilities
- CORS - Cross-origin requests
- Body Parser - Request parsing
- dotenv - Environment variable management

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| SUPABASE_URL | Your Supabase project URL | https://xxxxx.supabase.co |
| SUPABASE_ANON_KEY | Your Supabase anonymous key | eyJhbGci... |
| PORT | Server port (optional, defaults to 3000) | 3001 |

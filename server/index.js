const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { dbHelpers } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Goal Tracker API is running' });
});

// ===== METRICS ENDPOINTS =====

// Get all active metrics
app.get('/api/metrics', (req, res) => {
  dbHelpers.getAllMetrics((err, metrics) => {
    if (err) {
      console.error('Error fetching metrics:', err);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
    res.json({ metrics });
  });
});

// Get a single metric by ID
app.get('/api/metrics/:id', (req, res) => {
  const { id } = req.params;

  dbHelpers.getMetricById(id, (err, metric) => {
    if (err) {
      console.error('Error fetching metric:', err);
      return res.status(500).json({ error: 'Failed to fetch metric' });
    }
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }
    res.json({ metric });
  });
});

// Create a new metric
app.post('/api/metrics', (req, res) => {
  const { title, icon, unit, timeframe, goal, currentValue, type, source } = req.body;

  // Validation
  if (!title || !icon || !unit || !timeframe) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Goal is required for cumulative/timed, optional for checkin
  if (type !== 'checkin' && goal === undefined) {
    return res.status(400).json({ error: 'Goal is required for cumulative and timed metrics' });
  }

  if (!['week', 'month', 'year'].includes(timeframe)) {
    return res.status(400).json({ error: 'Invalid timeframe. Must be week, month, or year' });
  }

  dbHelpers.createMetric(req.body, (err, metric) => {
    if (err) {
      console.error('Error creating metric:', err);
      return res.status(500).json({ error: 'Failed to create metric' });
    }
    res.status(201).json({ metric });
  });
});

// Update a metric
app.put('/api/metrics/:id', async (req, res) => {
  const { id } = req.params;
  const { title, icon, unit, timeframe, goal, currentValue } = req.body;

  // Validation
  if (!title || !icon || !unit || !timeframe || goal === undefined || currentValue === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // if value is changed, log the entry
  dbHelpers.getMetricById(id, (err, metric) => {
    if (err) {
      console.error('Error fetching metric:', err);
      return res.status(500).json({ error: 'Failed to fetch metric' });
    }
    if (metric.current_value !== currentValue) {
      // For check-in metrics, log the actual value (rating)
      // For other metrics, log the diff
      const valueToLog = metric.type === 'checkin'
        ? currentValue
        : (currentValue - (metric.current_value || 0));

      if (valueToLog !== 0 || metric.type === 'checkin') {
        dbHelpers.logMetricEntry(id, valueToLog, null, (err) => {
          if (err) {
            console.error('Error logging metric entry:', err);
          }
        });
      }
    }
  });

  dbHelpers.updateMetric(id, req.body, (err) => {
    if (err) {
      console.error('Error updating metric:', err);
      return res.status(500).json({ error: 'Failed to update metric' });
    }
    res.json({ message: 'Metric updated successfully', id: parseInt(id) });
  });
});

// Archive a metric
app.delete('/api/metrics/:id', (req, res) => {
  const { id } = req.params;

  dbHelpers.archiveMetric(id, (err) => {
    if (err) {
      console.error('Error archiving metric:', err);
      return res.status(500).json({ error: 'Failed to archive metric' });
    }
    res.json({ message: 'Metric archived successfully', id: parseInt(id) });
  });
});

// Increment a metric's value
app.post('/api/metrics/:id/increment', (req, res) => {
  const { id } = req.params;
  const { value = 1 } = req.body || {};

  dbHelpers.incrementMetric(id, value, (err) => {
    if (err) {
      console.error('Error incrementing metric:', err);
      return res.status(500).json({ error: 'Failed to increment metric' });
    }

    // Also log the entry
    dbHelpers.logMetricEntry(id, value, null, (logErr) => {
      if (logErr) {
        console.error('Error logging metric entry:', logErr);
      }

      // Get updated metric
      dbHelpers.getMetricById(id, (getErr, metric) => {
        if (getErr) {
          return res.status(500).json({ error: 'Metric incremented but failed to fetch updated data' });
        }
        res.json({ metric });
      });
    });
  });
});

// Reset a metric's current value
app.post('/api/metrics/:id/reset', (req, res) => {
  const { id } = req.params;

  dbHelpers.resetMetric(id, (err, metric) => {
    if (err) {
      console.error('Error resetting metric:', err);
      return res.status(500).json({ error: 'Failed to reset metric' });
    }
    res.json({ metric, message: 'Metric reset successfully' });
  });
});

// ===== METRIC LOGS ENDPOINTS =====

// Get logs for a specific metric
app.get('/api/metrics/:id/logs', (req, res) => {
  const { id } = req.params;

  dbHelpers.getMetricLogs(id, (err, logs) => {
    if (err) {
      console.error('Error fetching metric logs:', err);
      return res.status(500).json({ error: 'Failed to fetch metric logs' });
    }
    res.json({ logs });
  });
});

// Log a new entry for a metric (with optional externalId for deduplication)
app.post('/api/metrics/:id/log', (req, res) => {
  const { id } = req.params;
  const { value, externalId } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'Missing required field: value' });
  }

  // Get current metric to update its value
  dbHelpers.getMetricById(id, (err, metric) => {
    if (err) {
      console.error('Error fetching metric:', err);
      return res.status(500).json({ error: 'Failed to fetch metric' });
    }
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    // Log the entry (with optional externalId)
    dbHelpers.logMetricEntry(id, value, externalId, (logErr, logResult) => {
      if (logErr) {
        console.error('Error logging metric entry:', logErr);
        return res.status(500).json({ error: 'Failed to log metric entry' });
      }

      // If duplicate, return success but indicate no change
      if (logResult.duplicate) {
        return res.json({
          message: 'Entry already exists (duplicate externalId)',
          duplicate: true,
          logId: logResult.id
        });
      }

      // Update the metric's current value
      const newValue = Math.round(((metric.current_value || 0) + value) * 100) / 100;
      dbHelpers.updateMetric(id, {
        title: metric.title,
        icon: metric.icon,
        unit: metric.unit,
        timeframe: metric.timeframe,
        goal: metric.goal,
        currentValue: newValue,
        type: metric.type
      }, (updateErr) => {
        if (updateErr) {
          console.error('Error updating metric value:', updateErr);
          // Log was created but value update failed - still return success
        }

        res.status(201).json({
          message: 'Entry logged successfully',
          log: logResult,
          newValue: newValue
        });
      });
    });
  });
});

// Get metric total/average for a given date range
// Returns total for cumulative/timed metrics, average for checkin metrics
app.get('/api/metrics/:id/total', (req, res) => {
  const { id } = req.params;
  const { dateFrom, dateTo } = req.query;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'Missing required query parameters: dateFrom and dateTo' });
  }

  dbHelpers.getMetricTotal(id, dateFrom, dateTo, (err, result) => {
    if (err) {
      console.error('Error fetching metric total:', err);
      if (err.message === 'Metric not found') {
        return res.status(404).json({ error: 'Metric not found' });
      }
      if (err.message === 'Invalid date format') {
        return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 format (e.g., 2026-01-20)' });
      }
      return res.status(500).json({ error: 'Failed to fetch metric total' });
    }
    res.json(result);
  });
});

// ===== SYNC ENDPOINT =====

// Sync all metrics from the app
app.post('/api/sync', (req, res) => {
  const { metrics } = req.body;

  if (!metrics || !Array.isArray(metrics)) {
    return res.status(400).json({ error: 'Invalid sync data. Expected metrics array' });
  }

  let processed = 0;
  let errors = [];

  metrics.forEach((metric) => {
    if (metric.id) {
      // Update existing metric
      dbHelpers.updateMetric(metric.id, metric, (err) => {
        processed++;
        if (err) {
          errors.push({ id: metric.id, error: err.message });
        }

        if (processed === metrics.length) {
          sendSyncResponse();
        }
      });
    } else {
      // Create new metric
      dbHelpers.createMetric(metric, (err) => {
        processed++;
        if (err) {
          errors.push({ metric, error: err.message });
        }

        if (processed === metrics.length) {
          sendSyncResponse();
        }
      });
    }
  });

  function sendSyncResponse() {
    if (errors.length > 0) {
      res.status(207).json({
        message: 'Sync completed with errors',
        processed: processed - errors.length,
        errors
      });
    } else {
      res.json({
        message: 'Sync completed successfully',
        processed
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Goal Tracker API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/metrics\n`);
});

module.exports = app;

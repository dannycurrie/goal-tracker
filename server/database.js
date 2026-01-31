require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Connected to Supabase database');

// Database query helpers
const dbHelpers = {
  // Get all active metrics
  getAllMetrics: async (callback) => {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Get a single metric by ID
  getMetricById: async (id, callback) => {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Create a new metric
  createMetric: async (metric, callback) => {
    try {
      const { title, icon, unit, timeframe, goal, currentValue = 0, type = 'cumulative', source = 'user' } = metric;

      const { data, error } = await supabase
        .from('metrics')
        .insert([{
          title,
          icon,
          unit,
          timeframe,
          goal,
          current_value: currentValue,
          type,
          source,
          archived: false
        }])
        .select()
        .single();

      if (error) throw error;

      // Convert snake_case to camelCase for response
      const formattedData = {
        id: data.id,
        title: data.title,
        icon: data.icon,
        unit: data.unit,
        timeframe: data.timeframe,
        goal: data.goal,
        currentValue: data.current_value,
        type: data.type,
        source: data.source,
        archived: data.archived,
        lastReset: data.last_reset,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      callback(null, formattedData);
    } catch (error) {
      callback(error);
    }
  },

  // Update a metric
  updateMetric: async (id, metric, callback) => {
    try {
      const { title, icon, unit, timeframe, goal, currentValue, type } = metric;

      const updateData = {
        title,
        icon,
        unit,
        timeframe,
        goal,
        current_value: currentValue,
        updated_at: new Date().toISOString()
      };

      // Include type if provided
      if (type) {
        updateData.type = type;
      }

      const { data, error } = await supabase
        .from('metrics')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Archive a metric
  archiveMetric: async (id, callback) => {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .update({
          archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Increment metric value
  incrementMetric: async (id, callback) => {
    try {
      // First get the current value
      const { data: metric, error: getError } = await supabase
        .from('metrics')
        .select('current_value')
        .eq('id', id)
        .single();

      if (getError) throw getError;

      // Increment and update
      const { data, error } = await supabase
        .from('metrics')
        .update({
          current_value: (metric.current_value || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Log a metric entry
  // externalId can be null, or a string like "HK:uuid" for Apple Health deduplication
  logMetricEntry: async (metricId, value, externalId, callback) => {
    try {
      // If externalId is provided, check for duplicates first
      if (externalId) {
        const { data: existing, error: checkError } = await supabase
          .from('metric_logs')
          .select('id')
          .eq('metric_id', metricId)
          .eq('external_id', externalId)
          .maybeSingle();

        if (checkError) throw checkError;

        // Skip if this external_id already exists for this metric
        if (existing) {
          callback(null, { duplicate: true, id: existing.id });
          return;
        }
      }

      const insertData = {
        metric_id: metricId,
        value: value
      };
      if (externalId) {
        insertData.external_id = externalId;
      }

      const { data, error } = await supabase
        .from('metric_logs')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        id: data.id,
        metricId: data.metric_id,
        value: data.value,
        externalId: data.external_id,
        createdAt: data.created_at
      };

      callback(null, formattedData);
    } catch (error) {
      callback(error);
    }
  },

  // Get logs for a metric
  getMetricLogs: async (metricId, callback) => {
    try {
      const { data, error } = await supabase
        .from('metric_logs')
        .select('*')
        .eq('metric_id', metricId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert snake_case to camelCase
      const formattedData = data.map(log => ({
        id: log.id,
        metricId: log.metric_id,
        value: log.value,
        externalId: log.external_id,
        createdAt: log.created_at
      }));

      callback(null, formattedData);
    } catch (error) {
      callback(error);
    }
  },

  // Reset a metric's current value
  resetMetric: async (id, callback) => {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .update({
          current_value: 0,
          last_reset: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  },

  // Get metric total/average for a given date range
  getMetricTotal: async (metricId, dateFrom, dateTo, callback) => {
    try {
      // First get the metric to determine its type
      const { data: metric, error: metricError } = await supabase
        .from('metrics')
        .select('*')
        .eq('id', metricId)
        .single();

      if (metricError) throw metricError;
      if (!metric) {
        callback(new Error('Metric not found'));
        return;
      }

      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        callback(new Error('Invalid date format'));
        return;
      }

      // Fetch logs within the date range
      const { data: logs, error: logsError } = await supabase
        .from('metric_logs')
        .select('*')
        .eq('metric_id', metricId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      let result;

      if (metric.type === 'checkin') {
        // For check-in metrics, calculate average
        if (logs.length === 0) {
          result = {
            metricId: metric.id,
            title: metric.title,
            type: metric.type,
            value: null,
            count: 0,
            dateFrom: startDate.toISOString(),
            dateTo: endDate.toISOString()
          };
        } else {
          const sum = logs.reduce((acc, log) => acc + Number(log.value), 0);
          const average = sum / logs.length;
          result = {
            metricId: metric.id,
            title: metric.title,
            type: metric.type,
            value: Math.round(average * 100) / 100, // Round to 2 decimal places
            count: logs.length,
            dateFrom: startDate.toISOString(),
            dateTo: endDate.toISOString()
          };
        }
      } else {
        // For cumulative and timed metrics, calculate total
        const total = logs.reduce((acc, log) => acc + Number(log.value), 0);
        result = {
          metricId: metric.id,
          title: metric.title,
          type: metric.type,
          value: total,
          count: logs.length,
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString()
        };
      }

      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = { supabase, dbHelpers };

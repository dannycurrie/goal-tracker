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
      const { title, icon, unit, timeframe, goal, currentValue = 0, type = 'cumulative' } = metric;

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
        archived: data.archived,
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
  logMetricEntry: async (metricId, value, callback) => {
    try {
      const { data, error } = await supabase
        .from('metric_logs')
        .insert([{
          metric_id: metricId,
          value: value
        }])
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        id: data.id,
        metricId: data.metric_id,
        value: data.value,
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
        createdAt: log.created_at
      }));

      callback(null, formattedData);
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = { supabase, dbHelpers };

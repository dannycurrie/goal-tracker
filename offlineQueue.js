import { storage } from './storage';
import { logger } from './logger';

// Operation types
export const OP_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  INCREMENT: 'increment',
  ARCHIVE: 'archive',
  RESET: 'reset',
};

let queue = [];

export const offlineQueue = {
  // Initialize queue from storage
  init: async () => {
    queue = await storage.loadOfflineQueue();
    return queue;
  },

  // Add operation to queue
  add: async (type, metricId, payload = null) => {
    const operation = {
      id: Date.now().toString(),
      type,
      metricId,
      payload,
      timestamp: new Date().toISOString(),
    };
    queue.push(operation);
    await storage.saveOfflineQueue(queue);
    return operation;
  },

  // Get current queue
  getQueue: () => queue,

  // Check if queue has pending operations
  hasPending: () => queue.length > 0,

  // Process all queued operations
  processQueue: async (metricsApi) => {
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remainingQueue = [];

    for (const op of queue) {
      try {
        await executeOperation(op, metricsApi);
        processed++;
      } catch (error) {
        // If 404, the metric was deleted on server - skip it
        if (error.response?.status === 404) {
          logger.info('Skipping operation for deleted metric', { metricId: op.metricId, opId: op.id });
          processed++;
        } else {
          logger.error('Failed to process offline operation', { opId: op.id, type: op.type, metricId: op.metricId, error: String(error) });
          remainingQueue.push(op);
          failed++;
        }
      }
    }

    queue = remainingQueue;
    await storage.saveOfflineQueue(queue);

    return { processed, failed };
  },

  // Clear the queue
  clear: async () => {
    queue = [];
    await storage.saveOfflineQueue(queue);
  },
};

// Execute a single operation
const executeOperation = async (op, metricsApi) => {
  switch (op.type) {
    case OP_TYPES.CREATE:
      await metricsApi.create(op.payload);
      break;
    case OP_TYPES.UPDATE:
      await metricsApi.update(op.metricId, op.payload);
      break;
    case OP_TYPES.INCREMENT:
      await metricsApi.increment(op.metricId);
      break;
    case OP_TYPES.ARCHIVE:
      await metricsApi.archive(op.metricId);
      break;
    case OP_TYPES.RESET:
      await metricsApi.reset(op.metricId);
      break;
    default:
      logger.warn('Unknown operation type', { type: op.type, opId: op.id });
  }
};

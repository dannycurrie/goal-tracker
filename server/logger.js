const BETTERSTACK_SOURCE_TOKEN = 'ivywDZYnpNnN8AfWzTLu9cQG';
const BETTERSTACK_URL = 'https://in.logs.betterstack.com';

const fmtErr = (err) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
};

const send = async (level, message, data = {}) => {
  try {
    const payload = { ...data };
    if (payload.error !== undefined) payload.error = fmtErr(payload.error);
    await fetch(BETTERSTACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BETTERSTACK_SOURCE_TOKEN}`,
      },
      body: JSON.stringify({
        dt: new Date().toISOString(),
        level,
        message,
        source: 'server',
        ...payload,
      }),
    });
  } catch (e) {
    // Silently fail - logging should never break the server
  }
};

const logger = {
  info: (message, data) => send('info', message, data),
  warn: (message, data) => send('warn', message, data),
  error: (message, data) => send('error', message, data),
};

module.exports = { logger };

const BETTERSTACK_SOURCE_TOKEN = 'ivywDZYnpNnN8AfWzTLu9cQG';
const BETTERSTACK_URL = 'https://in.logs.betterstack.com';

const send = async (level, message, data = {}) => {
  try {
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
        ...data,
      }),
    });
  } catch (e) {
    // Silently fail - logging should never break the app
  }
};

export const logger = {
  info: (message, data) => send('info', message, data),
  warn: (message, data) => send('warn', message, data),
  error: (message, data) => send('error', message, data),
};

'use strict';

module.exports = function protectCalls(io) {
  const origins = new Set((process.env.MUSHROOM_VIDEO_ORIGIN ?? '').split(',').filter(Boolean));
  const secret = process.env.CHAT_VIDEO_SECRET;
  const endpoint = process.env.MUSHROOM_VIDEO_LEASE_URL;
  if (!origins.size || !endpoint || !secret || secret.length < 43) throw new Error('Invalid Mushroom video configuration');

  async function verify(body) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-chat-video-secret': secret },
      body: JSON.stringify(body), signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('Call unavailable');
    return response.json();
  }

  io.use(async (socket, next) => {
    const { code } = socket.handshake.auth;
    if (!origins.has(socket.handshake.headers.origin) || typeof code !== 'string' || !/^[\w-]{43}$/.test(code)) return next(new Error('Call unavailable'));
    try {
      socket.mushroom = await verify({ code });
      next();
    } catch { next(new Error('Call unavailable')); }
  });

  io.on('connection', socket => {
    const { callId, userId } = socket.mushroom;
    socket.emit('mushroom-lease', { callId });
    socket.on('mushroom-connected', async reply => {
      if (typeof reply !== 'function') return;
      try { await verify({ callId, userId, action: 'connected' }); reply(true); }
      catch { reply(false); }
    });
    const interval = setInterval(async () => {
      try {
        await verify({ callId, userId });
        socket.emit('mushroom-lease', { callId });
      } catch {
        socket.emit('mushroom-ended');
        socket.disconnect(true);
      }
    }, 5000);
    socket.on('disconnect', () => clearInterval(interval));
    socket.on('mushroom-end', async reply => {
      if (typeof reply !== 'function') return;
      try { await verify({ callId, userId, action: 'end' }); reply(true); }
      catch { reply(false); }
    });
  });
};

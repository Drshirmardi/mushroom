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
    if (!response.ok) {
      const error = new Error('Call unavailable');
      error.terminal = response.status >= 400 && response.status < 500 && response.status !== 429;
      const payload = await response.json().catch(() => null);
      error.endReason = payload?.details?.endReason;
      throw error;
    }
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
    socket.on('mushroom-restart-ice', peerId => {
      if (typeof peerId !== 'string') return;
      const other = io.sockets.sockets.get(peerId);
      if (other?.mushroom?.callId === callId && other.mushroom.userId !== userId &&
          Object.hasOwn(socket.channels ?? {}, callId) && Object.hasOwn(other.channels ?? {}, callId)) other.emit('mushroom-restart-ice', { peerId: socket.id });
    });
    let leaseTimer;
    let lastVerified = Date.now();
    let renewing = false;
    async function renew() {
      if (renewing) return;
      renewing = true;
      try {
        await verify({ callId, userId, ...(Object.hasOwn(socket.channels ?? {}, callId) ? { action: 'lease' } : {}) });
        lastVerified = Date.now();
        socket.emit('mushroom-lease', { callId });
      } catch (error) {
        if (error.terminal) {
          socket.emit('mushroom-ended', { reason: error.endReason });
          socket.disconnect(true);
        } else if (Date.now() - lastVerified >= 30_000) {
          socket.disconnect(true);
        } else socket.emit('mushroom-lease-delayed');
      } finally {
        renewing = false;
        if (socket.connected) leaseTimer = setTimeout(renew, 5000);
      }
    }
    leaseTimer = setTimeout(renew, 5000);
    socket.mushroomRenewLease = () => { clearTimeout(leaseTimer); void renew(); };
    socket.on('disconnect', () => clearTimeout(leaseTimer));
    socket.on('mushroom-end', async reply => {
      if (typeof reply !== 'function') return;
      try { await verify({ callId, userId, action: 'end' }); reply(true); }
      catch { reply(false); }
    });
  });
};

'use strict';

const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const videoRequested = params.get('mode') !== 'AUDIO';
const relayOnly = params.get('relayOnly') === 'true';
const embedOrigin = params.get('embedOrigin');
function notifyParent(type) {
  if (!embedOrigin || parent === window) return;
  try {
    const origin = new URL(embedOrigin);
    if (['http:', 'https:'].includes(origin.protocol) && origin.origin === embedOrigin) parent.postMessage({ type }, origin.origin);
  } catch { /* A standalone call has no host to notify. */ }
}
const signal = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
const status = byId('status');
const remote = byId('remote');
const local = byId('local');
let socket;
let stream;
let peer;
let peerId;
let lease;
let candidates = [];
let videoSender;
let mediaState;
let cameraBusy = false;
let connectedSince;
let clock;
let connectionEpoch = 0;
let peerTimer;

function showCamera(kind, enabled) {
  document.body.dataset[kind + 'Video'] = String(enabled);
}

function shareCameraState() {
  if (mediaState?.readyState === 'open') mediaState.send(stream?.getVideoTracks().length ? 'camera:on' : 'camera:off');
}

function configureMediaState(channel) {
  mediaState = channel;
  channel.onopen = shareCameraState;
  channel.onmessage = ({ data }) => {
    if (data === 'camera:on' || data === 'camera:off') showCamera('remote', data === 'camera:on');
  };
}

function startClock() {
  if (clock) return;
  connectedSince = Date.now();
  const update = () => {
    const seconds = Math.floor((Date.now() - connectedSince) / 1000);
    byId('duration').textContent = [Math.floor(seconds / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  };
  update();
  clock = setInterval(update, 1000);
}

function confirmConnection(connection) {
  if (peer !== connection || connection.connectionState !== 'connected') return;
  socket.timeout(3500).emit('mushroom-connected', (error, accepted) => {
    if (error || !accepted) setTimeout(() => confirmConnection(connection), 2500);
  });
}

function closePeer() {
  clearTimeout(peerTimer);
  const previous = peer;
  peer = undefined;
  previous?.close();
  videoSender = undefined;
  mediaState = undefined;
  showCamera('remote', false);
  peer = undefined;
  peerId = undefined;
  candidates = [];
  remote.srcObject = null;
}

function stop(message) {
  ++connectionEpoch;
  clearTimeout(lease);
  clearInterval(clock);
  clock = undefined;
  closePeer();
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
  showCamera('local', false);
  local.srcObject = null;
  socket?.disconnect();
  byId('microphone').disabled = true;
  byId('camera').disabled = true;
  byId('end').disabled = true;
  status.textContent = message;
}

function failed() {
  stop('اتصال قطع شد. برای اتصال مجدد از پنل ویزیت استفاده کنید.');
  notifyParent('mushroom-call:recover');
}

async function connect() {
  byId('connect').disabled = true;
  const epoch = ++connectionEpoch;
  let acquired;
  try {
    acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    status.textContent = 'دسترسی به دوربین یا میکروفون ممکن نیست. مجوز مرورگر را بررسی کنید.';
    byId('connect').disabled = false;
    notifyParent('mushroom-call:recover');
    return;
  }
  if (epoch !== connectionEpoch) { acquired.getTracks().forEach(track => track.stop()); return; }
  stream = acquired;
  if (videoRequested) {
    try {
      const camera = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      if (epoch !== connectionEpoch) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.addTrack(camera.getVideoTracks()[0]);
    } catch {
      byId('media-note').textContent = 'دوربین در دسترس نیست؛ تماس با صدا ادامه دارد.';
    }
  }
  if (epoch !== connectionEpoch) return;
  notifyParent('mushroom-call:ready');
  local.srcObject = stream;
  showCamera('local', stream.getVideoTracks().length > 0);
  byId('camera').setAttribute('aria-pressed', String(stream.getVideoTracks().length > 0));
  byId('connect').hidden = true;
  status.textContent = 'در حال اتصال به ویزیت…';
  socket = io({ transports: ['websocket'], auth: { code: signal }, reconnection: false });
  let joined = false;
  lease = setTimeout(failed, 12_000);
  socket.on('mushroom-lease', ({ callId }) => {
    clearTimeout(lease);
    lease = setTimeout(failed, 12_000);
    if (!joined) {
      joined = true;
      socket.emit('join', { channel: callId, peerInfo: {} });
    }
  });
  socket.on('connect_error', failed);
  socket.on('disconnect', reason => { if (reason !== 'io client disconnect') failed(); });
  socket.on('mushroom-ended', () => stop('تماس پایان یافته است.'));
  socket.on('serverInfo', () => {
    byId('end').disabled = false;
    byId('microphone').disabled = !stream.getAudioTracks().length;
    byId('camera').disabled = !videoSender;
    if (!peer) status.textContent = 'در انتظار اتصال طرف مقابل…';
  });
  socket.on('addPeer', async ({ peerId: id, shouldCreateOffer, iceServers }) => {
    try {
      if (peer) closePeer();
      peerId = id;
      const connection = new RTCPeerConnection({ iceServers, iceTransportPolicy: relayOnly ? 'relay' : 'all' });
      peer = connection;
      const [audioTrack] = stream.getAudioTracks();
      connection.addTrack(audioTrack, stream);
      if (shouldCreateOffer) {
        const [videoTrack] = stream.getVideoTracks();
        videoSender = connection.addTransceiver(videoTrack ?? 'video', { direction: 'sendrecv', streams: [stream] }).sender;
        configureMediaState(connection.createDataChannel('mushroom-media'));
      } else {
        connection.ondatachannel = ({ channel }) => {
          if (channel.label === 'mushroom-media') configureMediaState(channel);
          else channel.close();
        };
      }
      const remoteStream = new MediaStream();
      connection.ontrack = ({ track }) => {
        if (peer !== connection) return;
        remoteStream.addTrack(track);
        remote.srcObject = remoteStream;
        remote.play().catch(() => { byId('audio').hidden = false; });
      };
      connection.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('relayICE', { peerId: id, iceCandidate: candidate.toJSON() });
      };
      connection.onconnectionstatechange = () => {
        if (peer !== connection) return;
        clearTimeout(peerTimer);
        if (connection.connectionState === 'connected') {
          status.textContent = 'تماس برقرار است.';
          byId('camera').disabled = false;
          startClock();
          confirmConnection(connection);
        }
        if (connection.connectionState === 'failed') failed();
        if (connection.connectionState === 'disconnected') {
          status.textContent = 'در حال بازیابی اتصال…';
          peerTimer = setTimeout(() => { if (peer === connection && connection.connectionState === 'disconnected') failed(); }, 15_000);
        }
      };
      if (shouldCreateOffer) {
        await connection.setLocalDescription(await connection.createOffer());
        socket.emit('relaySDP', { peerId: id, sessionDescription: connection.localDescription });
      }
    } catch { failed(); }
  });
  socket.on('sessionDescription', async ({ peerId: id, sessionDescription }) => {
    if (!peer || id !== peerId) return;
    try {
      const connection = peer;
      await connection.setRemoteDescription(sessionDescription);
      if (peer !== connection) return;
      for (const candidate of candidates.splice(0)) await connection.addIceCandidate(candidate);
      if (sessionDescription.type === 'offer') {
        const video = connection.getTransceivers().find(item => item.receiver.track.kind === 'video');
        if (!video) throw new Error('Missing video transceiver');
        video.direction = 'sendrecv';
        videoSender = video.sender;
        videoSender.setStreams(stream);
        await videoSender.replaceTrack(stream.getVideoTracks()[0] ?? null);
        await connection.setLocalDescription(await connection.createAnswer());
        if (peer === connection) socket.emit('relaySDP', { peerId: id, sessionDescription: connection.localDescription });
      }
    } catch { failed(); }
  });
  socket.on('iceCandidate', async ({ peerId: id, iceCandidate }) => {
    if (!peer || id !== peerId || !iceCandidate) return;
    try {
      if (peer.remoteDescription) await peer.addIceCandidate(iceCandidate);
      else candidates.push(iceCandidate);
    } catch { /* Later valid candidates may still establish the call. */ }
  });
  socket.on('removePeer', ({ peerId: id }) => {
    if (id !== peerId) return;
    closePeer();
    byId('camera').disabled = true;
    status.textContent = 'در انتظار اتصال مجدد طرف مقابل…';
  });
}

byId('connect').addEventListener('click', connect);
byId('end').addEventListener('click', () => {
  byId('end').disabled = true;
  socket.timeout(5000).emit('mushroom-end', (error, closed) => {
    if (error || !closed) {
      if (!socket?.connected) { failed(); return; }
      byId('end').disabled = false;
      status.textContent = 'پایان تماس تأیید نشد. دوباره تلاش کنید.';
      return;
    }
    stop('تماس پایان یافت.');
  });
});
byId('audio').addEventListener('click', () => remote.play().then(() => { byId('audio').hidden = true; }).catch(() => {}));
byId('microphone').addEventListener('click', event => {
  const track = stream?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  event.currentTarget.setAttribute('aria-pressed', String(track.enabled));
});

byId('camera').addEventListener('click', async () => {
  const sender = videoSender;
  if (!sender || !stream || cameraBusy) return;
  const button = byId('camera');
  const existing = stream.getVideoTracks()[0];
  cameraBusy = true;
  button.disabled = true;
  let acquired;
  try {
    if (existing) {
      await sender.replaceTrack(null);
      if (stream) stream.removeTrack(existing);
      existing.stop();
    } else {
      acquired = (await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })).getVideoTracks()[0];
      if (!stream || sender !== videoSender) return;
      await sender.replaceTrack(acquired);
      if (!stream || sender !== videoSender) return;
      stream.addTrack(acquired);
      acquired = undefined;
    }
    const enabled = Boolean(stream?.getVideoTracks().length);
    button.setAttribute('aria-pressed', String(enabled));
    showCamera('local', enabled);
    shareCameraState();
    byId('media-note').textContent = '';
  } catch {
    byId('media-note').textContent = 'تغییر وضعیت دوربین ممکن نشد؛ صدا همچنان برقرار است.';
  } finally {
    acquired?.stop();
    cameraBusy = false;
    button.disabled = !videoSender;
  }
});
window.addEventListener('pagehide', () => stop('تماس قطع شد.'));

'use strict';

const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const videoRequested = params.has('camera') ? params.get('camera') === 'true' : params.get('mode') !== 'AUDIO';
const checkResumePermission = params.get('resume') === '1';
const microphoneRequested = params.get('microphone') !== 'false';
const relayOnly = params.get('relayOnly') === 'true';
const embedOrigin = params.get('embedOrigin');
const embedded = Boolean(embedOrigin && parent !== window);
const autoJoin = embedded && params.get('autoJoin') === '1';
function notifyParent(type, details) {
  if (!embedded) return;
  try {
    const origin = new URL(embedOrigin);
    if (['http:', 'https:'].includes(origin.protocol) && origin.origin === embedOrigin) parent.postMessage({ type, ...details }, origin.origin);
  } catch { /* A standalone call has no host to notify. */ }
}
const signal = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
const status = byId('status');
const remote = byId('remote');
const remoteAudio = byId('remote-audio');
const playAudioButton = byId('audio');
const local = byId('local');
const connectButton = byId('connect');
const endButton = byId('end');
if (embedded) document.body.dataset.embedded = 'true';
let socket;
let stream;
let peer;
let peerId;
let lease;
let candidates = [];
let videoSender;
let mediaState;
let cameraBusy = false;
let cameraDenied = false;
let connectedSince;
let clock;
let connectionEpoch = 0;
let peerTimer;
let audioTimer;

function showCamera(kind, enabled) {
  document.body.dataset[kind + 'Video'] = String(enabled);
  if (kind === 'remote') notifyParent('mushroom-call:remote-video', {
    visible: enabled, aspect: remote.videoHeight ? remote.videoWidth / remote.videoHeight : undefined,
  });
}

function sendMediaState() {
  notifyParent('mushroom-call:media-state', {
    microphone: stream?.getAudioTracks()[0]?.enabled === true,
    camera: Boolean(stream?.getVideoTracks().length),
    denied: cameraDenied,
  });
}

remote.addEventListener('resize', () => showCamera('remote', document.body.dataset.remoteVideo === 'true'));

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

function playRemoteAudio() {
  const source = remoteAudio.srcObject;
  if (!source) return;
  clearTimeout(audioTimer);
  audioTimer = setTimeout(() => {
    if (remoteAudio.srcObject === source) playAudioButton.hidden = false;
  }, 1000);
  remoteAudio.play().catch(() => {
    if (remoteAudio.srcObject !== source) return;
    clearTimeout(audioTimer);
    playAudioButton.hidden = false;
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
  remoteAudio.srcObject = null;
  clearTimeout(audioTimer);
  playAudioButton.hidden = true;
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

function reportCallFailure(stage, error) {
  console.warn('[Mushroom call]', {
    stage,
    errorType: error instanceof DOMException ? error.name : error instanceof Error ? 'Error' : undefined,
    signalingState: peer?.signalingState,
    iceConnectionState: peer?.iceConnectionState,
    connectionState: peer?.connectionState,
  });
}

function failed(stage, error) {
  reportCallFailure(stage, error);
  const microphone = stream?.getAudioTracks()[0]?.enabled ?? microphoneRequested;
  const camera = Boolean(stream?.getVideoTracks().length);
  stop('در حال اتصال مجدد…');
  notifyParent('mushroom-call:recover', { microphone, camera });
}

async function connect() {
  if (!signal || typeof io !== 'function') {
    failed('signaling-unavailable');
    return;
  }
  connectButton.disabled = true;
  connectButton.hidden = true;
  status.textContent = 'در حال اتصال به ویزیت…';
  const epoch = ++connectionEpoch;
  let acquired;
  try {
    if (checkResumePermission) {
      const permission = await navigator.permissions?.query({ name: 'microphone' }).catch(() => undefined);
      if (permission?.state === 'prompt') throw new DOMException('Waiting for user interaction', 'UserGestureRequired');
      if (permission?.state === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
    }
    acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (epoch !== connectionEpoch) return;
    reportCallFailure('microphone', error);
    status.textContent = 'دسترسی به دوربین یا میکروفون ممکن نیست. مجوز مرورگر را بررسی کنید.';
    connectButton.disabled = false;
    connectButton.hidden = embedded;
    notifyParent('mushroom-call:recover', { permission: true, reason: error?.name });
    return;
  }
  if (epoch !== connectionEpoch) { acquired.getTracks().forEach(track => track.stop()); return; }
  stream = acquired;
  stream.getAudioTracks()[0].enabled = microphoneRequested;
  byId('microphone').setAttribute('aria-pressed', String(microphoneRequested));
  if (videoRequested) {
    try {
      const camera = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      if (epoch !== connectionEpoch) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.addTrack(camera.getVideoTracks()[0]);
    } catch (error) {
      cameraDenied = error?.name === 'NotAllowedError';
      byId('media-note').textContent = 'دوربین در دسترس نیست. مجوز دوربین و برنامه‌های باز را بررسی کنید؛ تماس با صدا ادامه دارد.';
    }
  }
  if (epoch !== connectionEpoch) return;
  local.srcObject = stream;
  showCamera('local', stream.getVideoTracks().length > 0);
  byId('camera').setAttribute('aria-pressed', String(stream.getVideoTracks().length > 0));
  socket = io({ transports: ['websocket'], auth: { code: signal }, reconnection: false });
  let joined = false;
  let leaseDelayed = false;
  lease = setTimeout(() => failed('signaling-lease-timeout'), 30_000);
  socket.on('mushroom-lease', ({ callId }) => {
    if (leaseDelayed && peer?.connectionState === 'connected') {
      status.textContent = 'تماس برقرار است.';
      notifyParent('mushroom-call:connected');
    }
    leaseDelayed = false;
    clearTimeout(lease);
    lease = setTimeout(() => failed('signaling-lease-timeout'), 30_000);
    if (!joined) {
      joined = true;
      socket.emit('join', { channel: callId, peerInfo: {} });
    }
  });
  socket.on('connect_error', () => failed('signaling-connect'));
  socket.on('mushroom-replaced', () => {
    stop('تماس در تب یا دستگاه دیگری ادامه دارد.');
    notifyParent('mushroom-call:replaced');
  });
  socket.on('disconnect', reason => { if (reason !== 'io client disconnect') failed('signaling-disconnect'); });
  socket.on('mushroom-lease-delayed', () => {
    leaseDelayed = true;
    status.textContent = 'در حال اتصال مجدد…';
    notifyParent('mushroom-call:recovering');
  });
  socket.on('mushroom-ended', ({ reason } = {}) => { stop('تماس پایان یافته است.'); notifyParent('mushroom-call:ended', { reason }); });
  socket.on('serverInfo', () => {
    endButton.hidden = false;
    endButton.disabled = false;
    notifyParent('mushroom-call:ready');
    sendMediaState();
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
      connection.ontrack = ({ track }) => {
        if (peer !== connection) return;
        if (track.kind === 'audio') {
          remoteAudio.srcObject = new MediaStream([track]);
          playRemoteAudio();
        } else if (track.kind === 'video') {
          remote.srcObject = new MediaStream([track]);
        }
      };
      connection.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('relayICE', { peerId: id, iceCandidate: candidate.toJSON() });
      };
      connection.onicecandidateerror = ({ errorCode }) => {
        if (peer === connection) console.warn('[Mushroom call]', { stage: 'ice-gathering', errorCode });
      };
      let restarting = false;
      async function restartMedia() {
        if (peer !== connection || restarting) return;
        restarting = true;
        status.textContent = 'در حال اتصال مجدد…';
        notifyParent('mushroom-call:recovering');
        peerTimer = setTimeout(() => {
          if (peer !== connection) return;
          if (connection.connectionState !== 'connected') failed('peer-restart-timeout');
          else { restarting = false; status.textContent = 'تماس برقرار است.'; notifyParent('mushroom-call:connected'); }
        }, 10_000);
        if (!shouldCreateOffer) {
          socket.emit('mushroom-restart-ice', id);
          return;
        }
        try {
          await connection.setLocalDescription(await connection.createOffer({ iceRestart: true }));
          if (peer === connection) socket.emit('relaySDP', { peerId: id, sessionDescription: connection.localDescription });
        } catch (error) { if (peer === connection) failed('peer-restart', error); }
      }
      socket.off('mushroom-restart-ice');
      socket.on('mushroom-restart-ice', ({ peerId: source }) => {
        if (source === id && shouldCreateOffer) void restartMedia();
      });
      connection.onconnectionstatechange = () => {
        if (peer !== connection) return;
        if (connection.connectionState === 'connected') {
          clearTimeout(peerTimer);
          restarting = false;
          status.textContent = 'تماس برقرار است.';
          byId('camera').disabled = false;
          startClock();
          confirmConnection(connection);
          notifyParent('mushroom-call:connected');
        }
        if (['failed', 'disconnected'].includes(connection.connectionState)) void restartMedia();
      };
      if (shouldCreateOffer) {
        await connection.setLocalDescription(await connection.createOffer());
        socket.emit('relaySDP', { peerId: id, sessionDescription: connection.localDescription });
      }
    } catch (error) { failed('peer-setup', error); }
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
    } catch (error) { failed('session-description', error); }
  });
  socket.on('iceCandidate', async ({ peerId: id, iceCandidate }) => {
    if (!peer || id !== peerId || !iceCandidate) return;
    try {
      if (peer.remoteDescription) await peer.addIceCandidate(iceCandidate);
      else candidates.push(iceCandidate);
    } catch (error) { reportCallFailure('remote-ice-candidate', error); }
  });
  socket.on('removePeer', ({ peerId: id }) => {
    if (id !== peerId) return;
    closePeer();
    byId('camera').disabled = true;
    status.textContent = 'در حال اتصال مجدد…';
    notifyParent('mushroom-call:recovering');
  });
}

connectButton.addEventListener('click', connect);
byId('end').addEventListener('click', () => {
  byId('end').disabled = true;
  socket.timeout(5000).emit('mushroom-end', (error, closed) => {
    if (error || !closed) {
      if (!socket?.connected) { failed('signaling-end'); return; }
      byId('end').disabled = false;
      status.textContent = 'پایان تماس تأیید نشد. دوباره تلاش کنید.';
      return;
    }
    stop('تماس پایان یافت.');
    notifyParent('mushroom-call:ended');
  });
});
playAudioButton.addEventListener('click', playRemoteAudio);
remoteAudio.addEventListener('playing', () => {
  clearTimeout(audioTimer);
  playAudioButton.hidden = true;
});
byId('microphone').addEventListener('click', event => {
  const track = stream?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  event.currentTarget.setAttribute('aria-pressed', String(track.enabled));
  sendMediaState();
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
    if (enabled) cameraDenied = false;
    sendMediaState();
    button.setAttribute('aria-pressed', String(enabled));
    showCamera('local', enabled);
    shareCameraState();
    byId('media-note').textContent = '';
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      cameraDenied = true;
      sendMediaState();
      notifyParent('mushroom-call:camera-denied');
    }
    byId('media-note').textContent = 'تغییر وضعیت دوربین ممکن نشد؛ صدا همچنان برقرار است.';
  } finally {
    acquired?.stop();
    cameraBusy = false;
    button.disabled = !videoSender;
  }
});
window.addEventListener('message', async event => {
  if (!embedded || event.source !== parent || event.origin !== embedOrigin || event.data?.type !== 'mushroom-call:control') return;
  if (event.data.control === 'microphone') byId('microphone').click();
  if (event.data.control !== 'camera') return;
  if (!stream || !videoSender || cameraBusy) return;
  if (!stream.getVideoTracks().length) {
    let permission;
    try { permission = (await navigator.permissions?.query({ name: 'camera' }))?.state; } catch { /* Unsupported permission query. */ }
    if (permission === 'denied' || cameraDenied && permission !== 'granted') {
      notifyParent('mushroom-call:camera-denied');
      return;
    }
    if (permission !== 'granted') {
      notifyParent('mushroom-call:camera-prompt');
      return;
    }
  }
  byId('camera').click();
});
window.addEventListener('pagehide', () => stop('تماس قطع شد.'));

if (autoJoin) void connect();
else connectButton.hidden = false;

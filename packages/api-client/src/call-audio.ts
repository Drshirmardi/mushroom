let audio: AudioContext | undefined;
let ringBuffer: Promise<AudioBuffer> | undefined;

function context() {
  try {
    if (typeof AudioContext !== "undefined") return audio ??= new AudioContext();
  } catch { /* Visual call feedback remains available. */ }
}

export function unlockCallAudio() {
  const output = context();
  if (output && output.state !== "running") void output.resume().catch(() => {});
}

export function startCallRingtone() {
  const output = context();
  if (!output) return () => {};
  let stopped = false;
  let source: AudioBufferSourceNode | undefined;
  ringBuffer ??= fetch("/consultation-ring.wav").then(response => {
    if (!response.ok) throw new Error("Ringtone unavailable");
    return response.arrayBuffer();
  }).then(bytes => output.decodeAudioData(bytes)).catch(error => {
    ringBuffer = undefined;
    throw error;
  });
  void ringBuffer.then(buffer => {
    if (stopped || document.visibilityState !== "visible") return;
    source = output.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(output.destination);
    source.start();
  }).catch(() => {});
  return () => {
    stopped = true;
    source?.stop();
    source?.disconnect();
    source = undefined;
  };
}

export function playCallEndTone() {
  const output = audio;
  if (output?.state !== "running" || document.visibilityState !== "visible") return () => {};
  const tones = [0, 0.19].map((offset, index) => {
    const start = output.currentTime + 0.06 + offset;
    const note = output.createOscillator();
    const gain = output.createGain();
    note.frequency.value = index ? 383 : 480;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.13, start + 0.015);
    gain.gain.linearRampToValueAtTime(0, start + 0.14);
    note.connect(gain).connect(output.destination);
    note.onended = () => { note.disconnect(); gain.disconnect(); };
    note.start(start);
    note.stop(start + 0.15);
    return note;
  });
  return () => tones.forEach(note => note.stop());
}

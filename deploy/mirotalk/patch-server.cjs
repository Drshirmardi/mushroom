const fs = require('node:fs');
const file = 'backend/server.js';
let source = fs.readFileSync(file, 'utf8');

function replace(previous, next) {
  if (source.split(previous).length !== 2) throw new Error('MiroTalk patch no longer matches the pinned source');
  source = source.replace(previous, next);
}

replace("io.sockets.on('connect', (socket) => {", "require('../mushroom-bridge.cjs')(io);\n\nio.sockets.on('connect', (socket) => {");
replace("app.use(express.static(frontendDir, { index: false }));", [
  "const mushroomAssets = new Set(['/mushroom-call.html', '/mushroom-call.js', '/mushroom-call.css']);",
  "const mushroomOrigin = new URL(process.env.MUSHROOM_VIDEO_ORIGIN);",
  "const mushroomWsOrigin = (mushroomOrigin.protocol === 'https:' ? 'wss://' : 'ws://') + mushroomOrigin.host;",
  "const mushroomAncestors = (process.env.ALLOWED_EMBED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean).map(value => {",
  "    const parsed = new URL(value);",
  "    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== value || value === mushroomOrigin.origin) throw new Error('Invalid Mushroom embed origin');",
  "    return parsed.origin;",
  "});",
  "const mushroomCsp = [\"default-src 'none'\", \"script-src 'self'\", \"style-src 'self'\", \"font-src data:\", \"media-src 'self' blob:\", \"connect-src 'self' \" + mushroomWsOrigin, \"base-uri 'none'\", \"form-action 'none'\", 'frame-ancestors ' + (mushroomAncestors.join(' ') || \"'none'\")].join('; ');",
  "app.use((req, res, next) => {",
  "    if (!mushroomAssets.has(req.path)) return res.sendStatus(404);",
  "    res.set('Cache-Control', 'private, no-store');",
  "    res.set('Referrer-Policy', 'no-referrer');",
  "    if (req.path === '/mushroom-call.html') res.set('Content-Security-Policy', mushroomCsp);",
  "    next();",
  "});",
  "app.use(express.static(frontendDir, { index: false }));",
].join('\n'));
replace("        const channel = config.channel;", [
  "        const channel = socket.mushroom.callId;",
  "        if (config.channel !== channel) return socket.disconnect(true);",
  "        if (Object.hasOwn(socket.channels, channel)) return;",
  "        if (Object.keys(channels[channel] ?? {}).length >= 2 || Object.values(channels[channel] ?? {}).some(peer => peer.mushroom.userId === socket.mushroom.userId)) return socket.disconnect(true);",
  "        config.peerInfo = {};",
].join('\n'));
replace("iceServers: iceServers,\n                });\n                socket.emit", "iceServers: channels[channel][id].mushroom.iceServers,\n                });\n                socket.emit");
replace("iceServers: iceServers,\n                });\n                log.debug", "iceServers: socket.mushroom.iceServers,\n                });\n                log.debug");
fs.writeFileSync(file, source);

// Keep the published stylesheet URL compatible with existing call proxies.
const stylesheet = 'frontend/mushroom-call.css';
const theme = fs.readFileSync('frontend/mushroom-call-theme.css', 'utf8');
const font = fs.readFileSync('frontend/mushroom-call-vazirmatn.woff2').toString('base64');
const playerStyles = fs.readFileSync(stylesheet, 'utf8')
  .replace("@import url('/mushroom-call-theme.css');", '')
  .replace('/mushroom-call-vazirmatn.woff2', 'data:font/woff2;base64,' + font);
fs.writeFileSync(stylesheet, theme + '\n' + playerStyles);

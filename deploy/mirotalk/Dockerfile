FROM node:24-bookworm-slim AS source
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*
WORKDIR /c2c
RUN git init && git fetch --depth=1 https://github.com/miroslavpejic85/mirotalkc2c.git 157628fae7aa69c56b76544c52f9c443b6df7aa5 && git checkout --detach FETCH_HEAD && rm -rf .git
RUN SCARF_ANALYTICS=false npm ci --omit=dev
COPY patch-server.cjs mushroom-bridge.cjs ./
COPY mushroom-call.html mushroom-call.js mushroom-call.css frontend/
RUN node patch-server.cjs

FROM node:24-bookworm-slim
WORKDIR /c2c
COPY --from=source --chown=node:node /c2c /c2c
ENV NODE_ENV=production PORT=8080
USER node
CMD ["node", "backend/server.js"]

# Ubiquitous Gym Booking

A distributed gym equipment booking prototype developed for a ubiquitous and interactive computing course.

## Features
- Real-time machine availability and reservation updates.
- User sessions, reservation timers and per-machine waiting queues.
- Shared cursor interaction across connected clients.
- Browser interface backed by an Express and Socket.IO server.

## Architecture
The Node.js server maintains machine and queue state in memory and communicates with browser clients through Socket.IO. Static frontend assets live in `public/`.

## Run locally
Requires Node.js and npm.

```sh
npm ci
node server.js
```

Open http://localhost:3000. Optional HTTPS support is configured through `SSL_KEY_PATH`, `SSL_CERT_PATH` and `HTTPS_PORT`.

This is an academic prototype with in-memory state and demonstration user sessions, not a production reservation or authentication service.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from './lib/env';
import { verifyToken } from './lib/jwt';
import { authRoutes } from './routes/auth';
import { spotRoutes } from './routes/spots';
import { meRoutes } from './routes/me';
import { getActiveRoom, handleSocketDisconnect, joinQueue, leaveQueue } from './game/matchmaking';
import { registerWorld } from './game/world';
import type { TypedServer } from './game/types';

const app = new Hono();
app.use(logger());

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/auth', authRoutes);
app.route('/api/spots', spotRoutes);
app.route('/api/me', meRoutes);

const httpServer = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`서버 시작: http://localhost:${info.port} (DEV_SKIP_GPS=${env.DEV_SKIP_GPS})`);
});

const io: TypedServer = new Server(httpServer as HttpServer, {
  cors: { origin: true },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') throw new Error('no token');
    const payload = await verifyToken(token);
    socket.data.userId = payload.sub;
    socket.data.nickname = payload.nickname;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { userId } = socket.data;

  // 진행 중인 게임이 있으면 재접속 처리
  getActiveRoom(userId)?.handleReconnect(userId, socket);

  socket.on('queue:join', () => void joinQueue(io, socket));
  socket.on('queue:leave', () => leaveQueue(userId));
  socket.on('game:answer', ({ round, choiceIndex }) => {
    getActiveRoom(userId)?.handleAnswer(userId, round, choiceIndex);
  });
  socket.on('disconnect', () => handleSocketDisconnect(userId, socket.id));
});

registerWorld(io);

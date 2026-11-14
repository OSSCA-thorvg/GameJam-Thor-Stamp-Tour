import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Server } from 'socket.io';
import { existsSync } from 'node:fs';
import type { Server as HttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
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

// 배포에서는 빌드한 화면 파일을 서버가 함께 내준다. 개발 중에는 Vite가 화면을 맡아서 이 폴더가 없다.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.all('/api/*', (c) => c.json({ error: '없는 API입니다.' }, 404));
  app.use('*', serveStatic({ root: webDist }));
  // 화면 주소(/home 등)는 파일이 아니므로 첫 화면 파일로 답한다
  app.get('*', serveStatic({ root: webDist, path: 'index.html' }));
}

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

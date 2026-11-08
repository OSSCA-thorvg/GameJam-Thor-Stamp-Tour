import {
  DEFAULT_APPEARANCE,
  GUESTBOOK_MAX_LENGTH,
  JUMP_MAX_HEIGHT,
  MAP_EXIT_MARGIN_M,
  MAP_WIDTH,
  MOVE_SPEED,
  WORLD_TICK_MS,
  type Appearance,
  type Facing,
  type GuestbookEntry,
  type GuestbookPostResult,
  type WorldPlayer,
} from '@stamp-tour/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { spots, users } from '../db/schema';
import { env } from '../lib/env';
import { haversineM } from '../lib/haversine';
import { verifyToken } from '../lib/jwt';
import { addEntry, listEntries } from './guestbook';
import type { TypedServer, WorldNamespace, WorldSocket } from './types';

type SpotRow = typeof spots.$inferSelect;

interface PlayerState {
  socketId: string;
  spotId: string | null;
  x: number;
  y: number;
  facing: Facing;
  appearance: Appearance;
  lastMoveAt: number;
}

const SPOT_CACHE_MS = 60_000;
const MIN_MOVE_INTERVAL_MS = 30;
const MAX_MOVE_DT_MS = 250;
const MOVE_TOLERANCE = 1.25;
const MOVE_SLACK_PX = 8;

const players = new Map<string, PlayerState>();
let spotCache: { at: number; rows: SpotRow[] } | null = null;

const roomOf = (spotId: string) => `spot:${spotId}`;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

async function loadSpots(): Promise<SpotRow[]> {
  if (spotCache && Date.now() - spotCache.at < SPOT_CACHE_MS) return spotCache.rows;
  const rows = await db.select().from(spots);
  spotCache = { at: Date.now(), rows };
  return rows;
}

function distanceTo(spot: SpotRow, pos: { lat: number; lng: number }) {
  return haversineM(pos.lat, pos.lng, spot.lat, spot.lng);
}

function nearestOf(rows: SpotRow[], pos: { lat: number; lng: number }) {
  let nearest: { spot: SpotRow; distanceM: number } | null = null;
  for (const spot of rows) {
    const distanceM = distanceTo(spot, pos);
    if (!nearest || distanceM < nearest.distanceM) nearest = { spot, distanceM };
  }
  return nearest;
}

function isValidPosition(pos: unknown): pos is { lat: number; lng: number } {
  const p = pos as { lat?: unknown; lng?: unknown } | null;
  return (
    typeof p?.lat === 'number' &&
    typeof p.lng === 'number' &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

function isOwner(socket: WorldSocket) {
  return players.get(socket.data.userId)?.socketId === socket.id;
}

/** 이 소켓이 현재 세션이고 맵 안에 있을 때만 플레이어를 돌려준다 */
function playerInMap(socket: WorldSocket) {
  const player = players.get(socket.data.userId);
  return player?.socketId === socket.id && player.spotId ? player : null;
}

function moveToSpot(socket: WorldSocket, player: PlayerState, target: SpotRow | null) {
  if (player.spotId) void socket.leave(roomOf(player.spotId));
  player.spotId = target?.id ?? null;
  if (!target) return;

  void socket.join(roomOf(target.id));
  player.x = MAP_WIDTH / 2;
  player.y = 0;
  player.facing = 1;
  socket.emit('world:status', {
    state: 'inside',
    spot: { id: target.id, key: target.key, name: target.name },
    me: {
      id: socket.data.userId,
      x: player.x,
      y: player.y,
      facing: player.facing,
      appearance: player.appearance,
    },
  });
}

async function handleLocation(socket: WorldSocket, pos: unknown) {
  if (pos !== null && !isValidPosition(pos)) return;
  if (pos === null && !env.DEV_SKIP_GPS) return;

  const rows = await loadSpots();
  const player = players.get(socket.data.userId);
  if (!player || player.socketId !== socket.id) return;

  if (env.DEV_SKIP_GPS) {
    // 개발 모드: 반경과 무관하게 가장 가까운 맵, 위치가 없으면 test-spot에 입장한다.
    const target = pos
      ? (nearestOf(rows, pos)?.spot ?? null)
      : (rows.find((s) => s.key === 'test-spot') ?? null);
    if (target && target.id !== player.spotId) moveToSpot(socket, player, target);
    return;
  }

  if (!pos) return;

  const current = rows.find((s) => s.id === player.spotId);
  if (current && distanceTo(current, pos) <= current.radiusM + MAP_EXIT_MARGIN_M) return;

  const nearest = nearestOf(rows, pos);
  const target = nearest && nearest.distanceM <= nearest.spot.radiusM ? nearest.spot : null;
  moveToSpot(socket, player, target);
  if (!target) {
    socket.emit('world:status', {
      state: 'outside',
      nearest: nearest && { name: nearest.spot.name, distanceM: nearest.distanceM },
    });
  }
}

function handleMove(socket: WorldSocket, move: { x?: unknown; y?: unknown; facing?: unknown }) {
  const player = playerInMap(socket);
  if (!player) return;

  const { x, y, facing } = move ?? {};
  if (typeof x !== 'number' || !Number.isFinite(x)) return;
  if (typeof y !== 'number' || !Number.isFinite(y)) return;
  if (facing !== 1 && facing !== -1) return;

  const now = Date.now();
  const dt = now - player.lastMoveAt;
  if (dt < MIN_MOVE_INTERVAL_MS) return;

  const maxDx = (MOVE_SPEED * Math.min(dt, MAX_MOVE_DT_MS) * MOVE_TOLERANCE) / 1000 + MOVE_SLACK_PX;
  player.x = clamp(clamp(x, player.x - maxDx, player.x + maxDx), 0, MAP_WIDTH);
  player.y = clamp(y, 0, JUMP_MAX_HEIGHT);
  player.facing = facing;
  player.lastMoveAt = now;
}

async function handleGuestbookList(socket: WorldSocket, ack: (entries: GuestbookEntry[]) => void) {
  const spotId = playerInMap(socket)?.spotId;
  ack(spotId ? await listEntries(spotId) : []);
}

async function handleGuestbookPost(
  world: WorldNamespace,
  socket: WorldSocket,
  body: { message?: unknown },
  ack: (result: GuestbookPostResult) => void,
) {
  const spotId = playerInMap(socket)?.spotId;
  if (!spotId) {
    ack({ ok: false, error: '관광지 맵 안에서만 글을 남길 수 있습니다.' });
    return;
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (message.length < 1 || message.length > GUESTBOOK_MAX_LENGTH) {
    ack({ ok: false, error: `글은 1~${GUESTBOOK_MAX_LENGTH}자여야 합니다.` });
    return;
  }

  const entry = await addEntry(spotId, socket.data.userId, socket.data.nickname, message);
  world.to(roomOf(spotId)).emit('world:guestbook:new', entry);
  ack({ ok: true });
}

function broadcastSnapshots(world: WorldNamespace) {
  const bySpot = new Map<string, WorldPlayer[]>();
  for (const [id, p] of players) {
    if (!p.spotId) continue;
    const list = bySpot.get(p.spotId) ?? [];
    list.push({ id, x: p.x, y: p.y, facing: p.facing, appearance: p.appearance });
    bySpot.set(p.spotId, list);
  }
  const t = Date.now();
  for (const [spotId, list] of bySpot) {
    world.volatile.to(roomOf(spotId)).emit('world:snapshot', { t, players: list });
  }
}

export function registerWorld(io: TypedServer) {
  const world = io.of('/world') as unknown as WorldNamespace;

  world.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('no token');
      const payload = await verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.nickname = payload.nickname;
      const [user] = await db
        .select({ appearance: users.appearance })
        .from(users)
        .where(eq(users.id, payload.sub));
      if (!user) throw new Error('no user');
      socket.data.appearance = user.appearance ?? DEFAULT_APPEARANCE;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  world.on('connection', (socket) => {
    const { userId } = socket.data;

    // 같은 유저의 새 탭이 들어오면 마지막 탭만 남긴다
    const previous = players.get(userId);
    players.set(userId, {
      socketId: socket.id,
      spotId: null,
      x: MAP_WIDTH / 2,
      y: 0,
      facing: 1,
      appearance: socket.data.appearance,
      lastMoveAt: 0,
    });
    if (previous) {
      const old = world.sockets.get(previous.socketId);
      old?.emit('world:replaced');
      old?.disconnect();
    }

    socket.on('world:location', (pos) => {
      handleLocation(socket, pos).catch((err) => console.error('위치 처리 실패:', err));
    });
    socket.on('world:move', (move) => handleMove(socket, move));
    socket.on('world:guestbook:list', (ack) => {
      if (typeof ack !== 'function') return;
      handleGuestbookList(socket, ack).catch((err) => {
        console.error('방명록 조회 실패:', err);
        ack([]);
      });
    });
    socket.on('world:guestbook:post', (body, ack) => {
      if (typeof ack !== 'function') return;
      handleGuestbookPost(world, socket, body, ack).catch((err) => {
        console.error('방명록 작성 실패:', err);
        ack({ ok: false, error: '글을 남기지 못했습니다.' });
      });
    });
    socket.on('disconnect', () => {
      if (isOwner(socket)) players.delete(userId);
    });
  });

  setInterval(() => broadcastSnapshots(world), WORLD_TICK_MS);
}

import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { Spot, StampResponse } from '@stamp-tour/shared';
import { db } from '../db/client';
import { spots, stamps } from '../db/schema';
import { authGuard, type AuthEnv } from '../lib/auth-middleware';
import { env } from '../lib/env';
import { haversineM } from '../lib/haversine';

export const spotRoutes = new Hono<AuthEnv>();

spotRoutes.use('*', authGuard);

spotRoutes.get('/', async (c) => {
  const lat = Number(c.req.query('lat'));
  const lng = Number(c.req.query('lng'));
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  const userId = c.get('userId');
  const [allSpots, myStamps] = await Promise.all([
    db.select().from(spots),
    db.select({ spotId: stamps.spotId }).from(stamps).where(eq(stamps.userId, userId)),
  ]);
  const stampedIds = new Set(myStamps.map((s) => s.spotId));

  const result: Spot[] = allSpots.map((s) => ({
    ...s,
    stamped: stampedIds.has(s.id),
    ...(hasLocation ? { distanceM: haversineM(lat, lng, s.lat, s.lng) } : {}),
  }));

  if (hasLocation) result.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  return c.json(result);
});

spotRoutes.post('/:id/stamp', async (c) => {
  const spotId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  const [spot] = await db.select().from(spots).where(eq(spots.id, spotId));
  if (!spot) return c.json({ error: '관광지를 찾을 수 없습니다.' }, 404);

  if (!env.DEV_SKIP_GPS) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return c.json({ error: '현재 위치(lat, lng)가 필요합니다.' }, 400);
    }
    const distanceM = haversineM(lat, lng, spot.lat, spot.lng);
    if (distanceM > spot.radiusM) {
      return c.json(
        { error: `아직 ${spot.name}에서 너무 멉니다. (${distanceM}m)`, distanceM },
        403,
      );
    }
  }

  const existing = await db
    .select()
    .from(stamps)
    .where(and(eq(stamps.userId, userId), eq(stamps.spotId, spotId)));
  if (existing.length > 0) {
    return c.json({ error: '이미 받은 스탬프입니다.' }, 409);
  }

  const [stamp] = await db.insert(stamps).values({ userId, spotId }).returning();
  if (!stamp) return c.json({ error: '스탬프 발급에 실패했습니다.' }, 500);

  const res: StampResponse = {
    stamp: {
      id: stamp.id,
      spotId: spot.id,
      spotName: spot.name,
      stampedAt: stamp.stampedAt.toISOString(),
    },
  };
  return c.json(res, 201);
});

import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import type { StampRecord } from '@stamp-tour/shared';
import { db } from '../db/client';
import { spots, stamps } from '../db/schema';
import { authGuard, type AuthEnv } from '../lib/auth-middleware';

export const meRoutes = new Hono<AuthEnv>();

meRoutes.use('*', authGuard);

meRoutes.get('/stamps', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select({
      id: stamps.id,
      spotId: stamps.spotId,
      spotName: spots.name,
      stampedAt: stamps.stampedAt,
    })
    .from(stamps)
    .innerJoin(spots, eq(stamps.spotId, spots.id))
    .where(eq(stamps.userId, userId))
    .orderBy(desc(stamps.stampedAt));

  const result: StampRecord[] = rows.map((r) => ({
    ...r,
    stampedAt: r.stampedAt.toISOString(),
  }));
  return c.json(result);
});

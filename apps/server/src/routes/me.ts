import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { isValidAppearance, type MeResponse, type StampRecord } from '@stamp-tour/shared';
import { db } from '../db/client';
import { spots, stamps, users } from '../db/schema';
import { listEntriesByUser } from '../game/guestbook';
import { authGuard, type AuthEnv } from '../lib/auth-middleware';

export const meRoutes = new Hono<AuthEnv>();

meRoutes.use('*', authGuard);

meRoutes.get('/', async (c) => {
  const [user] = await db.select().from(users).where(eq(users.id, c.get('userId')));
  if (!user) return c.json({ error: '유저를 찾을 수 없습니다.' }, 404);
  const res: MeResponse = { id: user.id, nickname: user.nickname, appearance: user.appearance ?? null };
  return c.json(res);
});

meRoutes.put('/appearance', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!isValidAppearance(body)) return c.json({ error: '캐릭터 선택값이 올바르지 않습니다.' }, 400);

  // 부위 외의 키는 버리고 저장한다
  const appearance = { shoes: body.shoes, clothes: body.clothes, face: body.face, hair: body.hair };
  const [user] = await db.update(users).set({ appearance }).where(eq(users.id, c.get('userId'))).returning();
  if (!user) return c.json({ error: '유저를 찾을 수 없습니다.' }, 404);
  const res: MeResponse = { id: user.id, nickname: user.nickname, appearance };
  return c.json(res);
});

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

meRoutes.get('/guestbook', async (c) => {
  return c.json(await listEntriesByUser(c.get('userId')));
});

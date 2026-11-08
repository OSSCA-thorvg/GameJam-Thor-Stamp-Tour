import { Hono } from 'hono';
import type { AuthResponse } from '@stamp-tour/shared';
import { db } from '../db/client';
import { users } from '../db/schema';
import { signToken } from '../lib/jwt';

export const authRoutes = new Hono();

authRoutes.post('/guest', async (c) => {
  const body = await c.req.json().catch(() => null);
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
  if (nickname.length < 1 || nickname.length > 20) {
    return c.json({ error: '닉네임은 1~20자여야 합니다.' }, 400);
  }

  const [user] = await db.insert(users).values({ nickname }).returning();
  if (!user) return c.json({ error: '유저 생성에 실패했습니다.' }, 500);

  const token = await signToken(user);
  const res: AuthResponse = {
    token,
    user: { id: user.id, nickname: user.nickname, appearance: user.appearance ?? null },
  };
  return c.json(res);
});

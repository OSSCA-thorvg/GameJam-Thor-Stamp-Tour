import { desc, eq } from 'drizzle-orm';
import { GUESTBOOK_LIST_LIMIT, type GuestbookEntry } from '@stamp-tour/shared';
import { db } from '../db/client';
import { guestbookEntries, users } from '../db/schema';

export async function listEntries(spotId: string): Promise<GuestbookEntry[]> {
  const rows = await db
    .select({
      id: guestbookEntries.id,
      nickname: users.nickname,
      message: guestbookEntries.message,
      createdAt: guestbookEntries.createdAt,
    })
    .from(guestbookEntries)
    .innerJoin(users, eq(guestbookEntries.userId, users.id))
    .where(eq(guestbookEntries.spotId, spotId))
    .orderBy(desc(guestbookEntries.createdAt))
    .limit(GUESTBOOK_LIST_LIMIT);

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function addEntry(
  spotId: string,
  userId: string,
  nickname: string,
  message: string,
): Promise<GuestbookEntry> {
  const [row] = await db.insert(guestbookEntries).values({ spotId, userId, message }).returning();
  if (!row) throw new Error('방명록 저장 실패');
  return { id: row.id, nickname, message: row.message, createdAt: row.createdAt.toISOString() };
}

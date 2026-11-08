import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { Appearance } from '@stamp-tour/shared';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  nickname: text('nickname').notNull(),
  /** 온보딩 전이면 null */
  appearance: jsonb('appearance').$type<Appearance>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const spots = pgTable('spots', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  radiusM: integer('radius_m').notNull().default(100),
});

export const stamps = pgTable(
  'stamps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    spotId: uuid('spot_id')
      .notNull()
      .references(() => spots.id),
    stampedAt: timestamp('stamped_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('stamps_user_spot_unique').on(t.userId, t.spotId)],
);

export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  spotId: uuid('spot_id').references(() => spots.id),
  question: text('question').notNull(),
  choices: jsonb('choices').$type<string[]>().notNull(),
  answerIndex: integer('answer_index').notNull(),
});

export const gameResults = pgTable('game_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  player1Id: uuid('player1_id')
    .notNull()
    .references(() => users.id),
  player2Id: uuid('player2_id')
    .notNull()
    .references(() => users.id),
  winnerId: uuid('winner_id').references(() => users.id),
  scores: jsonb('scores').$type<Record<string, number>>().notNull(),
  reason: text('reason').notNull(),
  playedAt: timestamp('played_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guestbookEntries = pgTable(
  'guestbook_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    spotId: uuid('spot_id')
      .notNull()
      .references(() => spots.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guestbook_spot_created_idx').on(t.spotId, t.createdAt)],
);

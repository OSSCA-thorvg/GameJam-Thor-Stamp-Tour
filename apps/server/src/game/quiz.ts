import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { quizzes } from '../db/schema';

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
}

export async function pickRandomQuizzes(count: number): Promise<QuizQuestion[]> {
  const rows = await db
    .select({
      id: quizzes.id,
      question: quizzes.question,
      choices: quizzes.choices,
      answerIndex: quizzes.answerIndex,
    })
    .from(quizzes)
    .orderBy(sql`random()`)
    .limit(count);

  if (rows.length < count) {
    throw new Error(`퀴즈가 부족합니다. 필요: ${count}, 보유: ${rows.length} — db:seed를 먼저 실행하세요.`);
  }
  return rows;
}

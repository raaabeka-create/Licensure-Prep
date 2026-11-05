import Dexie, { type EntityTable } from 'dexie';
import type { LocalQuizAttempt, NursingQuestion } from '../types/question';

export interface StoredQuestion extends NursingQuestion {
  bankVersion: number;
}

class NursePrepDatabase extends Dexie {
  questions!: EntityTable<StoredQuestion, 'id'>;
  attempts!: EntityTable<LocalQuizAttempt, 'id'>;

  constructor() {
    super('NursePrepLocal');
    this.version(1).stores({
      questions: 'id, subjectId, topic, difficulty',
      attempts: 'id, subjectId, mode, startedAt, completedAt, syncStatus',
    });
  }
}

export const localDb = new NursePrepDatabase();

export async function saveQuestionBank(
  questions: NursingQuestion[],
  bankVersion = 1,
): Promise<void> {
  if (questions.length === 0) return;
  await localDb.transaction('rw', localDb.questions, async () => {
    await localDb.questions.bulkPut(
      questions.map((question) => ({ ...question, bankVersion })),
    );
  });
}

export async function getQuestionsForSubject(subjectId: string): Promise<NursingQuestion[]> {
  return localDb.questions.where('subjectId').equals(subjectId).toArray();
}

export async function saveAttempt(attempt: LocalQuizAttempt): Promise<void> {
  await localDb.attempts.put(attempt);
}

export async function getAttemptHistory(): Promise<LocalQuizAttempt[]> {
  return localDb.attempts.orderBy('startedAt').reverse().toArray();
}

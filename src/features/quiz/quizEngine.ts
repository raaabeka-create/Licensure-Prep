import { localDb, saveAttempt } from '../../lib/localDb';
import type {
  AnswerOption,
  LocalQuizAttempt,
  NursingQuestion,
  QuizConfiguration,
} from '../../types/question';

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function startQuiz(configuration: QuizConfiguration): Promise<{
  attempt: LocalQuizAttempt;
  questions: NursingQuestion[];
}> {
  const stored = await localDb.questions.where('subjectId').equals(configuration.subjectId).toArray();
  const eligible = configuration.difficulty && configuration.difficulty !== 'all'
    ? stored.filter((question) => question.difficulty === configuration.difficulty)
    : stored;

  if (eligible.length === 0) {
    throw new Error('No questions are available for this subject and difficulty yet.');
  }

  const selected = shuffle(eligible).slice(0, Math.min(configuration.questionCount, eligible.length));
  const now = new Date().toISOString();
  const attempt: LocalQuizAttempt = {
    id: crypto.randomUUID(),
    subjectId: configuration.subjectId,
    mode: configuration.mode,
    questionIds: selected.map((question) => question.id),
    answers: Object.fromEntries(selected.map((question) => [question.id, null])),
    correctAnswers: Object.fromEntries(selected.map((question) => [question.id, question.correctAnswer])),
    flaggedQuestionIds: [],
    startedAt: now,
    durationSeconds: 0,
    syncStatus: 'pending',
  };

  await saveAttempt(attempt);
  return { attempt, questions: selected };
}

export async function selectAnswer(
  attemptId: string,
  questionId: string,
  answer: AnswerOption,
): Promise<void> {
  const attempt = await localDb.attempts.get(attemptId);
  if (!attempt || attempt.completedAt) throw new Error('This quiz attempt is not active.');
  if (!attempt.questionIds.includes(questionId)) throw new Error('Question does not belong to this attempt.');
  await localDb.attempts.update(attemptId, {
    answers: { ...attempt.answers, [questionId]: answer },
  });
}

export async function toggleFlag(attemptId: string, questionId: string): Promise<void> {
  const attempt = await localDb.attempts.get(attemptId);
  if (!attempt || attempt.completedAt) throw new Error('This quiz attempt is not active.');
  if (!attempt.questionIds.includes(questionId)) throw new Error('Question does not belong to this attempt.');
  const flagged = new Set(attempt.flaggedQuestionIds);
  if (flagged.has(questionId)) flagged.delete(questionId);
  else flagged.add(questionId);
  await localDb.attempts.update(attemptId, { flaggedQuestionIds: [...flagged] });
}

export async function submitQuiz(attemptId: string): Promise<LocalQuizAttempt> {
  const attempt = await localDb.attempts.get(attemptId);
  if (!attempt) throw new Error('Quiz attempt was not found.');
  if (attempt.completedAt) return attempt;

  const completedAt = new Date();
  const startedAt = new Date(attempt.startedAt);
  const durationSeconds = Math.max(0, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000));
  const correctCount = attempt.questionIds.reduce((total, questionId) => (
    total + (attempt.answers[questionId] === attempt.correctAnswers[questionId] ? 1 : 0)
  ), 0);
  const scorePercent = Math.round((correctCount / attempt.questionIds.length) * 10000) / 100;

  const completed: LocalQuizAttempt = {
    ...attempt,
    completedAt: completedAt.toISOString(),
    durationSeconds,
    correctCount,
    scorePercent,
    syncStatus: 'pending',
  };
  await saveAttempt(completed);
  return completed;
}

export function getQuestionFeedback(
  question: NursingQuestion,
  selected: AnswerOption | null,
): { isCorrect: boolean | null; correctAnswer: AnswerOption; rationale: string } {
  if (!selected) return { isCorrect: null, correctAnswer: question.correctAnswer, rationale: question.rationale };
  return {
    isCorrect: selected === question.correctAnswer,
    correctAnswer: question.correctAnswer,
    rationale: question.rationale,
  };
}

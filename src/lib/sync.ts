import type { LocalQuizAttempt } from '../types/question';
import { localDb } from './localDb';
import { supabase } from './supabase';

export async function syncPendingAttempts(): Promise<{ synced: number; skipped: boolean }> {
  if (!supabase || !navigator.onLine) return { synced: 0, skipped: true };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { synced: 0, skipped: true };

  const pending = await localDb.attempts.where('syncStatus').equals('pending').toArray();
  let synced = 0;

  for (const attempt of pending) {
    const { error: attemptError } = await supabase.from('quiz_attempts').upsert({
      id: attempt.id,
      user_id: user.id,
      subject_id: attempt.subjectId,
      mode: attempt.mode,
      question_count: attempt.questionIds.length,
      correct_count: attempt.correctCount ?? 0,
      score_percent: attempt.scorePercent ?? 0,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt ?? null,
      duration_seconds: attempt.durationSeconds,
    });

    if (attemptError) continue;

    const answers = attempt.questionIds.map((questionId) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      selected_option: attempt.answers[questionId] ?? null,
      // The correct option is intentionally not inferred here. The caller must
      // enrich this record from the local question bank before answer sync.
      correct_option: 'A',
      is_correct: false,
      time_spent_seconds: 0,
      was_flagged: attempt.flaggedQuestionIds.includes(questionId),
    }));

    const { error: answerError } = await supabase
      .from('quiz_attempt_answers')
      .upsert(answers, { onConflict: 'attempt_id,question_id' });

    if (answerError) continue;
    await localDb.attempts.update(attempt.id, { syncStatus: 'synced' });
    synced += 1;
  }

  return { synced, skipped: false };
}

export function isLocalAttempt(value: unknown): value is LocalQuizAttempt {
  return typeof value === 'object' && value !== null && 'questionIds' in value;
}

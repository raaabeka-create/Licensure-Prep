export type AnswerOption = 'A' | 'B' | 'C' | 'D';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: AnswerOption;
  text: string;
}

export interface NursingQuestion {
  id: string;
  subjectId: string;
  topic: string;
  difficulty: Difficulty;
  stem: string;
  options: QuestionOption[];
  correctAnswer: AnswerOption;
  rationale: string;
  tags?: string[];
}

export interface QuestionBankFile {
  subjectId: string;
  subjectName: string;
  version: number;
  questions: NursingQuestion[];
}

export type QuizMode = 'practice' | 'exam';

export interface QuizConfiguration {
  subjectId: string;
  mode: QuizMode;
  questionCount: number;
  timeLimitMinutes?: number;
  difficulty?: Difficulty | 'all';
}

export interface LocalQuizAttempt {
  id: string;
  subjectId: string;
  mode: QuizMode;
  questionIds: string[];
  answers: Record<string, AnswerOption | null>;
  correctAnswers: Record<string, AnswerOption>;
  flaggedQuestionIds: string[];
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  correctCount?: number;
  scorePercent?: number;
  syncStatus: 'pending' | 'synced';
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnswerOption, LocalQuizAttempt, NursingQuestion, QuizMode } from '../../types/question';
import { getAttemptHistory } from '../../lib/localDb';
import {
  getQuestionFeedback,
  selectAnswer,
  startQuiz,
  submitQuiz,
  toggleFlag,
} from './quizEngine';

const subjects = [
  { id: 'fundamentals_of_nursing', name: 'Fundamentals of Nursing' },
  { id: 'medical_surgical_nursing', name: 'Medical-Surgical Nursing' },
  { id: 'pharmacology', name: 'Pharmacology' },
  { id: 'maternal_newborn_nursing', name: 'Maternal and Newborn Nursing' },
  { id: 'paediatric_nursing', name: 'Paediatric Nursing' },
  { id: 'psychiatric_mental_health_nursing', name: 'Psychiatric and Mental Health Nursing' },
  { id: 'community_health_nursing', name: 'Community Health Nursing' },
  { id: 'nursing_leadership_management', name: 'Nursing Leadership and Management' },
  { id: 'nursing_ethics_legal', name: 'Nursing Ethics and Legal Issues' },
  { id: 'comprehensive_nclex_rn', name: 'Comprehensive NCLEX-RN Practice' },
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function QuizWorkspace() {
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [mode, setMode] = useState<QuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(20);
  const [attempt, setAttempt] = useState<LocalQuizAttempt | null>(null);
  const [questions, setQuestions] = useState<NursingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    getAttemptHistory().then((history) => setHistoryCount(history.length)).catch(() => undefined);
  }, []);

  const finishQuiz = useCallback(async () => {
    if (!attempt || attempt.completedAt || busy) return;
    setBusy(true);
    try {
      const completed = await submitQuiz(attempt.id);
      setAttempt(completed);
      setNotice('Quiz submitted. Your result is saved on this device.');
      const history = await getAttemptHistory();
      setHistoryCount(history.length);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to submit this quiz.');
    } finally {
      setBusy(false);
    }
  }, [attempt, busy]);

  useEffect(() => {
    if (!attempt || attempt.completedAt || !attempt.timeLimitSeconds) return;
    const updateClock = () => {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      const remaining = Math.max(0, attempt.timeLimitSeconds! - elapsed);
      setRemainingSeconds(remaining);
      if (remaining === 0) void finishQuiz();
    };
    updateClock();
    const timerId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timerId);
  }, [attempt, finishQuiz]);

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion && attempt ? attempt.answers[currentQuestion.id] ?? null : null;
  const feedback = useMemo(
    () => currentQuestion && selectedAnswer
      ? getQuestionFeedback(currentQuestion, selectedAnswer)
      : null,
    [currentQuestion, selectedAnswer],
  );

  async function beginQuiz() {
    setBusy(true);
    setNotice('');
    try {
      const result = await startQuiz({
        subjectId,
        mode,
        questionCount,
        timeLimitMinutes: timeLimit,
        difficulty: 'all',
      });
      setAttempt(result.attempt);
      setQuestions(result.questions);
      setCurrentIndex(0);
      setRemainingSeconds(result.attempt.timeLimitSeconds ?? 0);
      if (result.questions.length < questionCount) {
        setNotice(`Only ${result.questions.length} questions are currently available in this subject. The quiz has started with those questions.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to start the quiz.');
    } finally {
      setBusy(false);
    }
  }

  async function answerQuestion(answer: AnswerOption) {
    if (!attempt || !currentQuestion || attempt.completedAt) return;
    await selectAnswer(attempt.id, currentQuestion.id, answer);
    setAttempt({ ...attempt, answers: { ...attempt.answers, [currentQuestion.id]: answer } });
  }

  async function flagQuestion() {
    if (!attempt || !currentQuestion || attempt.completedAt) return;
    await toggleFlag(attempt.id, currentQuestion.id);
    const flagged = new Set(attempt.flaggedQuestionIds);
    if (flagged.has(currentQuestion.id)) flagged.delete(currentQuestion.id);
    else flagged.add(currentQuestion.id);
    setAttempt({ ...attempt, flaggedQuestionIds: [...flagged] });
  }

  function resetQuiz() {
    setAttempt(null);
    setQuestions([]);
    setCurrentIndex(0);
    setNotice('');
  }

  if (attempt?.completedAt) {
    return (
      <section className="quiz-workspace">
        <div className="eyebrow">QUIZ RESULT</div>
        <h2>Session complete</h2>
        <div className="result-score">{attempt.scorePercent ?? 0}%</div>
        <p className="quiz-muted">{attempt.correctCount ?? 0} correct out of {attempt.questionIds.length} questions</p>
        <p className="quiz-muted">Time used: {formatTime(attempt.durationSeconds)}</p>
        <button type="button" onClick={resetQuiz}>Start another quiz</button>
      </section>
    );
  }

  return (
    <section className="quiz-workspace">
      <div className="quiz-heading">
        <div><div className="eyebrow">LOCAL QUIZ ENGINE</div><h2>Build a practice session</h2></div>
        <span className="history-count">{historyCount} saved sessions</span>
      </div>

      {!attempt && (
        <div className="quiz-setup">
          <label>Subject
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label>Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as QuizMode)}>
              <option value="practice">Practice — instant feedback</option>
              <option value="exam">Exam — feedback after submission</option>
            </select>
          </label>
          <label>Number of questions
            <input type="number" min="1" max="265" value={questionCount} onChange={(event) => setQuestionCount(Math.max(1, Math.min(265, Number(event.target.value) || 1)))} />
          </label>
          <label>Time limit (minutes)
            <input type="number" min="1" max="600" value={timeLimit} onChange={(event) => setTimeLimit(Math.max(1, Math.min(600, Number(event.target.value) || 1)))} />
          </label>
          <button type="button" disabled={busy} onClick={beginQuiz}>{busy ? 'Preparing...' : 'Start quiz'}</button>
        </div>
      )}

      {attempt && currentQuestion && (
        <div className="quiz-session">
          <div className="quiz-toolbar">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span className={remainingSeconds < 60 ? 'timer urgent' : 'timer'}>Time {formatTime(remainingSeconds)}</span>
            <button type="button" className="secondary" onClick={flagQuestion}>
              {attempt.flaggedQuestionIds.includes(currentQuestion.id) ? 'Unflag' : 'Flag'}
            </button>
          </div>
          <div className="progress-track"><span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
          <div className="question-topic">{currentQuestion.topic} · {currentQuestion.difficulty}</div>
          <h3 className="question-stem">{currentQuestion.stem}</h3>
          <div className="answer-list">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrect = option.id === currentQuestion.correctAnswer;
              const showFeedback = mode === 'practice' && selectedAnswer !== null;
              const className = showFeedback && isCorrect ? 'answer-option correct'
                : showFeedback && isSelected && !isCorrect ? 'answer-option incorrect'
                : isSelected ? 'answer-option selected' : 'answer-option';
              return (
                <button key={option.id} type="button" className={className}
                  disabled={attempt.completedAt !== undefined || (mode === 'practice' && selectedAnswer !== null)}
                  onClick={() => void answerQuestion(option.id)}>
                  <strong>{option.id}</strong><span>{option.text}</span>
                </button>
              );
            })}
          </div>
          {mode === 'practice' && feedback && (
            <div className={feedback.isCorrect ? 'rationale correct-rationale' : 'rationale'}>
              <strong>{feedback.isCorrect ? 'Correct' : `Incorrect — correct answer: ${feedback.correctAnswer}`}</strong>
              <p>{feedback.rationale}</p>
            </div>
          )}
          <div className="quiz-navigation">
            <button type="button" className="secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}>Previous</button>
            {currentIndex < questions.length - 1
              ? <button type="button" onClick={() => setCurrentIndex((index) => index + 1)}>Next</button>
              : <button type="button" disabled={busy} onClick={() => void finishQuiz()}>Submit quiz</button>}
          </div>
          <div className="question-jump">
            {questions.map((question, index) => (
              <button key={question.id} type="button"
                className={`jump-item ${index === currentIndex ? 'active' : ''} ${attempt.answers[question.id] ? 'answered' : ''} ${attempt.flaggedQuestionIds.includes(question.id) ? 'flagged' : ''}`}
                aria-label={`Go to question ${index + 1}`}
                onClick={() => setCurrentIndex(index)}>{index + 1}</button>
            ))}
          </div>
        </div>
      )}
      {notice && <p className="quiz-notice" role="status">{notice}</p>}
    </section>
  );
}

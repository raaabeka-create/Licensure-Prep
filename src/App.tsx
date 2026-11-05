import { useEffect, useState } from 'react';
import { BookOpen, Brain, Clock3, WifiOff } from 'lucide-react';
import { installBundledQuestionBanks } from './lib/questionBank';
import { startAutoSync } from './lib/sync';
import AuthPanel from './features/auth/AuthPanel';
import QuizWorkspace from './features/quiz/QuizWorkspace';

const subjects = [
  'Fundamentals of Nursing',
  'Medical-Surgical Nursing',
  'Pharmacology',
  'Maternal and Newborn Nursing',
  'Paediatric Nursing',
  'Psychiatric and Mental Health Nursing',
  'Community Health Nursing',
  'Nursing Leadership and Management',
  'Nursing Ethics and Legal Issues',
  'Comprehensive NCLEX-RN Practice',
];

export default function App() {
  const [bankStatus, setBankStatus] = useState('Preparing offline question banks...');

  useEffect(() => {
    const stopSync = startAutoSync();
    installBundledQuestionBanks()
      .then(({ subjects: count, questions }) => setBankStatus(`${count} subjects ready · ${questions} questions installed`))
      .catch((error: unknown) => setBankStatus(error instanceof Error ? error.message : 'Could not load local question banks.'));
    return stopSync;
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="NursePrep home">
          <span className="brand-mark"><BookOpen size={21} /></span>
          <span>Nurse<span className="brand-accent">Prep</span></span>
        </a>
        <span className="offline-label"><WifiOff size={15} /> Offline-ready study</span>
      </header>
      <section className="hero">
        <div className="eyebrow">NCLEX-RN STUDY PLATFORM</div>
        <h1>Prepare with purpose.<br /><span>Practice with confidence.</span></h1>
        <p>Build clinical judgment through focused practice, clear rationales, and measurable progress.</p>
        <div className="hero-stats">
          <div><BookOpen size={18} /><strong>10</strong><span>Study areas</span></div>
          <div><Brain size={18} /><strong>2,000</strong><span>Planned questions</span></div>
          <div><Clock3 size={18} /><strong>Timed</strong><span>Practice sessions</span></div>
        </div>
      </section>
      <section className="subjects-section">
        <div className="section-heading">
          <div><div className="eyebrow">QUESTION BANK</div><h2>Choose a study area</h2></div>
          <span className="coming-soon">{bankStatus}</span>
        </div>
        <div className="subject-grid">
          {subjects.map((subject, index) => (
            <article className="subject-card" key={subject}>
              <span className="subject-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{subject}</h3>
              <span className="subject-status">Question bank in preparation</span>
            </article>
          ))}
        </div>
      </section>
      <QuizWorkspace />
      <AuthPanel />
      <footer>NURSEPREP <span>·</span> Independent nursing education practice platform</footer>
    </main>
  );
}

import type { QuestionBankFile } from '../types/question';
import { saveQuestionBank } from './localDb';
import fundamentals from '../../question-bank/01_fundamentals.json';
import medicalSurgical from '../../question-bank/02_medical_surgical.json';
import pharmacology from '../../question-bank/03_pharmacology.json';
import maternalNewborn from '../../question-bank/04_maternal_newborn.json';
import paediatric from '../../question-bank/05_paediatric.json';
import psychiatric from '../../question-bank/06_psychiatric_mental_health.json';
import community from '../../question-bank/07_community_health.json';
import leadership from '../../question-bank/08_leadership_management.json';
import ethics from '../../question-bank/09_ethics_legal.json';
import comprehensive from '../../question-bank/10_comprehensive_nclex.json';

const bundledBanks = [
  fundamentals,
  medicalSurgical,
  pharmacology,
  maternalNewborn,
  paediatric,
  psychiatric,
  community,
  leadership,
  ethics,
  comprehensive,
] as QuestionBankFile[];

function validateBank(bank: QuestionBankFile): void {
  const ids = new Set<string>();
  for (const question of bank.questions) {
    if (question.subjectId !== bank.subjectId) {
      throw new Error(`Question ${question.id} has a mismatched subject ID.`);
    }
    if (ids.has(question.id)) throw new Error(`Duplicate question ID: ${question.id}`);
    ids.add(question.id);
    if (question.options.length !== 4 || !['A', 'B', 'C', 'D'].every(
      (option) => question.options.some((item) => item.id === option),
    )) {
      throw new Error(`Question ${question.id} must contain options A, B, C, and D.`);
    }
    if (!question.options.some((option) => option.id === question.correctAnswer)) {
      throw new Error(`Question ${question.id} has an invalid correct answer.`);
    }
  }
}

export async function installBundledQuestionBanks(): Promise<{ subjects: number; questions: number }> {
  let questionCount = 0;
  for (const bank of bundledBanks) {
    validateBank(bank);
    await saveQuestionBank(bank.questions, bank.version);
    questionCount += bank.questions.length;
  }
  return { subjects: bundledBanks.length, questions: questionCount };
}

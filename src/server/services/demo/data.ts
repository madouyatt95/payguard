// ============================================================
// PayGuard — Demo Data Service
// Provides pre-analyzed demo scenarios for the UI
// ============================================================
import { StructuredPayrollDocument } from '@/server/types';
import { OCRProviderMock } from '@/server/services/ocr/providers';
import { StructuredPayrollParser } from '@/server/services/parsing/parser';
import { AnalysisPipeline } from '@/server/services/analysis/pipeline';

const mockOCR = new OCRProviderMock();
const parser = new StructuredPayrollParser();
const pipeline = new AnalysisPipeline();

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: 'normal-cdi', name: 'Bulletin CDI Standard', description: 'Un bulletin de paie CDI temps plein normal, sans anomalie particulière.', icon: '✅', tags: ['CDI', 'Temps plein', 'Normal'] },
  { id: 'heures-sup-floues', name: 'Heures Sup. Floues', description: 'Bulletin avec heures supplémentaires sans majoration clairement identifiable.', icon: '⏰', tags: ['Heures sup', 'Majoration floue'] },
  { id: 'prime-disparue', name: 'Prime Disparue', description: 'Bulletin où une prime habituellement versée est absente ce mois-ci.', icon: '💸', tags: ['Primes', 'Comparaison'] },
  { id: 'scan-mauvaise-qualite', name: 'Scan Dégradé', description: 'Simulation d\'un bulletin scanné de mauvaise qualité avec lecture OCR dégradée.', icon: '📄', tags: ['OCR', 'Qualité faible'] },
  { id: 'temps-partiel', name: 'Temps Partiel 80%', description: 'Bulletin d\'un salarié à temps partiel (80%).', icon: '⏳', tags: ['Temps partiel', '80%'] },
  { id: 'activite-partielle', name: 'Activité Partielle', description: 'Bulletin avec mention d\'activité partielle (chômage partiel).', icon: '🏭', tags: ['Activité partielle'] },
  { id: 'absence-conge', name: 'Absence & Congé', description: 'Bulletin avec absence maladie et congés payés pris.', icon: '🏖️', tags: ['Absence', 'Maladie', 'Congé'] },
];

export function getDemoExtraction(scenarioId: string) {
  return mockOCR.extractScenario(scenarioId);
}

export function getDemoParsedDocument(scenarioId: string): StructuredPayrollDocument {
  const extraction = getDemoExtraction(scenarioId);
  return parser.parse(extraction.fullText, scenarioId, extraction.globalConfidence);
}

export function getDemoReport(scenarioId: string, previousIds: string[] = []) {
  const doc = getDemoParsedDocument(scenarioId);
  const previousDocs = previousIds.map(id => getDemoParsedDocument(id));
  return pipeline.analyze(doc, previousDocs);
}

export function getDemoComparison(scenarioIds: string[]) {
  const docs = scenarioIds.map(id => getDemoParsedDocument(id));
  if (docs.length < 2) return null;

  const current = docs[docs.length - 1];
  const previous = docs.slice(0, -1);
  return pipeline.buildComparisonSummary(current, previous);
}

// Series data for 4-month comparison demo
export const SERIES_IDS = [
  'serie-variation-forte-m1',
  'serie-variation-forte-m2',
  'serie-variation-forte-m3',
  'serie-variation-forte-m4',
];

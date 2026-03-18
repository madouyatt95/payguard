// ============================================================
// PayGuard — Conventions Collectives Françaises
// Dictionnaire des principales conventions avec minima et spécificités
// ============================================================

export interface ConventionCollective {
  code: string;
  shortName: string;
  fullName: string;
  idcc: string; // Identifiant de la convention collective
  specificRules: string[];
  minimaGrid?: MinimumSalary[];
  overtimeRates?: OvertimeRate[];
  specificBonuses?: SpecificBonus[];
  trialPeriod?: TrialPeriodInfo;
  noticePeriod?: NoticePeriodInfo;
  notes: string[];
}

export interface MinimumSalary {
  level: string;
  coefficient?: number;
  monthlyMinBrut: number;
  hourlyMinBrut: number;
  lastUpdate: string;
}

export interface OvertimeRate {
  from: number;
  to: number;
  rate: number;
  note?: string;
}

export interface SpecificBonus {
  name: string;
  type: 'obligatoire' | 'courante' | 'selon_accord';
  description: string;
  typicalAmount?: string;
}

export interface TrialPeriodInfo {
  nonCadre: string;
  cadre: string;
  renewable: boolean;
}

export interface NoticePeriodInfo {
  nonCadre: string;
  cadre: string;
}

export const CONVENTIONS_COLLECTIVES: ConventionCollective[] = [
  // ============================================================
  // SYNTEC
  // ============================================================
  {
    code: 'SYNTEC',
    shortName: 'SYNTEC',
    fullName: 'Convention collective nationale des bureaux d\'études techniques, cabinets d\'ingénieurs-conseils et sociétés de conseils',
    idcc: '1486',
    specificRules: [
      'Grille de minima spécifique par position (1.1 à 3.3)',
      'Forfait jours possible pour les cadres (position 3.1+)',
      'Prime de vacances obligatoire (≥ 10% des indemnités de congés)',
    ],
    minimaGrid: [
      { level: '1.1 — ETAM', coefficient: 230, monthlyMinBrut: 1798, hourlyMinBrut: 11.86, lastUpdate: '2024-01' },
      { level: '1.2 — ETAM', coefficient: 240, monthlyMinBrut: 1830, hourlyMinBrut: 12.07, lastUpdate: '2024-01' },
      { level: '2.1 — ETAM', coefficient: 275, monthlyMinBrut: 1928, hourlyMinBrut: 12.71, lastUpdate: '2024-01' },
      { level: '2.2 — ETAM', coefficient: 310, monthlyMinBrut: 2059, hourlyMinBrut: 13.57, lastUpdate: '2024-01' },
      { level: '2.3 — ETAM', coefficient: 355, monthlyMinBrut: 2202, hourlyMinBrut: 14.52, lastUpdate: '2024-01' },
      { level: '3.1 — ETAM', coefficient: 400, monthlyMinBrut: 2376, hourlyMinBrut: 15.67, lastUpdate: '2024-01' },
      { level: '3.2 — ETAM', coefficient: 450, monthlyMinBrut: 2627, hourlyMinBrut: 17.32, lastUpdate: '2024-01' },
      { level: '3.3 — ETAM', coefficient: 500, monthlyMinBrut: 2882, hourlyMinBrut: 19.00, lastUpdate: '2024-01' },
      { level: '1.1 — Cadre', coefficient: 95, monthlyMinBrut: 2219, hourlyMinBrut: 14.63, lastUpdate: '2024-01' },
      { level: '2.1 — Cadre', coefficient: 100, monthlyMinBrut: 2451, hourlyMinBrut: 16.16, lastUpdate: '2024-01' },
      { level: '2.2 — Cadre', coefficient: 115, monthlyMinBrut: 2756, hourlyMinBrut: 18.17, lastUpdate: '2024-01' },
      { level: '2.3 — Cadre', coefficient: 130, monthlyMinBrut: 3042, hourlyMinBrut: 20.06, lastUpdate: '2024-01' },
      { level: '3.1 — Cadre', coefficient: 150, monthlyMinBrut: 3515, hourlyMinBrut: 23.18, lastUpdate: '2024-01' },
      { level: '3.2 — Cadre', coefficient: 170, monthlyMinBrut: 4041, hourlyMinBrut: 26.65, lastUpdate: '2024-01' },
      { level: '3.3 — Cadre', coefficient: 210, monthlyMinBrut: 4979, hourlyMinBrut: 32.83, lastUpdate: '2024-01' },
    ],
    overtimeRates: [
      { from: 35, to: 43, rate: 1.25, note: 'Majoration légale' },
      { from: 43, to: 48, rate: 1.50, note: 'Majoration légale' },
    ],
    specificBonuses: [
      { name: 'Prime de vacances', type: 'obligatoire', description: 'Au moins 10% des indemnités de congés payés', typicalAmount: '~1% du brut annuel' },
    ],
    trialPeriod: { nonCadre: '2 mois', cadre: '4 mois', renewable: true },
    noticePeriod: { nonCadre: '1-2 mois', cadre: '3 mois' },
    notes: [
      'La prime de vacances SYNTEC est obligatoire et ne peut être ni inférieure à 10% de l\'indemnité de congés payés totale.',
      'Les cadres en position 3.1+ peuvent être en forfait jours (218 jours/an).',
      'Le calcul du minimum conventionnel dépend de la position et du coefficient.',
    ],
  },

  // ============================================================
  // MÉTALLURGIE
  // ============================================================
  {
    code: 'METALLURGIE',
    shortName: 'Métallurgie',
    fullName: 'Convention collective nationale de la métallurgie',
    idcc: '3248',
    specificRules: [
      'Nouvelle classification en 18 groupes d\'emploi depuis 2024',
      'Taux de majoration heures sup spécifiques par accord',
      'Prime d\'ancienneté obligatoire',
    ],
    minimaGrid: [
      { level: 'Groupe A — Echelon 1', monthlyMinBrut: 1802, hourlyMinBrut: 11.89, lastUpdate: '2024-01' },
      { level: 'Groupe B — Echelon 1', monthlyMinBrut: 1850, hourlyMinBrut: 12.20, lastUpdate: '2024-01' },
      { level: 'Groupe C — Echelon 1', monthlyMinBrut: 1950, hourlyMinBrut: 12.86, lastUpdate: '2024-01' },
      { level: 'Groupe D — Echelon 1', monthlyMinBrut: 2100, hourlyMinBrut: 13.85, lastUpdate: '2024-01' },
      { level: 'Groupe E — Echelon 1', monthlyMinBrut: 2350, hourlyMinBrut: 15.50, lastUpdate: '2024-01' },
      { level: 'Groupe F — Echelon 1', monthlyMinBrut: 2800, hourlyMinBrut: 18.47, lastUpdate: '2024-01' },
    ],
    specificBonuses: [
      { name: 'Prime d\'ancienneté', type: 'obligatoire', description: '3% après 3 ans, +1% par an, plafonné à 15%', typicalAmount: '3 à 15% du minimum conventionnel' },
      { name: '13ème mois', type: 'courante', description: 'Fréquent mais selon accord d\'entreprise', typicalAmount: '1 mois de salaire' },
    ],
    trialPeriod: { nonCadre: '2 mois', cadre: '4 mois', renewable: true },
    noticePeriod: { nonCadre: '1-2 mois', cadre: '3 mois' },
    notes: [
      'La convention de la métallurgie a été entièrement réécrite en 2024.',
      'La prime d\'ancienneté est calculée sur le minimum conventionnel, pas sur le salaire réel.',
    ],
  },

  // ============================================================
  // HCR — Hôtellerie, Cafés, Restaurants
  // ============================================================
  {
    code: 'HCR',
    shortName: 'Hôtels, Cafés, Restaurants',
    fullName: 'Convention collective nationale des hôtels, cafés restaurants',
    idcc: '1979',
    specificRules: [
      'Avantage en nature nourriture obligatoire',
      'Taux de majoration HS spécifiques',
      'Jours fériés spécifiques',
    ],
    minimaGrid: [
      { level: 'Niveau I — Echelon 1', monthlyMinBrut: 1802, hourlyMinBrut: 11.89, lastUpdate: '2024-01' },
      { level: 'Niveau I — Echelon 2', monthlyMinBrut: 1832, hourlyMinBrut: 12.08, lastUpdate: '2024-01' },
      { level: 'Niveau II — Echelon 1', monthlyMinBrut: 1871, hourlyMinBrut: 12.34, lastUpdate: '2024-01' },
      { level: 'Niveau III — Echelon 1', monthlyMinBrut: 1968, hourlyMinBrut: 12.98, lastUpdate: '2024-01' },
      { level: 'Niveau IV — Echelon 1', monthlyMinBrut: 2098, hourlyMinBrut: 13.83, lastUpdate: '2024-01' },
      { level: 'Niveau V — Echelon 1', monthlyMinBrut: 2718, hourlyMinBrut: 17.92, lastUpdate: '2024-01' },
    ],
    overtimeRates: [
      { from: 35, to: 39, rate: 1.10, note: 'Convention HCR: 10% de 36h à 39h' },
      { from: 39, to: 43, rate: 1.20, note: 'Convention HCR: 20% de 40h à 43h' },
      { from: 43, to: 48, rate: 1.50, note: 'Convention HCR: 50% au-delà de 43h' },
    ],
    specificBonuses: [
      { name: 'Avantage en nature nourriture', type: 'obligatoire', description: '1 repas par jour travaillé ou indemnité compensatrice', typicalAmount: '4,15 €/repas (2024)' },
      { name: 'Prime TVA', type: 'selon_accord', description: 'Issue de la redistribution de la TVA, selon accords', typicalAmount: 'Variable' },
    ],
    trialPeriod: { nonCadre: '1 mois', cadre: '5 mois', renewable: false },
    noticePeriod: { nonCadre: '1-2 mois', cadre: '3 mois' },
    notes: [
      'Les taux de majoration HS dans la HCR sont dérogatoires au droit commun.',
      'L\'avantage en nature nourriture doit apparaître sur le bulletin de paie.',
      '2 jours de repos hebdomadaire consécutifs ou non.',
    ],
  },

  // ============================================================
  // BTP
  // ============================================================
  {
    code: 'BTP',
    shortName: 'Bâtiment & Travaux Publics',
    fullName: 'Convention collective nationale du bâtiment — ouvriers et ETAM',
    idcc: '1596',
    specificRules: [
      'Indemnité de petits déplacements (trajet + transport + repas)',
      'Indemnité d\'intempéries',
      'Caisse de congés payés du BTP',
    ],
    minimaGrid: [
      { level: 'Ouvrier N1', monthlyMinBrut: 1804, hourlyMinBrut: 11.90, lastUpdate: '2024-01' },
      { level: 'Ouvrier N2', monthlyMinBrut: 1896, hourlyMinBrut: 12.50, lastUpdate: '2024-01' },
      { level: 'Ouvrier N3', monthlyMinBrut: 2030, hourlyMinBrut: 13.38, lastUpdate: '2024-01' },
      { level: 'Ouvrier N4', monthlyMinBrut: 2200, hourlyMinBrut: 14.51, lastUpdate: '2024-01' },
    ],
    specificBonuses: [
      { name: 'Indemnité de trajet', type: 'obligatoire', description: 'Selon zone de déplacement', typicalAmount: '2,50 à 10,00 €/jour' },
      { name: 'Indemnité de repas', type: 'obligatoire', description: 'Repas non fourni par l\'employeur', typicalAmount: '~11 €/jour' },
      { name: 'Prime d\'intempéries', type: 'selon_accord', description: 'En cas d\'arrêt de travail pour intempéries' },
      { name: '13ème mois', type: 'courante', description: 'Fréquent selon accords d\'entreprise' },
    ],
    trialPeriod: { nonCadre: '2 mois', cadre: '3 mois', renewable: false },
    noticePeriod: { nonCadre: '2 semaines — 2 mois', cadre: '3 mois' },
    notes: [
      'Les congés payés BTP sont gérés par une caisse spécifique (CIBTP).',
      'Les indemnités de petits déplacements doivent apparaître distinctement sur le bulletin.',
    ],
  },

  // ============================================================
  // COMMERCE (détail et gros)
  // ============================================================
  {
    code: 'COMMERCE',
    shortName: 'Commerce',
    fullName: 'Convention collective nationale du commerce de détail et de gros',
    idcc: '2216',
    specificRules: [
      'Prime d\'ancienneté selon échelon',
      'Majoration travail du dimanche',
      'Jours fériés particuliers',
    ],
    minimaGrid: [
      { level: 'Niveau I — Echelon 1', monthlyMinBrut: 1802, hourlyMinBrut: 11.89, lastUpdate: '2024-01' },
      { level: 'Niveau II — Echelon 1', monthlyMinBrut: 1828, hourlyMinBrut: 12.06, lastUpdate: '2024-01' },
      { level: 'Niveau III — Echelon 1', monthlyMinBrut: 1892, hourlyMinBrut: 12.48, lastUpdate: '2024-01' },
      { level: 'Niveau IV — Echelon 1', monthlyMinBrut: 1982, hourlyMinBrut: 13.07, lastUpdate: '2024-01' },
      { level: 'Niveau V — Cadre', monthlyMinBrut: 2413, hourlyMinBrut: 15.91, lastUpdate: '2024-01' },
    ],
    specificBonuses: [
      { name: 'Prime d\'ancienneté', type: 'obligatoire', description: '3% après 3 ans, 6% après 6 ans, etc.', typicalAmount: '3 à 15%' },
      { name: 'Prime de dimanche', type: 'obligatoire', description: 'Majoration pour travail le dimanche' },
    ],
    trialPeriod: { nonCadre: '2 mois', cadre: '3 mois', renewable: true },
    noticePeriod: { nonCadre: '1-2 mois', cadre: '3 mois' },
    notes: [
      'Les majorations pour travail le dimanche varient selon les accords locaux.',
    ],
  },
];

// ---- Lookup functions ----

export function findConvention(hint: string): ConventionCollective | undefined {
  const lower = hint.toLowerCase();
  return CONVENTIONS_COLLECTIVES.find(c =>
    lower.includes(c.code.toLowerCase()) ||
    lower.includes(c.shortName.toLowerCase()) ||
    lower.includes(c.idcc) ||
    c.fullName.toLowerCase().includes(lower)
  );
}

export function getConventionByCode(code: string): ConventionCollective | undefined {
  return CONVENTIONS_COLLECTIVES.find(c => c.code === code);
}

export function getAllConventionCodes(): string[] {
  return CONVENTIONS_COLLECTIVES.map(c => c.code);
}

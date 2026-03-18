// ============================================================
// PayGuard — Extraction Provider Interface + Mock OCR
// ============================================================
import { ExtractionResult, ExtractionPage, ExtractionBlock, ExtractionLine, ExtractionWord } from '@/server/types';

export interface ExtractionProvider {
  name: string;
  extract(fileBuffer: ArrayBuffer, mimeType: string): Promise<ExtractionResult>;
}

// ============================================================
// Mock OCR Provider — Returns realistic French payslip data
// ============================================================
export class OCRProviderMock implements ExtractionProvider {
  name = 'mock-ocr-v1';

  async extract(_fileBuffer: ArrayBuffer, _mimeType: string): Promise<ExtractionResult> {
    const start = Date.now();
    // Simulate realistic processing delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const scenarioIndex = Math.floor(Math.random() * MOCK_SCENARIOS.length);
    const scenario = MOCK_SCENARIOS[scenarioIndex];

    return this.buildResult(scenario, Date.now() - start);
  }

  extractScenario(scenarioId: string): ExtractionResult {
    const scenario = MOCK_SCENARIOS.find(s => s.id === scenarioId) || MOCK_SCENARIOS[0];
    return this.buildResult(scenario, 450);
  }

  private buildResult(scenario: MockScenario, processingTimeMs: number): ExtractionResult {
    const lines = scenario.text.split('\n').filter(l => l.trim());
    const extractionLines: ExtractionLine[] = lines.map((text, i) => ({
      text,
      confidence: scenario.baseConfidence + (Math.random() * 0.1 - 0.05),
      words: text.split(/\s+/).map(w => ({
        text: w,
        confidence: scenario.baseConfidence + (Math.random() * 0.15 - 0.07),
      })),
      pageNumber: 1,
    }));

    const blocks: ExtractionBlock[] = [{
      text: scenario.text,
      confidence: scenario.baseConfidence,
      lines: extractionLines,
      pageNumber: 1,
    }];

    const pages: ExtractionPage[] = [{
      pageNumber: 1,
      text: scenario.text,
      blocks,
      confidence: scenario.baseConfidence,
    }];

    return {
      fullText: scenario.text,
      pages,
      blocks,
      lines: extractionLines,
      words: extractionLines.flatMap(l => l.words),
      globalConfidence: scenario.baseConfidence,
      providerUsed: this.name,
      metadata: { scenarioId: scenario.id, scenarioName: scenario.name },
      warnings: scenario.warnings,
      errors: [],
      processingTimeMs,
    };
  }
}

// ============================================================
// Mock Scenarios — Realistic French Payslips
// ============================================================
interface MockScenario {
  id: string;
  name: string;
  text: string;
  baseConfidence: number;
  warnings: string[];
}

export const MOCK_SCENARIOS: MockScenario[] = [
  {
    id: 'normal-cdi',
    name: 'Bulletin CDI Normal',
    baseConfidence: 0.94,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/02/2024 au 29/02/2024
Date de paiement : 28/02/2024

EMPLOYEUR
SARL TECH SOLUTIONS
SIRET : 123 456 789 00012
Code APE : 6201Z
Convention collective : SYNTEC
15 rue de la Paix 75002 PARIS
N° URSSAF : 757 0000000000012

SALARIÉ
Nom : DUPONT Jean
Matricule : EMP-2024-042
N° Sécurité Sociale : 1 85 03 75 012 042 78
Emploi : Développeur Full Stack
Qualification : Position 2.1 Coefficient 115
Date d'entrée : 15/03/2021
Statut : Cadre
Contrat : CDI - Temps plein

ÉLÉMENTS DE RÉMUNÉRATION
Libellé                                Base      Taux     Montant
Salaire de base                     151,67 h    22,00    3 336,74 €
Heures supplémentaires 25%            8,00 h    27,50      220,00 €
Heures supplémentaires 50%            4,00 h    33,00      132,00 €
Prime d'ancienneté                                          100,26 €
Indemnité transport Navigo                                   43,20 €

TOTAL BRUT                                                3 832,20 €

COTISATIONS SALARIALES
Sécurité sociale maladie              3 832,20   0,00%        0,00 €
Sécurité sociale vieillesse           3 832,20   6,90%      264,42 €
Retraite T1 AGIRC-ARRCO              3 832,20   3,15%      120,71 €
Retraite T2 AGIRC-ARRCO                  0,00   8,64%        0,00 €
CSG déductible                        3 832,20   6,80%      260,59 €
CSG non déductible                    3 832,20   2,40%       91,97 €
CRDS                                  3 832,20   0,50%       19,16 €
Chômage                               3 832,20   0,00%        0,00 €
Prévoyance cadre                      3 832,20   0,50%       19,16 €

TOTAL COTISATIONS SALARIALES                                776,01 €

NET IMPOSABLE                                             3 056,19 €

PRÉLÈVEMENT À LA SOURCE
Taux PAS : 7,50%     Base : 3 056,19 €     Montant : 229,21 €

NET À PAYER AVANT IMPÔT                                   3 056,19 €
NET À PAYER                                               2 826,98 €

CONGÉS PAYÉS
Acquis période : 2,08    Pris période : 0,00    Solde : 18,50

CUMULS ANNUELS
Brut cumulé : 7 664,40 €
Net imposable cumulé : 6 112,38 €
PAS cumulé : 458,42 €
Heures travaillées : 327,34 h`,
  },
  {
    id: 'heures-sup-floues',
    name: 'Heures Supplémentaires Floues',
    baseConfidence: 0.88,
    warnings: ['Qualité OCR moyenne sur certaines zones numériques'],
    text: `BULLETIN DE PAIE
Période du 01/03/2024 au 31/03/2024
Date de paiement : 29/03/2024

EMPLOYEUR
SAS BATIMENT PLUS
SIRET : 987 654 321 00045
Code APE : 4120A
Convention collective : Bâtiment ETAM
Zone industrielle Nord 69000 LYON

SALARIÉ
Nom : MARTIN Pierre
Matricule : BAT-2019-088
N° SS : 1 92 07 69 045 033 45
Emploi : Chef de chantier
Qualification : Niveau D
Date d'entrée : 01/09/2019
Statut : Non cadre
Contrat : CDI

RÉMUNÉRATION
Salaire de base                     151,67 h    16,50    2 502,56 €
Heures supplémentaires               18,00 h    16,50      297,00 €
Prime panier                                                165,00 €
Indemnité trajet                                            110,00 €
Prime salissure                                              30,00 €

TOTAL BRUT                                                3 104,56 €

COTISATIONS
Sécurité sociale                      3 104,56   7,30%      226,63 €
Retraite complémentaire               3 104,56   3,15%       97,79 €
CSG/CRDS                             3 104,56   9,70%      301,14 €
Prévoyance                           3 104,56   0,80%       24,84 €
Chômage                              3 104,56   0,00%        0,00 €

TOTAL RETENUES                                              650,40 €

NET IMPOSABLE                                             2 454,16 €

PAS : Taux 5,00%   Base 2 454,16 €   Retenue 122,71 €

NET À PAYER                                               2 331,45 €

Congés : Acquis 2,08 | Pris 0 | Solde 25,00`,
  },
  {
    id: 'prime-disparue',
    name: 'Prime Disparue vs Mois Précédent',
    baseConfidence: 0.92,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/04/2024 au 30/04/2024

EMPLOYEUR
SARL COMMERCE SERVICES
SIRET : 456 789 123 00067
Code APE : 4711B
Convention collective : Commerce de détail
25 avenue Jean Jaurès 33000 BORDEAUX

SALARIÉ
Nom : BERNARD Sophie
Matricule : COM-2020-015
N° SS : 2 96 11 33 067 019 23
Emploi : Responsable de rayon
Date d'entrée : 05/01/2020
Statut : Non cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                     151,67 h    13,50    2 047,55 €
Heures supplémentaires 25%            4,00 h    16,88       67,50 €
Indemnité transport                                          50,00 €

TOTAL BRUT                                                2 165,05 €

COTISATIONS
Sécurité sociale                      2 165,05   7,30%      158,05 €
Retraite                              2 165,05   3,15%       68,20 €
CSG/CRDS                             2 165,05   9,70%      210,01 €
Prévoyance                           2 165,05   0,50%       10,83 €
Mutuelle                             2 165,05   1,20%       25,98 €

TOTAL RETENUES                                              473,07 €

NET IMPOSABLE                                             1 691,98 €

PAS : Taux 3,50%    Base 1 691,98 €   Retenue 59,22 €

NET À PAYER                                               1 632,76 €

Congés payés : Acquis 2,08 | Pris 5 | Solde 12,42`,
  },
  {
    id: 'scan-mauvaise-qualite',
    name: 'Scan Mauvaise Qualité',
    baseConfidence: 0.58,
    warnings: ['Qualité d\'image très faible', 'Plusieurs zones illisibles détectées', 'Confiance OCR globale insuffisante'],
    text: `BULlETIN DE PAlE
Pér1ode du 01/0l/2024 au 3l/0l/2024

EMPL0YEUR
SARl lNDUSTRlE FR
SlRET : 34S 67B 9l2 O0034
Cooe APE : 25llZ

SALAR1É
Nom : DUB0lS Marc
Matr1cule : lND-20l8-027
Emplo1 : Technic1en
Date d'entrée : l5/06/20l8

RÉMUNÉRAT1ON
Sala1re de base                     l5l,67 h    l4,20    2 l53,7l €
Heures supp                           6,00 h              ???,?? €
Pr1me rend.                                                l20,00 €

TOTAL BRUT                                                2 ???,?? €

COT1SAT1ONS
Sécur1te soc1ale                                            ???,?? €
Retra1te                                                    ???,?? €
CSG/CRDS                                                    ???,?? €

NET A PAYER                                               l 8??,?? €

Congés : Acquis ?,?8 | Pris 0 | Solde l5,00`,
  },
  {
    id: 'serie-variation-forte-m1',
    name: 'Série 4 mois — Mois 1',
    baseConfidence: 0.93,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/01/2024 au 31/01/2024

EMPLOYEUR
SAS DIGITAL AGENCY
SIRET : 567 890 234 00011
Code APE : 7311Z
Convention collective : Publicité
10 boulevard Haussmann 75009 PARIS

SALARIÉ
Nom : PETIT Marie
Matricule : DIG-2022-003
N° SS : 2 98 04 75 011 003 67
Emploi : Directrice artistique
Date d'entrée : 01/09/2022
Statut : Cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                     151,67 h    26,00    3 943,42 €
Prime ancienneté                                            118,30 €
Prime objectifs                                             500,00 €
Indemnité transport Navigo                                   43,20 €

TOTAL BRUT                                                4 604,92 €

COTISATIONS SALARIALES
Sécurité sociale                      4 604,92   6,90%      317,74 €
Retraite AGIRC-ARRCO T1              3 864,00   3,15%      121,72 €
Retraite AGIRC-ARRCO T2                740,92   8,64%       64,02 €
CSG déductible                        4 604,92   6,80%      313,13 €
CSG non déductible + CRDS             4 604,92   2,90%      133,54 €
Prévoyance cadre                      4 604,92   0,50%       23,02 €
Mutuelle                                                     42,50 €

TOTAL COTISATIONS SALARIALES                              1 015,67 €

NET IMPOSABLE                                             3 589,25 €

PAS : Taux 11,00%   Base 3 589,25 €   Montant 394,82 €

NET À PAYER                                               3 194,43 €

CONGÉS PAYÉS
Acquis : 2,08   Pris : 0   Solde : 26,00

CUMULS ANNUELS
Brut cumulé : 4 604,92 €
Net imposable cumulé : 3 589,25 €`,
  },
  {
    id: 'serie-variation-forte-m2',
    name: 'Série 4 mois — Mois 2',
    baseConfidence: 0.93,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/02/2024 au 29/02/2024

EMPLOYEUR
SAS DIGITAL AGENCY
SIRET : 567 890 234 00011
Code APE : 7311Z
Convention collective : Publicité
10 boulevard Haussmann 75009 PARIS

SALARIÉ
Nom : PETIT Marie
Matricule : DIG-2022-003
N° SS : 2 98 04 75 011 003 67
Emploi : Directrice artistique
Date d'entrée : 01/09/2022
Statut : Cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                     151,67 h    26,00    3 943,42 €
Prime ancienneté                                            118,30 €
Indemnité transport Navigo                                   43,20 €

TOTAL BRUT                                                4 104,92 €

COTISATIONS SALARIALES
Sécurité sociale                      4 104,92   6,90%      283,24 €
Retraite AGIRC-ARRCO T1              3 864,00   3,15%      121,72 €
Retraite AGIRC-ARRCO T2                240,92   8,64%       20,82 €
CSG déductible                        4 104,92   6,80%      279,13 €
CSG non déductible + CRDS             4 104,92   2,90%      119,04 €
Prévoyance cadre                      4 104,92   0,50%       20,52 €
Mutuelle                                                     42,50 €

TOTAL COTISATIONS SALARIALES                                886,97 €

NET IMPOSABLE                                             3 217,95 €

PAS : Taux 11,00%   Base 3 217,95 €   Montant 353,97 €

NET À PAYER                                               2 863,98 €

CONGÉS PAYÉS
Acquis : 2,08   Pris : 0   Solde : 28,08

CUMULS ANNUELS
Brut cumulé : 8 709,84 €
Net imposable cumulé : 6 807,20 €`,
  },
  {
    id: 'serie-variation-forte-m3',
    name: 'Série 4 mois — Mois 3',
    baseConfidence: 0.93,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/03/2024 au 31/03/2024

EMPLOYEUR
SAS DIGITAL AGENCY
SIRET : 567 890 234 00011
Code APE : 7311Z
Convention collective : Publicité
10 boulevard Haussmann 75009 PARIS

SALARIÉ
Nom : PETIT Marie
Matricule : DIG-2022-003
N° SS : 2 98 04 75 011 003 67
Emploi : Directrice artistique
Date d'entrée : 01/09/2022
Statut : Cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                     151,67 h    26,00    3 943,42 €
Prime ancienneté                                            118,30 €
Heures supplémentaires 25%            6,00 h    32,50      195,00 €
Indemnité transport Navigo                                   43,20 €

TOTAL BRUT                                                4 299,92 €

COTISATIONS SALARIALES
Sécurité sociale                      4 299,92   6,90%      296,69 €
Retraite AGIRC-ARRCO T1              3 864,00   3,15%      121,72 €
Retraite AGIRC-ARRCO T2                435,92   8,64%       37,66 €
CSG déductible                        4 299,92   6,80%      292,39 €
CSG non déductible + CRDS             4 299,92   2,90%      124,70 €
Prévoyance cadre                      4 299,92   0,50%       21,50 €
Mutuelle                                                     42,50 €

TOTAL COTISATIONS SALARIALES                                937,16 €

NET IMPOSABLE                                             3 362,76 €

PAS : Taux 11,00%   Base 3 362,76 €   Montant 369,90 €

NET À PAYER                                               2 992,86 €

CONGÉS PAYÉS
Acquis : 2,08   Pris : 0   Solde : 30,16

CUMULS ANNUELS
Brut cumulé : 13 009,76 €
Net imposable cumulé : 10 169,96 €`,
  },
  {
    id: 'serie-variation-forte-m4',
    name: 'Série 4 mois — Mois 4 (Variation forte)',
    baseConfidence: 0.93,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/04/2024 au 30/04/2024

EMPLOYEUR
SAS DIGITAL AGENCY
SIRET : 567 890 234 00011
Code APE : 7311Z
Convention collective : Publicité
10 boulevard Haussmann 75009 PARIS

SALARIÉ
Nom : PETIT Marie
Matricule : DIG-2022-003
N° SS : 2 98 04 75 011 003 67
Emploi : Directrice artistique
Date d'entrée : 01/09/2022
Statut : Cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                      98,00 h    26,00    2 548,00 €
Absence congé sans solde             53,67 h              -1 395,42 €
Prime ancienneté                                            118,30 €
Indemnité transport Navigo                                   28,80 €

TOTAL BRUT                                                1 299,68 €

COTISATIONS SALARIALES
Sécurité sociale                      1 299,68   6,90%       89,68 €
Retraite AGIRC-ARRCO T1              1 299,68   3,15%       40,94 €
CSG déductible                        1 299,68   6,80%       88,38 €
CSG non déductible + CRDS             1 299,68   2,90%       37,69 €
Prévoyance cadre                      1 299,68   0,50%        6,50 €
Mutuelle                                                     42,50 €

TOTAL COTISATIONS SALARIALES                                305,69 €

NET IMPOSABLE                                               993,99 €

PAS : Taux 11,00%   Base 993,99 €   Montant 109,34 €

NET À PAYER                                                 884,65 €

CONGÉS PAYÉS
Acquis : 2,08   Pris : 0   Solde : 32,24

CUMULS ANNUELS
Brut cumulé : 14 309,44 €
Net imposable cumulé : 11 163,95 €`,
  },
  {
    id: 'temps-partiel',
    name: 'Temps Partiel',
    baseConfidence: 0.91,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/03/2024 au 31/03/2024

EMPLOYEUR
ASSOCIATION AIDE À DOMICILE
SIRET : 234 567 890 00056
Code APE : 8810A
Convention collective : Aide à domicile
8 rue des Lilas 31000 TOULOUSE

SALARIÉ
Nom : LEROY Catherine
Matricule : AAD-2021-011
N° SS : 2 78 09 31 056 011 89
Emploi : Auxiliaire de vie
Date d'entrée : 01/04/2021
Statut : Non cadre
Contrat : CDI - Temps partiel 80%

RÉMUNÉRATION
Salaire de base                     121,33 h    12,50    1 516,63 €
Indemnité kilométrique                                      120,00 €
Prime dimanche                                               45,00 €

TOTAL BRUT                                                1 681,63 €

COTISATIONS
Sécurité sociale                      1 681,63   7,30%      122,76 €
Retraite                              1 681,63   3,15%       52,97 €
CSG/CRDS                             1 681,63   9,70%      163,12 €
Prévoyance                           1 681,63   0,50%        8,41 €
Mutuelle                                                     25,00 €

TOTAL RETENUES                                              372,26 €

NET IMPOSABLE                                             1 309,37 €

PAS : Taux 0,00%   Base 1 309,37 €   Retenue 0,00 €

NET À PAYER                                               1 309,37 €

Congés : Acquis 1,67 | Pris 0 | Solde 14,17`,
  },
  {
    id: 'activite-partielle',
    name: 'Activité Partielle',
    baseConfidence: 0.90,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/02/2024 au 29/02/2024

EMPLOYEUR
SAS MECANIQUE GÉNÉRALE
SIRET : 789 012 345 00078
Code APE : 2562A
Convention collective : Métallurgie
ZI Les Platanes 42000 SAINT-ETIENNE

SALARIÉ
Nom : MOREAU Thomas
Matricule : MEC-2017-004
N° SS : 1 88 06 42 078 004 12
Emploi : Opérateur CN
Date d'entrée : 01/01/2017
Statut : Non cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base (heures travaillées)  80,00 h   14,80    1 184,00 €
Activité partielle                    71,67 h             860,04 €
Indemnité activité partielle                              860,04 €
Prime ancienneté                                            88,80 €

TOTAL BRUT                                                2 132,84 €

COTISATIONS
Sécurité sociale                      2 132,84   7,30%      155,70 €
Retraite                              2 132,84   3,15%       67,18 €
CSG/CRDS                             2 132,84   9,70%      206,89 €
Prévoyance                           2 132,84   0,80%       17,06 €

TOTAL RETENUES                                              446,83 €

NET IMPOSABLE                                             1 686,01 €

PAS : Taux 4,50%   Base 1 686,01 €   Retenue 75,87 €

NET À PAYER                                               1 610,14 €

Congés : Acquis 2,08 | Pris 0 | Solde 22,00`,
  },
  {
    id: 'absence-conge',
    name: 'Absence et Congé',
    baseConfidence: 0.92,
    warnings: [],
    text: `BULLETIN DE PAIE
Période du 01/05/2024 au 31/05/2024

EMPLOYEUR
SA GRAND HOTEL RIVIERA
SIRET : 345 678 901 00023
Code APE : 5510Z
Convention collective : HCR (Hôtels Cafés Restaurants)
Promenade des Anglais 06000 NICE

SALARIÉ
Nom : GARCIA Ana
Matricule : GHR-2023-009
N° SS : 2 00 12 06 023 009 34
Emploi : Réceptionniste
Date d'entrée : 15/03/2023
Statut : Non cadre
Contrat : CDI - Temps plein

RÉMUNÉRATION
Salaire de base                     151,67 h    12,80    1 941,38 €
Absence maladie                     -35,00 h   -12,80     -448,00 €
IJSS subrogation                                            320,00 €
Indemnité nourriture                    18 j                 72,00 €
Prime habillage                                              15,00 €

TOTAL BRUT                                                1 900,38 €

COTISATIONS
Sécurité sociale                      1 900,38   7,30%      138,73 €
Retraite                              1 900,38   3,15%       59,86 €
CSG/CRDS                             1 900,38   9,70%      184,34 €
Prévoyance                           1 900,38   0,50%        9,50 €
Mutuelle                                                     30,00 €

TOTAL RETENUES                                              422,43 €

NET IMPOSABLE                                             1 477,95 €

PAS : Taux 2,00%   Base 1 477,95 €   Retenue 29,56 €

NET À PAYER                                               1 448,39 €

Congés : Acquis 2,08 | Pris 5,00 | Solde 8,33`,
  },
];

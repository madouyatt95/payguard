// ============================================================
// PayGuard — Additional France Rules (V1.5 Extension)
// 12 new rules for enhanced detection accuracy
// ============================================================
import {
  StructuredPayrollDocument,
  AnalysisContext,
  RuleResult,
  PayrollRule,
  SourceEvidence,
} from '@/server/types';
import { findConvention } from './conventions';

// ---- Helper to build a non-triggered result ----
function notTriggered(ruleId: string, code: string, desc: string): RuleResult {
  return {
    ruleId,
    ruleCode: code,
    title: '',
    triggered: false,
    severity: 'info',
    category: 'document_integrity',
    confidence: 1,
    canAutoConclude: true,
    shortDescription: desc,
    detailedExplanation: '',
    detectionReason: '',
    recommendation: '',
    legalCaution: '',
    sourceEvidence: [],
  };
}

function ev(fieldName: string, rawText: string, page?: number): SourceEvidence {
  return { fieldName, rawText, page };
}

// ============================================================
// Rule: DUPLICATE_LINES — Détection doublon de lignes
// ============================================================
const RULE_DUPLICATE_LINES: PayrollRule = {
  id: 'RULE_DUPLICATE_LINES',
  code: 'DUPLICATE_LINES',
  title: 'Lignes en doublon détectées',
  category: 'document_integrity',
  defaultSeverity: 'important',
  shortDescription: 'Vérifie si des lignes de paie apparaissent en double.',
  dependsOnFields: ['socialContributions'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const labels = doc.socialContributions.map(c => c.label.toLowerCase().trim());
    const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
    const uniqueDuplicates = [...new Set(duplicates)];

    if (uniqueDuplicates.length > 0) {
      return {
        ruleId: 'RULE_DUPLICATE_LINES', ruleCode: 'DUPLICATE_LINES',
        title: 'Lignes en doublon détectées',
        triggered: true, severity: 'important', category: 'document_integrity',
        confidence: 0.75, canAutoConclude: false,
        shortDescription: `${uniqueDuplicates.length} ligne(s) semblent apparaître en double dans les cotisations.`,
        detailedExplanation: `Les libellés suivants apparaissent plus d'une fois : ${uniqueDuplicates.join(', ')}. Cela peut indiquer une erreur de saisie ou une particularité légitime (part salariale + part employeur).`,
        detectionReason: 'Libellés identiques détectés dans la table des cotisations.',
        recommendation: 'Vérifiez que ces doublons correspondent bien à des lignes distinctes (ex: part salariale vs patronale) et non à une erreur.',
        legalCaution: 'Certaines cotisations peuvent légitimement apparaître sur deux lignes distinctes.',
        sourceEvidence: uniqueDuplicates.map(d => ev('Cotisation', d)),
      };
    }
    return notTriggered('RULE_DUPLICATE_LINES', 'DUPLICATE_LINES', 'Aucun doublon détecté dans les cotisations.');
  },
};

// ============================================================
// Rule: CALENDAR_COHERENCE — Cohérence jours/heures vs calendrier
// ============================================================
const RULE_CALENDAR_COHERENCE: PayrollRule = {
  id: 'RULE_CALENDAR_COHERENCE',
  code: 'CALENDAR_COHERENCE',
  title: 'Cohérence jours/heures travaillées',
  category: 'salary_hours',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie que le nombre d\'heures est cohérent avec un mois standard.',
  dependsOnFields: ['normalHours'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const hours = doc.normalHours.value;
    if (!hours) return notTriggered('RULE_CALENDAR_COHERENCE', 'CALENDAR_COHERENCE', 'Heures non détectées.');

    if (hours > 180) {
      return {
        ruleId: 'RULE_CALENDAR_COHERENCE', ruleCode: 'CALENDAR_COHERENCE',
        title: 'Nombre d\'heures anormalement élevé',
        triggered: true, severity: 'review', category: 'salary_hours',
        confidence: 0.65, canAutoConclude: false,
        shortDescription: `${hours}h déclarées sur le mois, ce qui dépasse les 151,67h standard.`,
        detailedExplanation: `Un temps plein standard en France correspond à 151,67h mensuelles (35h x 52/12). Les ${hours}h indiquées sont nettement supérieures.`,
        detectionReason: `Heures détectées (${hours}h) vs référence 151.67h mensuel.`,
        recommendation: 'Vérifiez si les heures supplémentaires sont bien décomptées séparément.',
        legalCaution: 'Le contingent annuel d\'heures supplémentaires est limité (220h par défaut, sauf accord).',
        sourceEvidence: [ev('Heures normales', `${hours}h`)],
      };
    }

    if (hours > 0 && hours < 10) {
      return {
        ruleId: 'RULE_CALENDAR_COHERENCE', ruleCode: 'CALENDAR_COHERENCE',
        title: 'Très peu d\'heures déclarées',
        triggered: true, severity: 'review', category: 'salary_hours',
        confidence: 0.6, canAutoConclude: false,
        shortDescription: `Seulement ${hours}h déclarées sur le mois.`,
        detailedExplanation: 'Ce volume horaire très faible peut correspondre à un temps partiel, un mois d\'entrée/sortie, ou une erreur de lecture.',
        detectionReason: `Heures anormalement faibles: ${hours}h.`,
        recommendation: 'Vérifiez si cela correspond à votre situation.',
        legalCaution: '',
        sourceEvidence: [ev('Heures normales', `${hours}h`)],
      };
    }

    return notTriggered('RULE_CALENDAR_COHERENCE', 'CALENDAR_COHERENCE', 'Volume horaire cohérent.');
  },
};

// ============================================================
// Rule: PAS_RATE_CHECK — Taux PAS incohérent
// ============================================================
const RULE_PAS_RATE_CHECK: PayrollRule = {
  id: 'RULE_PAS_RATE_CHECK',
  code: 'PAS_RATE_CHECK',
  title: 'Taux de prélèvement à la source incohérent',
  category: 'tax',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie la cohérence du taux de PAS.',
  dependsOnFields: ['taxableNet', 'withholdingTax'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const taxable = doc.taxableNet.value;
    const taxAmount = doc.withholdingTax.amount?.value;
    const taxRate = doc.withholdingTax.rate?.value;

    if (!taxable || !taxAmount || !taxRate) return notTriggered('RULE_PAS_RATE_CHECK', 'PAS_RATE_CHECK', 'Données insuffisantes pour vérifier le PAS.');

    const expectedAmount = taxable * (taxRate / 100);
    const diff = Math.abs(expectedAmount - taxAmount);
    const tolerance = taxable * 0.02;

    if (diff > tolerance) {
      return {
        ruleId: 'RULE_PAS_RATE_CHECK', ruleCode: 'PAS_RATE_CHECK',
        title: 'Incohérence montant PAS / taux',
        triggered: true, severity: 'review', category: 'tax',
        confidence: 0.7, canAutoConclude: false,
        shortDescription: `Le montant PAS (${taxAmount.toFixed(2)} €) ne correspond pas au taux (${taxRate}%) appliqué au net imposable (${taxable.toFixed(2)} €). Attendu: ~${expectedAmount.toFixed(2)} €.`,
        detailedExplanation: `L'écart de ${diff.toFixed(2)} € peut s'expliquer par un arrondi, un acompte, ou une régularisation.`,
        detectionReason: `Écart de ${diff.toFixed(2)} € entre le montant attendu et le montant prélevé.`,
        recommendation: 'Si l\'écart est faible (< 5€), il s\'agit probablement d\'un arrondi.',
        legalCaution: 'Le taux PAS est transmis par l\'administration fiscale.',
        sourceEvidence: [
          ev('Net imposable', `${taxable.toFixed(2)} €`),
          ev('Montant PAS', `${taxAmount.toFixed(2)} €`),
          ev('Taux PAS', `${taxRate}%`),
        ],
      };
    }

    return notTriggered('RULE_PAS_RATE_CHECK', 'PAS_RATE_CHECK', `Montant PAS cohérent avec le taux (${taxRate}%).`);
  },
};

// ============================================================
// Rule: THIRTEENTH_MONTH — Prime 13ème mois en décembre
// ============================================================
const RULE_THIRTEENTH_MONTH: PayrollRule = {
  id: 'RULE_THIRTEENTH_MONTH',
  code: 'THIRTEENTH_MONTH',
  title: 'Vérification prime 13ème mois',
  category: 'bonuses',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie la présence d\'une prime de 13ème mois en décembre.',
  dependsOnFields: ['bonuses', 'payPeriod'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const month = doc.payPeriod.month.value?.toLowerCase() || '';
    const isDecember = month.includes('décembre') || month.includes('decembre') || month.includes('12/') || month.endsWith('/12');

    if (!isDecember) return notTriggered('RULE_THIRTEENTH_MONTH', 'THIRTEENTH_MONTH', 'Bulletin non décembre.');

    const has13th = doc.bonuses.some(b => /13[eè]me|treizi[eè]me|prime.*annuelle|gratification.*annuelle/i.test(b.label));

    if (!has13th) {
      return {
        ruleId: 'RULE_THIRTEENTH_MONTH', ruleCode: 'THIRTEENTH_MONTH',
        title: 'Pas de 13ème mois détecté en décembre',
        triggered: true, severity: 'review', category: 'bonuses',
        confidence: 0.4, canAutoConclude: false,
        shortDescription: 'Bulletin de décembre sans prime de 13ème mois détectée.',
        detailedExplanation: 'Le 13ème mois n\'est pas obligatoire légalement. Il dépend de votre convention ou contrat.',
        detectionReason: 'Bulletin de décembre, aucune ligne "13ème mois" détectée.',
        recommendation: 'Si votre contrat prévoit un 13ème mois, vérifiez qu\'il n\'a pas été versé sur un autre mois.',
        legalCaution: 'Le 13ème mois n\'est pas prévu par le Code du travail.',
        sourceEvidence: [ev('Période', month)],
      };
    }

    return notTriggered('RULE_THIRTEENTH_MONTH', 'THIRTEENTH_MONTH', '13ème mois détecté.');
  },
};

// ============================================================
// Rule: MUTUELLE_OBLIGATOIRE — Mutuelle obligatoire
// ============================================================
const RULE_MUTUELLE_OBLIGATOIRE: PayrollRule = {
  id: 'RULE_MUTUELLE_OBLIGATOIRE',
  code: 'MUTUELLE_OBLIGATOIRE',
  title: 'Mutuelle obligatoire',
  category: 'contributions',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie la présence d\'une cotisation complémentaire santé.',
  dependsOnFields: ['socialContributions'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const hasMutuelle = doc.socialContributions.some(c =>
      /mutuelle|compl[eé]mentaire\s*sant[eé]|frais\s*sant[eé]|pr[eé]voyance\s*sant[eé]|sant[eé]\s*compl|couverture\s*sant/i.test(c.label)
    );

    if (!hasMutuelle) {
      return {
        ruleId: 'RULE_MUTUELLE_OBLIGATOIRE', ruleCode: 'MUTUELLE_OBLIGATOIRE',
        title: 'Mutuelle obligatoire non détectée',
        triggered: true, severity: 'review', category: 'contributions',
        confidence: 0.55, canAutoConclude: false,
        shortDescription: 'Aucune cotisation de complémentaire santé (mutuelle) n\'a été détectée.',
        detailedExplanation: 'Depuis 2016, tous les employeurs du privé doivent proposer une complémentaire santé collective.',
        detectionReason: 'Aucune ligne "mutuelle" ou "complémentaire santé" détectée.',
        recommendation: 'Vérifiez si la mutuelle figure sous un autre libellé, ou si vous avez une dispense.',
        legalCaution: 'La mutuelle est obligatoire (loi ANI 2013), mais des cas de dispense existent.',
        sourceEvidence: [],
      };
    }

    return notTriggered('RULE_MUTUELLE_OBLIGATOIRE', 'MUTUELLE_OBLIGATOIRE', 'Cotisation mutuelle détectée.');
  },
};

// ============================================================
// Rule: ANCIENNETE_CHECK — Prime d'ancienneté vs convention
// ============================================================
const RULE_ANCIENNETE_CHECK: PayrollRule = {
  id: 'RULE_ANCIENNETE_CHECK',
  code: 'ANCIENNETE_CHECK',
  title: 'Vérification prime d\'ancienneté',
  category: 'bonuses',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie la prime d\'ancienneté selon la convention.',
  dependsOnFields: ['contractIndicators', 'bonuses'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const conventionHint = doc.contractIndicators.collectiveAgreementHint?.value;
    if (!conventionHint) return notTriggered('RULE_ANCIENNETE_CHECK', 'ANCIENNETE_CHECK', 'Convention non identifiée.');

    const convention = findConvention(conventionHint);
    if (!convention) return notTriggered('RULE_ANCIENNETE_CHECK', 'ANCIENNETE_CHECK', 'Convention non répertoriée.');

    const requiresAnciennete = convention.specificBonuses?.some(b => b.name.toLowerCase().includes('ancienneté') && b.type === 'obligatoire');
    if (!requiresAnciennete) return notTriggered('RULE_ANCIENNETE_CHECK', 'ANCIENNETE_CHECK', 'Pas de prime d\'ancienneté obligatoire.');

    const hasAnciennete = doc.bonuses.some(b => /anciennet[eé]/i.test(b.label));

    if (!hasAnciennete) {
      return {
        ruleId: 'RULE_ANCIENNETE_CHECK', ruleCode: 'ANCIENNETE_CHECK',
        title: 'Prime d\'ancienneté absente',
        triggered: true, severity: 'review', category: 'bonuses',
        confidence: 0.5, canAutoConclude: false,
        shortDescription: `La convention ${convention.shortName} prévoit une prime d'ancienneté obligatoire, mais aucune n'a été détectée.`,
        detailedExplanation: `La prime d'ancienneté est obligatoire dans la convention ${convention.fullName}. Son absence peut signifier que le salarié n'a pas encore l'ancienneté requise.`,
        detectionReason: `Convention ${convention.shortName} identifiée, prime d'ancienneté absente.`,
        recommendation: 'Vérifiez votre ancienneté et les conditions de la prime.',
        legalCaution: 'La prime d\'ancienneté est souvent soumise à une ancienneté minimale (3 ans).',
        sourceEvidence: [ev('Convention', conventionHint)],
      };
    }

    return notTriggered('RULE_ANCIENNETE_CHECK', 'ANCIENNETE_CHECK', 'Prime d\'ancienneté détectée.');
  },
};

// ============================================================
// Rule: CONVENTION_MINIMA — Minima conventionnels
// ============================================================
const RULE_CONVENTION_MINIMA: PayrollRule = {
  id: 'RULE_CONVENTION_MINIMA',
  code: 'CONVENTION_MINIMA',
  title: 'Vérification minima conventionnels',
  category: 'salary_hours',
  defaultSeverity: 'important',
  shortDescription: 'Vérifie le salaire vs minima convention.',
  dependsOnFields: ['hourlyRate', 'contractIndicators'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const conventionHint = doc.contractIndicators.collectiveAgreementHint?.value;
    if (!conventionHint) return notTriggered('RULE_CONVENTION_MINIMA', 'CONVENTION_MINIMA', 'Convention non identifiée.');

    const convention = findConvention(conventionHint);
    if (!convention?.minimaGrid?.length) return notTriggered('RULE_CONVENTION_MINIMA', 'CONVENTION_MINIMA', 'Grille des minima non disponible.');

    const hourlyRate = doc.hourlyRate.value;
    if (!hourlyRate) return notTriggered('RULE_CONVENTION_MINIMA', 'CONVENTION_MINIMA', 'Taux horaire non détecté.');

    const lowestMin = Math.min(...convention.minimaGrid.map(m => m.hourlyMinBrut));

    if (hourlyRate < lowestMin) {
      return {
        ruleId: 'RULE_CONVENTION_MINIMA', ruleCode: 'CONVENTION_MINIMA',
        title: 'Salaire potentiellement inférieur aux minima conventionnels',
        triggered: true, severity: 'important', category: 'salary_hours',
        confidence: 0.55, canAutoConclude: false,
        shortDescription: `Taux horaire (${hourlyRate.toFixed(2)} €) < minimum ${convention.shortName} (${lowestMin.toFixed(2)} €/h).`,
        detailedExplanation: `La convention ${convention.fullName} prévoit un minimum de ${lowestMin.toFixed(2)} €/h pour le niveau le plus bas. Votre taux (${hourlyRate.toFixed(2)} €) semble inférieur. Attention: nous ne connaissons pas votre niveau exact.`,
        detectionReason: `Taux (${hourlyRate.toFixed(2)} €) < minimum grille (${lowestMin.toFixed(2)} €).`,
        recommendation: `Identifiez votre position dans la grille ${convention.shortName} et comparez.`,
        legalCaution: 'Le minimum conventionnel prévaut sur le SMIC lorsqu\'il est plus favorable.',
        sourceEvidence: [ev('Taux horaire', `${hourlyRate.toFixed(2)} €`), ev('Convention', conventionHint)],
      };
    }

    return notTriggered('RULE_CONVENTION_MINIMA', 'CONVENTION_MINIMA', `Taux horaire (${hourlyRate.toFixed(2)} €) ≥ minimum ${convention.shortName}.`);
  },
};

// ============================================================
// Rule: HOURS_WORKED_DAYS — Heures vs jours ouvrés
// ============================================================
const RULE_HOURS_WORKED_DAYS: PayrollRule = {
  id: 'RULE_HOURS_WORKED_DAYS',
  code: 'HOURS_WORKED_DAYS',
  title: 'Cohérence heures / jours travaillés',
  category: 'salary_hours',
  defaultSeverity: 'info',
  shortDescription: 'Compare heures et jours ouvrés.',
  dependsOnFields: ['normalHours', 'payPeriod'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const hours = doc.normalHours.value;
    const workedDays = doc.payPeriod.workedDays?.value;

    if (!hours || !workedDays) return notTriggered('RULE_HOURS_WORKED_DAYS', 'HOURS_WORKED_DAYS', 'Données heures ou jours non détectées.');

    const expectedHours = workedDays * 7;
    const diff = Math.abs(hours - expectedHours);

    if (diff > 14) {
      return {
        ruleId: 'RULE_HOURS_WORKED_DAYS', ruleCode: 'HOURS_WORKED_DAYS',
        title: 'Écart heures / jours travaillés',
        triggered: true, severity: 'info', category: 'salary_hours',
        confidence: 0.5, canAutoConclude: false,
        shortDescription: `${hours}h pour ${workedDays} jours (attendu: ~${expectedHours}h).`,
        detailedExplanation: 'L\'écart peut s\'expliquer par un temps partiel, des demi-journées, ou des horaires variables.',
        detectionReason: `${hours}h vs ${workedDays}j x 7h = ${expectedHours}h.`,
        recommendation: 'Vérifiez votre planning habituel.',
        legalCaution: '',
        sourceEvidence: [ev('Heures', `${hours}h`), ev('Jours', `${workedDays}j`)],
      };
    }

    return notTriggered('RULE_HOURS_WORKED_DAYS', 'HOURS_WORKED_DAYS', 'Ratio heures/jours cohérent.');
  },
};

// ============================================================
// Rule: TRANSPORT_ALLOWANCE — Indemnité de transport
// ============================================================
const RULE_TRANSPORT_ALLOWANCE: PayrollRule = {
  id: 'RULE_TRANSPORT_ALLOWANCE',
  code: 'TRANSPORT_ALLOWANCE',
  title: 'Vérification indemnité de transport',
  category: 'bonuses',
  defaultSeverity: 'info',
  shortDescription: 'Vérifie la présence d\'une participation transport.',
  dependsOnFields: ['bonuses', 'allowances'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const hasTransport = [...doc.bonuses, ...doc.allowances].some(item =>
      /transport|navigo|pass|métro|indemnit[eé].*trajet|forfait.*mobilit|frais.*d[eé]placement|kilom[eé]tr/i.test(item.label)
    );

    if (!hasTransport) {
      return {
        ruleId: 'RULE_TRANSPORT_ALLOWANCE', ruleCode: 'TRANSPORT_ALLOWANCE',
        title: 'Indemnité de transport non détectée',
        triggered: true, severity: 'info', category: 'bonuses',
        confidence: 0.35, canAutoConclude: false,
        shortDescription: 'Aucune participation transport détectée.',
        detailedExplanation: 'L\'employeur doit prendre en charge 50% des transports en commun. Le forfait mobilités durables est facultatif.',
        detectionReason: 'Aucune ligne transport/navigo/trajet/mobilité détectée.',
        recommendation: 'Si vous utilisez les transports en commun, la participation de 50% est obligatoire.',
        legalCaution: 'La prise en charge est obligatoire pour les transports en commun uniquement.',
        sourceEvidence: [],
      };
    }

    return notTriggered('RULE_TRANSPORT_ALLOWANCE', 'TRANSPORT_ALLOWANCE', 'Indemnité de transport détectée.');
  },
};

// ============================================================
// Rule: CONGE_ACQUIS_CHECK — Solde de congés
// ============================================================
const RULE_CONGE_ACQUIS_CHECK: PayrollRule = {
  id: 'RULE_CONGE_ACQUIS_CHECK',
  code: 'CONGE_ACQUIS_CHECK',
  title: 'Vérification solde de congés',
  category: 'leave',
  defaultSeverity: 'info',
  shortDescription: 'Vérifie la mention du solde de congés.',
  dependsOnFields: ['cumulatedValues'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const hasCPInfo = doc.cumulatedValues?.cpAcquis?.value !== null && doc.cumulatedValues?.cpAcquis?.value !== undefined;

    if (!hasCPInfo) {
      return {
        ruleId: 'RULE_CONGE_ACQUIS_CHECK', ruleCode: 'CONGE_ACQUIS_CHECK',
        title: 'Solde de congés non détecté',
        triggered: true, severity: 'info', category: 'leave',
        confidence: 0.4, canAutoConclude: false,
        shortDescription: 'Le solde de congés payés n\'a pas été identifié.',
        detailedExplanation: 'La mention des congés acquis et pris est obligatoire depuis 2017.',
        detectionReason: 'Aucun champ CP acquis/pris extrait.',
        recommendation: 'Vérifiez que ces informations figurent sur votre bulletin.',
        legalCaution: 'Article R3243-1 du Code du travail.',
        sourceEvidence: [],
      };
    }

    return notTriggered('RULE_CONGE_ACQUIS_CHECK', 'CONGE_ACQUIS_CHECK', 'Informations de congés détectées.');
  },
};

// ============================================================
// Rule: NET_NEGATIVE_CHECK — Net négatif
// ============================================================
const RULE_NET_NEGATIVE_CHECK: PayrollRule = {
  id: 'RULE_NET_NEGATIVE_CHECK',
  code: 'NET_NEGATIVE_CHECK',
  title: 'Net à payer négatif',
  category: 'totals',
  defaultSeverity: 'critical',
  shortDescription: 'Détecte un net à payer négatif.',
  dependsOnFields: ['netToPay'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const net = doc.netToPay.value;
    if (net === null) return notTriggered('RULE_NET_NEGATIVE_CHECK', 'NET_NEGATIVE_CHECK', 'Net non détecté.');

    if (net < 0) {
      return {
        ruleId: 'RULE_NET_NEGATIVE_CHECK', ruleCode: 'NET_NEGATIVE_CHECK',
        title: 'Net à payer négatif',
        triggered: true, severity: 'critical', category: 'totals',
        confidence: 0.85, canAutoConclude: false,
        shortDescription: `Net à payer négatif : ${net.toFixed(2)} €. Situation très inhabituelle.`,
        detailedExplanation: 'Un net négatif signifie que les retenues dépassent le brut. Cela peut correspondre à une régularisation ou une erreur.',
        detectionReason: `Net à payer = ${net.toFixed(2)} € (< 0).`,
        recommendation: 'Contactez impérativement votre service paie.',
        legalCaution: 'L\'employeur ne peut exiger un paiement sans accord.',
        sourceEvidence: [ev('Net à payer', `${net.toFixed(2)} €`)],
      };
    }

    return notTriggered('RULE_NET_NEGATIVE_CHECK', 'NET_NEGATIVE_CHECK', 'Net à payer positif.');
  },
};

// ============================================================
// Rule: CONTRIBUTION_RATE_CHECK — Taux cotisation aberrant
// ============================================================
const RULE_CONTRIBUTION_RATE_CHECK: PayrollRule = {
  id: 'RULE_CONTRIBUTION_RATE_CHECK',
  code: 'CONTRIBUTION_RATE_CHECK',
  title: 'Taux de cotisation inhabituel',
  category: 'contributions',
  defaultSeverity: 'review',
  shortDescription: 'Vérifie si des taux semblent aberrants.',
  dependsOnFields: ['socialContributions'],
  canAutoConclude: false,
  run(doc: StructuredPayrollDocument): RuleResult {
    const aberrants = doc.socialContributions.filter(c => {
      if (!c.rate) return false;
      return c.rate > 25 || c.rate < 0;
    });

    if (aberrants.length > 0) {
      return {
        ruleId: 'RULE_CONTRIBUTION_RATE_CHECK', ruleCode: 'CONTRIBUTION_RATE_CHECK',
        title: 'Taux de cotisation inhabituels détectés',
        triggered: true, severity: 'review', category: 'contributions',
        confidence: 0.6, canAutoConclude: false,
        shortDescription: `${aberrants.length} cotisation(s) avec un taux inhabituel (> 25% ou négatif).`,
        detailedExplanation: `Cotisations concernées : ${aberrants.map(a => `${a.label} (${a.rate}%)`).join(', ')}.`,
        detectionReason: `Taux hors fourchette: ${aberrants.map(a => a.label).join(', ')}.`,
        recommendation: 'Comparez avec votre convention collective ou un bulletin précédent.',
        legalCaution: 'Des taux négatifs peuvent correspondre à des remboursements.',
        sourceEvidence: aberrants.map(a => ev(a.label, `${a.rate}%`)),
      };
    }

    return notTriggered('RULE_CONTRIBUTION_RATE_CHECK', 'CONTRIBUTION_RATE_CHECK', 'Tous les taux sont dans les fourchettes habituelles.');
  },
};

// ============================================================
// Exports
// ============================================================
export const ADDITIONAL_RULES: PayrollRule[] = [
  RULE_DUPLICATE_LINES,
  RULE_CALENDAR_COHERENCE,
  RULE_PAS_RATE_CHECK,
  RULE_THIRTEENTH_MONTH,
  RULE_MUTUELLE_OBLIGATOIRE,
  RULE_ANCIENNETE_CHECK,
  RULE_CONVENTION_MINIMA,
  RULE_HOURS_WORKED_DAYS,
  RULE_TRANSPORT_ALLOWANCE,
  RULE_CONGE_ACQUIS_CHECK,
  RULE_NET_NEGATIVE_CHECK,
  RULE_CONTRIBUTION_RATE_CHECK,
];

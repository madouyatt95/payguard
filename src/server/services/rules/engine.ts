// ============================================================
// PayGuard — France V1.5 Rules Engine
// Prudent, explainable rules for French payslip verification
// ============================================================
import {
  PayrollRule,
  RuleResult,
  StructuredPayrollDocument,
  AnalysisContext,
  AlertSeverity,
  AlertCategory,
  SourceEvidence,
} from '@/server/types';
import { ADDITIONAL_RULES } from './additionalRules';

// ============================================================
// Rule Builder Helper
// ============================================================
function buildResult(
  rule: PayrollRule,
  triggered: boolean,
  opts: {
    shortDescription: string;
    detailedExplanation: string;
    detectionReason: string;
    recommendation: string;
    legalCaution: string;
    confidence: number;
    severity?: AlertSeverity;
    sourceEvidence?: SourceEvidence[];
    metadata?: Record<string, unknown>;
  }
): RuleResult {
  return {
    ruleId: rule.id,
    ruleCode: rule.code,
    title: rule.title,
    category: rule.category,
    severity: opts.severity || rule.defaultSeverity,
    triggered,
    shortDescription: opts.shortDescription,
    detailedExplanation: opts.detailedExplanation,
    detectionReason: opts.detectionReason,
    recommendation: opts.recommendation,
    legalCaution: opts.legalCaution,
    confidence: opts.confidence,
    canAutoConclude: rule.canAutoConclude,
    sourceEvidence: opts.sourceEvidence || [],
    metadata: opts.metadata,
  };
}

function evidence(fieldName: string, raw: string, page?: number): SourceEvidence {
  return { fieldName, rawText: raw, page };
}

// ============================================================
// A. Document Integrity / Readability Rules
// ============================================================
const ruleDocumentIncomplete: PayrollRule = {
  id: 'rule-a01',
  code: 'DOC_INCOMPLETE',
  title: 'Document potentiellement incomplet',
  category: 'readability',
  defaultSeverity: 'important',
  shortDescription: 'Le document semble incomplet ou tronqué',
  dependsOnFields: ['grossSalary', 'netToPay', 'baseSalary'],
  canAutoConclude: false,
  run: (doc) => {
    const missing = [];
    if (!doc.grossSalary.value) missing.push('salaire brut');
    if (!doc.netToPay.value) missing.push('net à payer');
    if (!doc.baseSalary.value) missing.push('salaire de base');
    if (!doc.employeeIdentity.fullName.value) missing.push('nom du salarié');
    if (!doc.employerIdentity.companyName.value) missing.push('nom de l\'employeur');

    const triggered = missing.length >= 2;
    return buildResult(ruleDocumentIncomplete, triggered, {
      shortDescription: triggered
        ? `Plusieurs champs essentiels sont introuvables : ${missing.join(', ')}`
        : 'Les champs essentiels du document ont été détectés.',
      detailedExplanation: triggered
        ? `Notre outil n'a pas réussi à identifier ${missing.length} champs essentiels sur ce bulletin. Cela peut signifier que le document est incomplet, que le scan est de mauvaise qualité, ou que le format est inhabituel.`
        : 'Le document contient les informations principales attendues.',
      detectionReason: `Champs manquants détectés : ${missing.join(', ')}`,
      recommendation: triggered
        ? 'Vérifiez que toutes les pages du bulletin sont bien présentes. Si c\'est un scan, essayez avec une meilleure qualité d\'image.'
        : '',
      legalCaution: 'Cette détection est basée sur la lecture automatique et ne préjuge pas de la conformité réelle du document.',
      confidence: triggered ? 0.75 : 0.9,
      sourceEvidence: missing.map(m => evidence(m, 'non trouvé')),
    });
  },
};

const ruleOCRQuality: PayrollRule = {
  id: 'rule-a02',
  code: 'OCR_LOW_QUALITY',
  title: 'Qualité de lecture insuffisante',
  category: 'readability',
  defaultSeverity: 'important',
  shortDescription: 'La lecture automatique du document est de faible qualité',
  dependsOnFields: [],
  canAutoConclude: false,
  run: (doc, ctx) => {
    const conf = doc.overallParsingConfidence;
    const triggered = conf < ctx.configuration.ocrConfidenceThreshold;
    const veryLow = conf < 0.4;

    return buildResult(ruleOCRQuality, triggered, {
      shortDescription: veryLow
        ? 'La qualité de lecture est très faible. De nombreux champs sont probablement erronés.'
        : triggered
        ? 'La qualité de lecture est moyenne. Certains champs peuvent être incorrects.'
        : 'La qualité de lecture est satisfaisante.',
      detailedExplanation: triggered
        ? `Le score de confiance de lecture est de ${Math.round(conf * 100)}%. En dessous de ${Math.round(ctx.configuration.ocrConfidenceThreshold * 100)}%, les résultats de l'analyse sont significativement moins fiables. Les montants, taux et heures détectés doivent être vérifiés manuellement.`
        : `Le score de confiance de lecture est de ${Math.round(conf * 100)}%, ce qui est satisfaisant.`,
      detectionReason: `Score de confiance OCR : ${Math.round(conf * 100)}%`,
      recommendation: triggered
        ? 'Fournissez un fichier PDF natif (non scanné) ou un scan de meilleure qualité pour une analyse plus fiable.'
        : '',
      legalCaution: 'Les résultats d\'une lecture automatique ne se substituent pas à la lecture humaine du document.',
      confidence: 0.95,
      severity: veryLow ? 'critical' : triggered ? 'important' : 'info',
    });
  },
};

const ruleEssentialFieldsMissing: PayrollRule = {
  id: 'rule-a03',
  code: 'ESSENTIAL_FIELDS_MISSING',
  title: 'Champs essentiels absents ou non détectés',
  category: 'required_mentions',
  defaultSeverity: 'review',
  shortDescription: 'Certaines mentions attendues sur un bulletin français sont absentes',
  dependsOnFields: [],
  canAutoConclude: false,
  run: (doc) => {
    const checks = [
      { name: 'Nom du salarié', found: !!doc.employeeIdentity.fullName.value },
      { name: 'Nom de l\'employeur', found: !!doc.employerIdentity.companyName.value },
      { name: 'SIRET', found: !!doc.employerIdentity.siret?.value },
      { name: 'Période de paie', found: !!doc.payPeriod.month.value },
      { name: 'Poste / emploi', found: !!doc.employeeIdentity.position?.value },
      { name: 'Convention collective', found: !!doc.contractIndicators.collectiveAgreementHint?.value },
      { name: 'Salaire brut', found: !!doc.grossSalary.value },
      { name: 'Net à payer', found: !!doc.netToPay.value },
      { name: 'Net imposable', found: !!doc.taxableNet.value },
      { name: 'Cotisations sociales', found: doc.socialContributions.length > 0 },
    ];

    const missing = checks.filter(c => !c.found).map(c => c.name);
    const triggered = missing.length > 0;

    return buildResult(ruleEssentialFieldsMissing, triggered, {
      shortDescription: triggered
        ? `${missing.length} mention(s) attendue(s) non détectée(s) : ${missing.join(', ')}`
        : 'Toutes les mentions essentielles attendues ont été détectées.',
      detailedExplanation: triggered
        ? `Sur un bulletin de paie français, certaines mentions sont légalement obligatoires. Notre outil n'a pas réussi à détecter : ${missing.join(', ')}. Cela peut résulter d'un problème de lecture (scan de mauvaise qualité) ou d'une absence réelle sur le document.`
        : 'Le bulletin contient les mentions essentielles attendues sur un bulletin de paie français.',
      detectionReason: `Mentions introuvables par lecture automatique : ${missing.join(', ')}`,
      recommendation: triggered
        ? 'Vérifiez visuellement si ces mentions figurent bien sur votre bulletin. Si elles sont absentes, vous pouvez demander un bulletin corrigé à votre employeur.'
        : '',
      legalCaution: 'L\'absence de détection ne signifie pas nécessairement que la mention est absente du document. Il peut s\'agir d\'un problème de lecture. De même, la présence de toutes les mentions ne garantit pas la conformité du bulletin.',
      confidence: triggered ? 0.7 : 0.9,
      severity: missing.length >= 3 ? 'important' : 'review',
      sourceEvidence: missing.map(m => evidence(m, 'non détecté')),
    });
  },
};

// ============================================================
// B. Salary / Hours Rules
// ============================================================
const ruleSalaryHoursCoherence: PayrollRule = {
  id: 'rule-c01',
  code: 'SALARY_HOURS_INCOHERENCE',
  title: 'Incohérence entre heures et salaire de base',
  category: 'salary_base',
  defaultSeverity: 'review',
  shortDescription: 'Le nombre d\'heures et le salaire de base semblent incohérents',
  dependsOnFields: ['baseSalary', 'normalHours', 'hourlyRate'],
  canAutoConclude: false,
  run: (doc) => {
    const base = doc.baseSalary.value;
    const hours = doc.normalHours.value;
    const rate = doc.hourlyRate.value;

    if (!base || !hours || hours === 0) {
      return buildResult(ruleSalaryHoursCoherence, false, {
        shortDescription: 'Données insuffisantes pour vérifier la cohérence heures/salaire.',
        detailedExplanation: 'Le salaire de base ou le nombre d\'heures n\'a pas été détecté. La vérification n\'est pas possible.',
        detectionReason: 'Champs manquants',
        recommendation: '',
        legalCaution: '',
        confidence: 0.3,
      });
    }

    const computedRate = Math.round((base / hours) * 100) / 100;
    const triggered = rate !== null && Math.abs(computedRate - rate) > 0.5;
    const diff = rate ? Math.abs(computedRate - rate) : 0;

    return buildResult(ruleSalaryHoursCoherence, triggered, {
      shortDescription: triggered
        ? `Le taux horaire affiché (${rate}€) ne correspond pas au calcul base/heures (${computedRate}€). Écart de ${diff.toFixed(2)}€.`
        : `Le taux horaire (${computedRate}€/h) semble cohérent avec le salaire de base.`,
      detailedExplanation: triggered
        ? `En divisant le salaire de base (${base}€) par le nombre d'heures (${hours}h), on obtient un taux horaire de ${computedRate}€/h, alors que le bulletin affiche ${rate}€/h. Cet écart peut provenir d'un arrondi, d'une prime intégrée, ou d'une erreur.`
        : `Le calcul ${base}€ ÷ ${hours}h = ${computedRate}€/h est cohérent.`,
      detectionReason: `Calcul : ${base}€ ÷ ${hours}h = ${computedRate}€/h vs affiché ${rate}€/h`,
      recommendation: triggered ? 'Vérifiez le taux horaire et le salaire de base sur votre contrat de travail.' : '',
      legalCaution: 'Des éléments comme les primes intégrées ou les forfaits peuvent expliquer un écart apparent.',
      confidence: triggered ? 0.7 : 0.9,
      sourceEvidence: [
        evidence('baseSalary', doc.baseSalary.rawSource),
        evidence('normalHours', doc.normalHours.rawSource),
        evidence('hourlyRate', doc.hourlyRate.rawSource),
      ],
    });
  },
};

const ruleHourlyRateMissing: PayrollRule = {
  id: 'rule-c02',
  code: 'HOURLY_RATE_MISSING',
  title: 'Taux horaire non détecté',
  category: 'hourly_rate',
  defaultSeverity: 'review',
  shortDescription: 'Le taux horaire n\'a pas été trouvé sur le bulletin',
  dependsOnFields: ['hourlyRate'],
  canAutoConclude: false,
  run: (doc) => {
    const triggered = !doc.hourlyRate.value;
    return buildResult(ruleHourlyRateMissing, triggered, {
      shortDescription: triggered
        ? 'Le taux horaire n\'a pas été détecté sur ce bulletin.'
        : `Taux horaire détecté : ${doc.hourlyRate.value}€/h`,
      detailedExplanation: triggered
        ? 'Le taux horaire est normalement visible sur un bulletin de paie français. Son absence peut résulter d\'un problème de lecture, d\'un format de bulletin inhabituel, ou d\'un statut au forfait.'
        : '',
      detectionReason: triggered ? 'Aucun taux horaire trouvé dans le document' : '',
      recommendation: triggered ? 'Vérifiez votre taux horaire sur votre contrat de travail.' : '',
      legalCaution: 'Certains statuts (forfait jour, cadre dirigeant) peuvent expliquer l\'absence de taux horaire.',
      confidence: triggered ? 0.6 : 0.9,
    });
  },
};

// ============================================================
// C. Overtime Rules
// ============================================================
const ruleOvertimeNoMajoration: PayrollRule = {
  id: 'rule-d01',
  code: 'OVERTIME_NO_MAJORATION',
  title: 'Heures supplémentaires sans majoration visible',
  category: 'overtime',
  defaultSeverity: 'important',
  shortDescription: 'Des heures supplémentaires semblent présentes sans majoration clairement identifiable',
  dependsOnFields: ['overtimeHours', 'overtimeBreakdown', 'hourlyRate'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (!doc.overtimeHours.value || doc.overtimeHours.value === 0) {
      return buildResult(ruleOvertimeNoMajoration, false, {
        shortDescription: 'Aucune heure supplémentaire détectée.',
        detailedExplanation: '',
        detectionReason: '',
        recommendation: '',
        legalCaution: '',
        confidence: 0.9,
      });
    }

    // Check if any breakdown tier is unclear
    const unclearTiers = doc.overtimeBreakdown.filter(b =>
      b.tier === 'non précisé' || !b.rate.value || b.rate.value === 0
    );
    const hasBaseRate = doc.hourlyRate.value;

    if (unclearTiers.length > 0 && hasBaseRate) {
      // Try to check the actual rate vs expected majorated rate
      for (const tier of unclearTiers) {
        if (tier.amount.value && tier.hours.value && tier.hours.value > 0) {
          const actualHourlyOT = tier.amount.value / tier.hours.value;
          const expectedMin = hasBaseRate * ctx.configuration.overtimeTier1Rate;
          const isLow = actualHourlyOT < expectedMin * 0.95;

          if (isLow) {
            return buildResult(ruleOvertimeNoMajoration, true, {
              shortDescription: `Les heures supplémentaires (${tier.hours.value}h) semblent valorisées à ${actualHourlyOT.toFixed(2)}€/h, en dessous de la majoration minimale attendue de ${expectedMin.toFixed(2)}€/h.`,
              detailedExplanation: `En France, les heures supplémentaires doivent normalement être majorées d'au moins 25% (premières 8 heures) puis 50% au-delà. Sur ce bulletin, la valorisation apparente (${tier.amount.value}€ / ${tier.hours.value}h = ${actualHourlyOT.toFixed(2)}€/h) semble inférieure au taux majoré attendu de ${expectedMin.toFixed(2)}€/h (taux de base ${hasBaseRate}€ × 1,25). Cependant, une convention collective ou un accord d'entreprise peut prévoir des taux différents.`,
              detectionReason: `Taux effectif HS : ${actualHourlyOT.toFixed(2)}€/h < taux attendu : ${expectedMin.toFixed(2)}€/h`,
              recommendation: 'Vérifiez votre convention collective ou accord d\'entreprise pour connaître les taux de majoration applicables. En l\'absence de dispositions spécifiques, le taux légal est de 25% puis 50%.',
              legalCaution: 'Le taux de majoration peut être modifié par convention ou accord collectif (minimum 10%). L\'outil applique le taux légal standard par défaut.',
              confidence: 0.6,
              sourceEvidence: [evidence('heures_sup', tier.hours.rawSource)],
              metadata: { actualRate: actualHourlyOT, expectedRate: expectedMin },
            });
          }
        }
      }
    }

    if (unclearTiers.length > 0) {
      return buildResult(ruleOvertimeNoMajoration, true, {
        shortDescription: `Des heures supplémentaires (${doc.overtimeHours.value}h) sont détectées mais le taux de majoration n'est pas clairement identifiable.`,
        detailedExplanation: 'Les heures supplémentaires sont présentes mais nous n\'avons pas pu vérifier si une majoration correcte est appliquée. Le libellé ne précise pas le taux de majoration (25%, 50%, etc.).',
        detectionReason: 'Libellé d\'heures supplémentaires sans indication du taux de majoration',
        recommendation: 'Vérifiez sur votre bulletin que la majoration est bien appliquée et correspond à votre convention collective.',
        legalCaution: 'La majoration des heures supplémentaires peut varier selon la convention collective applicable. L\'outil ne peut pas conclure automatiquement dans ce cas.',
        confidence: 0.55,
        sourceEvidence: unclearTiers.map(t => evidence('heures_sup', t.hours.rawSource)),
      });
    }

    return buildResult(ruleOvertimeNoMajoration, false, {
      shortDescription: `Heures supplémentaires (${doc.overtimeHours.value}h) avec majorations identifiées : ${doc.overtimeBreakdown.map(b => b.tier).join(', ')}`,
      detailedExplanation: '',
      detectionReason: '',
      recommendation: '',
      legalCaution: '',
      confidence: 0.85,
    });
  },
};

const ruleOvertimeRecurrent: PayrollRule = {
  id: 'rule-d02',
  code: 'OVERTIME_RECURRENT',
  title: 'Heures supplémentaires récurrentes',
  category: 'overtime',
  defaultSeverity: 'info',
  shortDescription: 'Les heures supplémentaires apparaissent de manière récurrente',
  dependsOnFields: ['overtimeHours'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    const currentOT = doc.overtimeHours.value || 0;
    const prevDocs = ctx.previousDocuments;
    const prevWithOT = prevDocs.filter(d => (d.overtimeHours.value || 0) > 0);

    const triggered = currentOT > 0 && prevWithOT.length >= 2;

    return buildResult(ruleOvertimeRecurrent, triggered, {
      shortDescription: triggered
        ? `Des heures supplémentaires sont détectées ce mois-ci (${currentOT}h) et sur ${prevWithOT.length} mois précédent(s). Vérifiez que cela correspond à votre situation.`
        : currentOT > 0
        ? `Heures supplémentaires ce mois : ${currentOT}h`
        : 'Pas d\'heures supplémentaires détectées.',
      detailedExplanation: triggered
        ? 'La présence récurrente d\'heures supplémentaires sur plusieurs mois n\'est pas en soi anormale, mais peut mériter attention, notamment pour vérifier le bon paiement des majorations et le respect des plafonds légaux.'
        : '',
      detectionReason: triggered ? `HS détectées sur ${prevWithOT.length + 1} mois` : '',
      recommendation: triggered ? 'Si les heures supplémentaires sont systématiques, assurez-vous que les majorations sont correctement appliquées et que les limites légales sont respectées.' : '',
      legalCaution: 'Les heures supplémentaires récurrentes peuvent relever d\'un accord de modulation ou d\'annualisation du temps de travail.',
      confidence: triggered ? 0.7 : 0.9,
    });
  },
};

// ============================================================
// D. SMIC Coherence
// ============================================================
const ruleSmicCoherence: PayrollRule = {
  id: 'rule-e01',
  code: 'SMIC_COHERENCE',
  title: 'Cohérence minimale avec le SMIC',
  category: 'salary_base',
  defaultSeverity: 'important',
  shortDescription: 'Vérification de cohérence du salaire avec le SMIC',
  dependsOnFields: ['baseSalary', 'normalHours', 'hourlyRate'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    const base = doc.baseSalary.value;
    const hours = doc.normalHours.value;
    const rate = doc.hourlyRate.value;

    // Can't conclude without data
    if (!base || !hours) {
      return buildResult(ruleSmicCoherence, false, {
        shortDescription: 'Données insuffisantes pour la vérification SMIC.',
        detailedExplanation: '',
        detectionReason: '',
        recommendation: '',
        legalCaution: '',
        confidence: 0.3,
      });
    }

    // Non-conclusive cases
    const hasAbsences = doc.absences.length > 0;
    const isPartTime = doc.contractIndicators.workSchedule?.value?.toLowerCase().includes('partiel');
    const isApprentice = doc.employeeIdentity.position?.value?.toLowerCase().includes('apprenti');
    const hasPartialActivity = doc.absences.some(a => /activit[eé]\s*partielle/i.test(a.type));
    const reducedHours = hours < 140; // Less than ~92% of standard

    const nonConclusiveReasons: string[] = [];
    if (hasAbsences) nonConclusiveReasons.push('présence d\'absences');
    if (isPartTime) nonConclusiveReasons.push('temps partiel');
    if (isApprentice) nonConclusiveReasons.push('possible apprentissage');
    if (hasPartialActivity) nonConclusiveReasons.push('activité partielle');
    if (reducedHours) nonConclusiveReasons.push('nombre d\'heures réduit');

    if (nonConclusiveReasons.length > 0) {
      const effectiveRate = rate || (base / hours);
      const isVeryLow = effectiveRate < ctx.configuration.smicHoraireBrut * 0.7;

      return buildResult(ruleSmicCoherence, isVeryLow, {
        shortDescription: isVeryLow
          ? `Le taux horaire effectif (${effectiveRate.toFixed(2)}€/h) semble très bas, mais la vérification SMIC est non concluante en raison de : ${nonConclusiveReasons.join(', ')}.`
          : `Vérification SMIC non concluante en raison de : ${nonConclusiveReasons.join(', ')}.`,
        detailedExplanation: `Le contexte du bulletin (${nonConclusiveReasons.join(', ')}) ne permet pas de conclure sur le respect du SMIC. Le calcul simple "salaire de base ÷ heures" ne prend pas en compte les situations spécifiques qui modifient la base de comparaison.`,
        detectionReason: `Non concluant : ${nonConclusiveReasons.join(', ')}`,
        recommendation: 'Pour un temps partiel, un apprenti ou en cas d\'absence, la comparaison avec le SMIC nécessite des ajustements que l\'outil ne peut pas effectuer automatiquement.',
        legalCaution: 'Le SMIC applicable peut varier selon le statut, l\'âge, et la convention collective. L\'outil ne peut pas déterminer ces paramètres automatiquement.',
        confidence: 0.4,
        severity: isVeryLow ? 'review' : 'info',
        sourceEvidence: [evidence('baseSalary', doc.baseSalary.rawSource)],
      });
    }

    // Standard full-time check
    const effectiveRate = rate || (base / hours);
    const isBelow = effectiveRate < ctx.configuration.smicHoraireBrut;
    const percentBelow = isBelow ? Math.round((1 - effectiveRate / ctx.configuration.smicHoraireBrut) * 100) : 0;

    return buildResult(ruleSmicCoherence, isBelow, {
      shortDescription: isBelow
        ? `Le taux horaire effectif (${effectiveRate.toFixed(2)}€/h) semble inférieur au SMIC horaire brut (${ctx.configuration.smicHoraireBrut}€/h), soit ${percentBelow}% en dessous.`
        : `Le taux horaire (${effectiveRate.toFixed(2)}€/h) est au-dessus du SMIC (${ctx.configuration.smicHoraireBrut}€/h).`,
      detailedExplanation: isBelow
        ? `Sur une base temps plein standard (${hours}h), le taux horaire effectif calculé est de ${effectiveRate.toFixed(2)}€/h. Le SMIC horaire brut en vigueur est de ${ctx.configuration.smicHoraireBrut}€/h. Attention, la convention collective peut prévoir un minimum conventionnel supérieur au SMIC.`
        : '',
      detectionReason: isBelow ? `${effectiveRate.toFixed(2)}€/h < SMIC ${ctx.configuration.smicHoraireBrut}€/h` : '',
      recommendation: isBelow ? 'Vérifiez avec votre employeur ou un représentant du personnel si votre rémunération est conforme au SMIC et aux minima conventionnels.' : '',
      legalCaution: 'Le SMIC utilisé est indicatif (valeur configurée). Des minima conventionnels peuvent s\'appliquer. La vérification exacte nécessite de connaître votre convention collective.',
      confidence: isBelow ? 0.7 : 0.9,
      severity: isBelow ? 'critical' : 'info',
      sourceEvidence: [evidence('baseSalary', doc.baseSalary.rawSource), evidence('hourlyRate', doc.hourlyRate.rawSource)],
    });
  },
};

// ============================================================
// E. Bonus/Allowance Rules
// ============================================================
const ruleBonusDisappeared: PayrollRule = {
  id: 'rule-f01',
  code: 'BONUS_DISAPPEARED',
  title: 'Prime ou indemnité habituellement présente non détectée',
  category: 'bonuses',
  defaultSeverity: 'review',
  shortDescription: 'Une prime récurrente n\'est plus détectée ce mois-ci',
  dependsOnFields: ['bonuses'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (ctx.previousDocuments.length === 0) {
      return buildResult(ruleBonusDisappeared, false, {
        shortDescription: 'Pas de mois précédent disponible pour la comparaison des primes.',
        detailedExplanation: '',
        detectionReason: '',
        recommendation: '',
        legalCaution: '',
        confidence: 0.5,
      });
    }

    // Find recurring bonuses in previous months
    const currentLabels = new Set(doc.bonuses.map(b => b.label.toLowerCase()));
    const prevBonusCounts: Record<string, number> = {};

    for (const prev of ctx.previousDocuments) {
      for (const bonus of prev.bonuses) {
        const key = bonus.label.toLowerCase();
        prevBonusCounts[key] = (prevBonusCounts[key] || 0) + 1;
      }
    }

    const disappeared: string[] = [];
    for (const [label, count] of Object.entries(prevBonusCounts)) {
      if (count >= 2 && !currentLabels.has(label)) {
        disappeared.push(label);
      }
    }

    const triggered = disappeared.length > 0;

    return buildResult(ruleBonusDisappeared, triggered, {
      shortDescription: triggered
        ? `${disappeared.length} prime(s) habituellement présente(s) non détectée(s) ce mois : ${disappeared.join(', ')}`
        : 'Toutes les primes habituelles sont présentes.',
      detailedExplanation: triggered
        ? `Les primes suivantes apparaissaient sur les bulletins précédents mais ne sont pas détectées ce mois-ci : ${disappeared.join(', ')}. Cela peut être normal (prime saisonnière, objectifs non atteints, changement de situation) ou constituer un oubli.`
        : '',
      detectionReason: triggered ? `Primes précédemment récurrentes et maintenant absentes : ${disappeared.join(', ')}` : '',
      recommendation: triggered ? 'Vérifiez si la suppression de cette prime est justifiée. Certaines primes sont conditionnelles et leur absence peut être normale.' : '',
      legalCaution: 'L\'absence d\'une prime peut avoir de nombreuses causes légitimes (objectifs, conditions non remplies, accord modifié). L\'outil signale simplement la variation.',
      confidence: triggered ? 0.65 : 0.85,
      sourceEvidence: disappeared.map(d => evidence('prime', `"${d}" — absente ce mois`)),
    });
  },
};

const ruleBonusSignificantDrop: PayrollRule = {
  id: 'rule-f02',
  code: 'BONUS_SIGNIFICANT_DROP',
  title: 'Baisse notable d\'une prime ou indemnité',
  category: 'bonuses',
  defaultSeverity: 'review',
  shortDescription: 'Une prime ou indemnité a significativement diminué par rapport au mois précédent',
  dependsOnFields: ['bonuses', 'allowances'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (ctx.previousDocuments.length === 0) {
      return buildResult(ruleBonusSignificantDrop, false, {
        shortDescription: 'Pas de comparaison possible sans mois précédent.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.5,
      });
    }

    const prev = ctx.previousDocuments[0];
    const drops: { label: string; before: number; after: number; drop: number }[] = [];

    for (const curr of [...doc.bonuses, ...doc.allowances.map(a => ({ ...a, type: 'unknown' as const }))]) {
      const match = [...prev.bonuses, ...prev.allowances.map(a => ({ ...a, type: 'unknown' as const }))].find(
        p => p.label.toLowerCase() === curr.label.toLowerCase()
      );
      if (match && match.amount.value && curr.amount.value) {
        const drop = ((match.amount.value - curr.amount.value) / match.amount.value) * 100;
        if (drop > (ctx.configuration.customThresholds.bonusVariationThreshold || 30)) {
          drops.push({ label: curr.label, before: match.amount.value, after: curr.amount.value, drop: Math.round(drop) });
        }
      }
    }

    const triggered = drops.length > 0;

    return buildResult(ruleBonusSignificantDrop, triggered, {
      shortDescription: triggered
        ? drops.map(d => `${d.label} : ${d.before}€ → ${d.after}€ (-${d.drop}%)`).join(' | ')
        : 'Aucune variation notable des primes et indemnités.',
      detailedExplanation: triggered
        ? 'Une baisse significative d\'une prime ne constitue pas nécessairement une anomalie. Elle peut résulter de conditions de versement (objectifs, présence, conditions spécifiques). L\'outil signale cette variation pour votre attention.'
        : '',
      detectionReason: triggered ? drops.map(d => `Baisse ${d.label}: -${d.drop}%`).join(', ') : '',
      recommendation: triggered ? 'Vérifiez les conditions de versement de cette prime dans votre contrat ou convention collective.' : '',
      legalCaution: 'La variation d\'une prime conditionnelle est normale. Seule une suppression unilatérale d\'un élément contractuel serait problématique.',
      confidence: triggered ? 0.6 : 0.85,
    });
  },
};

// ============================================================
// F. Leave / Absence Rules
// ============================================================
const ruleAbsenceNoImpact: PayrollRule = {
  id: 'rule-g01',
  code: 'ABSENCE_NO_VISIBLE_IMPACT',
  title: 'Absence détectée sans impact apparent',
  category: 'leave_absence',
  defaultSeverity: 'review',
  shortDescription: 'Des absences sont mentionnées sans impact clair sur la rémunération',
  dependsOnFields: ['absences', 'grossSalary'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (doc.absences.length === 0) {
      return buildResult(ruleAbsenceNoImpact, false, {
        shortDescription: 'Aucune absence détectée sur ce bulletin.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.9,
      });
    }

    const absencesWithNoAmount = doc.absences.filter(a => !a.amount?.value);
    const triggered = absencesWithNoAmount.length > 0;

    return buildResult(ruleAbsenceNoImpact, triggered, {
      shortDescription: triggered
        ? `${absencesWithNoAmount.length} absence(s) détectée(s) sans impact monétaire apparent : ${absencesWithNoAmount.map(a => a.type).join(', ')}`
        : `Absences détectées avec impact visible : ${doc.absences.map(a => a.type).join(', ')}`,
      detailedExplanation: triggered
        ? 'Des mentions d\'absence apparaissent sur le bulletin mais leur impact financier n\'est pas clairement identifiable. Cela peut être normal (maintien de salaire, subrogation) ou mériter une vérification.'
        : '',
      detectionReason: triggered ? `Absence(s) sans montant associé visible : ${absencesWithNoAmount.map(a => a.type).join(', ')}` : '',
      recommendation: triggered ? 'Vérifiez que les absences sont correctement déduites ou compensées sur votre bulletin.' : '',
      legalCaution: 'Le maintien de salaire en cas d\'absence peut résulter d\'un accord d\'entreprise, de la convention collective, ou de la subrogation de l\'employeur.',
      confidence: triggered ? 0.5 : 0.85,
      sourceEvidence: absencesWithNoAmount.map(a => evidence('absence', a.rawText)),
    });
  },
};

// ============================================================
// G. Contributions / Totals Rules
// ============================================================
const ruleNetGreaterThanGross: PayrollRule = {
  id: 'rule-h01',
  code: 'NET_GREATER_THAN_GROSS',
  title: 'Net à payer supérieur au brut',
  category: 'totals',
  defaultSeverity: 'critical',
  shortDescription: 'Le net à payer est supérieur au brut — cette situation est très inhabituelle',
  dependsOnFields: ['grossSalary', 'netToPay'],
  canAutoConclude: true,
  run: (doc) => {
    const gross = doc.grossSalary.value;
    const net = doc.netToPay.value;

    if (!gross || !net) {
      return buildResult(ruleNetGreaterThanGross, false, {
        shortDescription: 'Données insuffisantes pour la comparaison brut/net.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.3,
      });
    }

    const triggered = net > gross;

    return buildResult(ruleNetGreaterThanGross, triggered, {
      shortDescription: triggered
        ? `Le net à payer (${net.toFixed(2)}€) est supérieur au brut (${gross.toFixed(2)}€). C'est une situation très inhabituelle.`
        : `Brut (${gross.toFixed(2)}€) > Net (${net.toFixed(2)}€) — ratio normal.`,
      detailedExplanation: triggered
        ? 'En temps normal, le net à payer est toujours inférieur au brut en raison des cotisations sociales et du prélèvement à la source. Un net supérieur au brut peut indiquer une erreur de calcul, un problème de lecture, ou une situation très exceptionnelle (régularisation importante).'
        : '',
      detectionReason: triggered ? `Net ${net.toFixed(2)}€ > Brut ${gross.toFixed(2)}€` : '',
      recommendation: triggered ? 'Cette anomalie est potentiellement grave. Vérifiez attentivement votre bulletin et contactez votre service paie si nécessaire.' : '',
      legalCaution: 'Si la lecture automatique est correcte, cette situation doit être vérifiée sans délai car elle peut indiquer une erreur importante.',
      confidence: triggered ? 0.9 : 0.95,
      sourceEvidence: [evidence('grossSalary', doc.grossSalary.rawSource), evidence('netToPay', doc.netToPay.rawSource)],
    });
  },
};

const ruleTaxableNetMissing: PayrollRule = {
  id: 'rule-h02',
  code: 'TAXABLE_NET_MISSING',
  title: 'Net imposable absent ou incohérent',
  category: 'totals',
  defaultSeverity: 'review',
  shortDescription: 'Le net imposable n\'a pas été détecté ou semble incohérent',
  dependsOnFields: ['taxableNet', 'grossSalary', 'netToPay'],
  canAutoConclude: false,
  run: (doc) => {
    const taxNet = doc.taxableNet.value;
    const gross = doc.grossSalary.value;
    const net = doc.netToPay.value;

    if (!taxNet && gross && net) {
      return buildResult(ruleTaxableNetMissing, true, {
        shortDescription: 'Le net imposable n\'a pas été détecté sur ce bulletin.',
        detailedExplanation: 'Le net imposable est un élément important du bulletin de paie, utilisé pour le calcul de l\'impôt sur le revenu. Son absence peut résulter d\'un problème de lecture.',
        detectionReason: 'Champ "net imposable" non trouvé',
        recommendation: 'Vérifiez visuellement que le net imposable figure bien sur votre bulletin.',
        legalCaution: 'Le net imposable est une mention obligatoire sur les bulletins de paie.',
        confidence: 0.7,
      });
    }

    if (taxNet && gross && net) {
      // Net imposable should typically be between net and gross
      const suspicious = taxNet > gross * 1.05 || taxNet < net * 0.8;
      return buildResult(ruleTaxableNetMissing, suspicious, {
        shortDescription: suspicious
          ? `Le net imposable (${taxNet.toFixed(2)}€) semble incohérent par rapport au brut (${gross.toFixed(2)}€) et au net (${net.toFixed(2)}€).`
          : `Net imposable cohérent : ${taxNet.toFixed(2)}€`,
        detailedExplanation: suspicious
          ? 'Le net imposable se situe normalement entre le net à payer et le brut. Un net imposable en dehors de cette fourchette peut indiquer une erreur de lecture ou de calcul.'
          : '',
        detectionReason: suspicious ? `Net imposable ${taxNet.toFixed(2)}€ hors fourchette attendue` : '',
        recommendation: suspicious ? 'Vérifiez le montant du net imposable sur votre bulletin.' : '',
        legalCaution: '',
        confidence: suspicious ? 0.6 : 0.9,
      });
    }

    return buildResult(ruleTaxableNetMissing, false, {
      shortDescription: 'Vérification non concluante — données insuffisantes.',
      detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.3,
    });
  },
};

const ruleGrossNetRatio: PayrollRule = {
  id: 'rule-h03',
  code: 'GROSS_NET_RATIO_UNUSUAL',
  title: 'Ratio brut/net inhabituel',
  category: 'totals',
  defaultSeverity: 'review',
  shortDescription: 'Le rapport entre le net et le brut est inhabituel',
  dependsOnFields: ['grossSalary', 'netToPay'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    const gross = doc.grossSalary.value;
    const net = doc.netToPay.value;

    if (!gross || !net || gross === 0) {
      return buildResult(ruleGrossNetRatio, false, {
        shortDescription: 'Données insuffisantes.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.3,
      });
    }

    const ratio = net / gross;
    const minRatio = ctx.configuration.customThresholds.netGrossRatioMin || 0.55;
    const maxRatio = ctx.configuration.customThresholds.netGrossRatioMax || 0.85;
    const unusual = ratio < minRatio || ratio > maxRatio;

    return buildResult(ruleGrossNetRatio, unusual, {
      shortDescription: unusual
        ? `Le ratio net/brut (${(ratio * 100).toFixed(1)}%) est en dehors de la fourchette habituelle (${minRatio * 100}% — ${maxRatio * 100}%).`
        : `Ratio net/brut normal : ${(ratio * 100).toFixed(1)}%`,
      detailedExplanation: unusual
        ? `En France, le ratio net/brut se situe généralement entre ${minRatio * 100}% et ${maxRatio * 100}% selon le statut (cadre/non-cadre) et les cotisations. Un ratio de ${(ratio * 100).toFixed(1)}% peut s'expliquer par des cotisations particulières, un taux PAS élevé, ou un problème de calcul.`
        : '',
      detectionReason: unusual ? `Ratio ${(ratio * 100).toFixed(1)}% hors fourchette ${minRatio * 100}%-${maxRatio * 100}%` : '',
      recommendation: unusual ? 'Vérifiez les cotisations et le prélèvement à la source.' : '',
      legalCaution: 'Le ratio dépend du statut, de la convention collective, des cotisations optionnelles (mutuelle, prévoyance). L\'outil utilise une fourchette indicative.',
      confidence: unusual ? 0.65 : 0.9,
      sourceEvidence: [evidence('grossSalary', doc.grossSalary.rawSource), evidence('netToPay', doc.netToPay.rawSource)],
    });
  },
};

// ============================================================
// H. Historical Comparison Rules
// ============================================================
const ruleNetSalaryVariation: PayrollRule = {
  id: 'rule-i01',
  code: 'NET_SALARY_VARIATION',
  title: 'Variation significative du net à payer',
  category: 'month_to_month',
  defaultSeverity: 'review',
  shortDescription: 'Le net à payer a significativement varié par rapport au mois précédent',
  dependsOnFields: ['netToPay'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (ctx.previousDocuments.length === 0 || !doc.netToPay.value) {
      return buildResult(ruleNetSalaryVariation, false, {
        shortDescription: 'Pas de comparaison possible.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.5,
      });
    }

    const current = doc.netToPay.value;
    const prev = ctx.previousDocuments[0].netToPay.value;
    if (!prev) {
      return buildResult(ruleNetSalaryVariation, false, {
        shortDescription: 'Net précédent non disponible.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.5,
      });
    }

    const variation = ((current - prev) / prev) * 100;
    const threshold = ctx.configuration.salaryVariationThresholdPercent;
    const triggered = Math.abs(variation) > threshold;

    // Try to explain the variation
    const explanations: string[] = [];
    const hasAbsence = doc.absences.length > 0;
    const hasOT = (doc.overtimeHours.value || 0) !== (ctx.previousDocuments[0].overtimeHours.value || 0);
    const hasBonusChange = doc.bonuses.length !== ctx.previousDocuments[0].bonuses.length;

    if (hasAbsence) explanations.push('présence d\'absences ce mois');
    if (hasOT) explanations.push('variation des heures supplémentaires');
    if (hasBonusChange) explanations.push('changement de primes');

    const isExplainable = explanations.length > 0;
    const anomalyType = triggered && !isExplainable ? 'probable_anomaly' : triggered && isExplainable ? 'to_verify' : 'normal_variation';

    return buildResult(ruleNetSalaryVariation, triggered, {
      shortDescription: triggered
        ? `Net à payer : ${prev.toFixed(2)}€ → ${current.toFixed(2)}€ (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%).${isExplainable ? ` Explications possibles : ${explanations.join(', ')}.` : ' Aucune explication évidente détectée.'}`
        : `Variation du net à payer dans la norme (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%).`,
      detailedExplanation: triggered
        ? `Le net à payer a varié de ${variation.toFixed(1)}% par rapport au mois précédent, dépassant le seuil de ${threshold}%. ${isExplainable ? `Cette variation pourrait s'expliquer par : ${explanations.join(', ')}.` : 'Aucun élément visible ne semble expliquer cette variation. Il peut s\'agir d\'un changement de situation, d\'une régularisation, ou d\'une erreur.'}`
        : '',
      detectionReason: triggered ? `Variation ${variation.toFixed(1)}% > seuil ${threshold}%` : '',
      recommendation: triggered && !isExplainable ? 'Demandez des explications à votre service paie sur cette variation importante.' : '',
      legalCaution: 'Les variations de salaire peuvent avoir de nombreuses causes légitimes que l\'outil ne peut pas toutes identifier.',
      confidence: triggered ? 0.7 : 0.9,
      severity: triggered && !isExplainable ? 'important' : triggered ? 'review' : 'info',
      metadata: { variation, anomalyType, explanations },
      sourceEvidence: [evidence('netToPay', doc.netToPay.rawSource)],
    });
  },
};

const ruleGrossSalaryVariation: PayrollRule = {
  id: 'rule-i02',
  code: 'GROSS_SALARY_VARIATION',
  title: 'Variation du salaire brut',
  category: 'month_to_month',
  defaultSeverity: 'review',
  shortDescription: 'Le salaire brut a significativement varié',
  dependsOnFields: ['grossSalary'],
  canAutoConclude: false,
  run: (doc, ctx) => {
    if (ctx.previousDocuments.length === 0 || !doc.grossSalary.value) {
      return buildResult(ruleGrossSalaryVariation, false, {
        shortDescription: 'Pas de comparaison possible.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.5,
      });
    }

    const current = doc.grossSalary.value;
    const prev = ctx.previousDocuments[0].grossSalary.value;
    if (!prev) {
      return buildResult(ruleGrossSalaryVariation, false, {
        shortDescription: 'Brut précédent non disponible.',
        detailedExplanation: '', detectionReason: '', recommendation: '', legalCaution: '', confidence: 0.5,
      });
    }

    const variation = ((current - prev) / prev) * 100;
    const threshold = ctx.configuration.salaryVariationThresholdPercent;
    const triggered = Math.abs(variation) > threshold;

    return buildResult(ruleGrossSalaryVariation, triggered, {
      shortDescription: triggered
        ? `Brut : ${prev.toFixed(2)}€ → ${current.toFixed(2)}€ (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%)`
        : `Variation normale du brut (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%)`,
      detailedExplanation: triggered
        ? `Le salaire brut a varié de ${variation.toFixed(1)}% par rapport au mois précédent.`
        : '',
      detectionReason: triggered ? `Variation brut : ${variation.toFixed(1)}%` : '',
      recommendation: triggered ? 'Vérifiez les éléments qui composent votre brut ce mois-ci.' : '',
      legalCaution: 'Les éléments variables (HS, primes, absences) provoquent naturellement des variations du brut.',
      confidence: triggered ? 0.7 : 0.9,
      sourceEvidence: [evidence('grossSalary', doc.grossSalary.rawSource)],
    });
  },
};

const ruleRepeatedAlert: PayrollRule = {
  id: 'rule-i03',
  code: 'REPEATED_ALERT',
  title: 'Alerte répétée sur plusieurs mois',
  category: 'month_to_month',
  defaultSeverity: 'important',
  shortDescription: 'Une même alerte se répète sur plusieurs bulletins',
  dependsOnFields: [],
  canAutoConclude: false,
  run: (_doc, ctx) => {
    // This rule is evaluated after all other rules — placeholder
    // In practice, the rule engine would pass results from previous analyses
    const triggered = false;

    return buildResult(ruleRepeatedAlert, triggered, {
      shortDescription: 'Pas d\'alertes répétées détectées pour le moment.',
      detailedExplanation: 'Cette vérification nécessite l\'analyse de plusieurs bulletins successifs.',
      detectionReason: '',
      recommendation: '',
      legalCaution: '',
      confidence: 0.5,
    });
  },
};

// ============================================================
// I. PAS / Withholding Tax
// ============================================================
const ruleWithholdingTax: PayrollRule = {
  id: 'rule-h04',
  code: 'WITHHOLDING_TAX_CHECK',
  title: 'Prélèvement à la source',
  category: 'contributions',
  defaultSeverity: 'info',
  shortDescription: 'Vérification du prélèvement à la source',
  dependsOnFields: ['withholdingTax'],
  canAutoConclude: false,
  run: (doc) => {
    if (!doc.withholdingTax.visible) {
      return buildResult(ruleWithholdingTax, true, {
        shortDescription: 'Le prélèvement à la source n\'a pas été détecté sur ce bulletin.',
        detailedExplanation: 'Depuis 2019, le prélèvement à la source doit figurer sur le bulletin de paie. Son absence peut résulter d\'un problème de lecture ou d\'une mise en page inhabituelle.',
        detectionReason: 'PAS non détecté',
        recommendation: 'Vérifiez visuellement que le PAS figure sur votre bulletin.',
        legalCaution: 'Le PAS peut être à 0% dans certaines situations (revenus faibles, choix du taux individualisé).',
        confidence: 0.6,
        severity: 'review',
      });
    }

    const rate = doc.withholdingTax.rate?.value;
    const amount = doc.withholdingTax.amount?.value;

    if (rate !== undefined && rate === 0) {
      return buildResult(ruleWithholdingTax, false, {
        shortDescription: `PAS détecté avec un taux de 0% — aucun prélèvement ce mois. Montant : ${amount?.toFixed(2) || '0,00'}€`,
        detailedExplanation: 'Un taux de PAS à 0% est tout à fait normal si vos revenus sont en dessous d\'un certain seuil ou si vous avez opté pour un taux individualisé.',
        detectionReason: 'PAS à 0%',
        recommendation: '',
        legalCaution: '',
        confidence: 0.9,
      });
    }

    return buildResult(ruleWithholdingTax, false, {
      shortDescription: `PAS détecté : taux ${rate?.toFixed(2) || '?'}%, montant ${amount?.toFixed(2) || '?'}€`,
      detailedExplanation: '',
      detectionReason: '',
      recommendation: '',
      legalCaution: '',
      confidence: 0.85,
      sourceEvidence: doc.withholdingTax.amount ? [evidence('PAS', doc.withholdingTax.amount.rawSource)] : [],
    });
  },
};

// ============================================================
// RULE REGISTRY
// ============================================================
export const FRANCE_RULES_V15: PayrollRule[] = [
  // A. Document integrity
  ruleDocumentIncomplete,
  ruleOCRQuality,
  ruleEssentialFieldsMissing,

  // C. Salary / Hours
  ruleSalaryHoursCoherence,
  ruleHourlyRateMissing,

  // D. Overtime
  ruleOvertimeNoMajoration,
  ruleOvertimeRecurrent,

  // E. SMIC
  ruleSmicCoherence,

  // F. Bonuses
  ruleBonusDisappeared,
  ruleBonusSignificantDrop,

  // G. Leave / Absence
  ruleAbsenceNoImpact,

  // H. Contributions / Totals
  ruleNetGreaterThanGross,
  ruleTaxableNetMissing,
  ruleGrossNetRatio,
  ruleWithholdingTax,

  // I. Historical
  ruleNetSalaryVariation,
  ruleGrossSalaryVariation,
  ruleRepeatedAlert,

  // J. Additional V1.5 rules (12)
  ...ADDITIONAL_RULES,
];

// ============================================================
// Rule Engine Runner
// ============================================================
export class RuleEngine {
  private rules: PayrollRule[];

  constructor(rules?: PayrollRule[]) {
    this.rules = rules || FRANCE_RULES_V15;
  }

  run(doc: StructuredPayrollDocument, ctx: AnalysisContext): RuleResult[] {
    const enabledRules = this.rules.filter(r => {
      if (ctx.configuration.disabledRules.includes(r.code)) return false;
      if (ctx.configuration.enabledRules.includes('*')) return true;
      return ctx.configuration.enabledRules.includes(r.code);
    });

    return enabledRules.map(rule => {
      try {
        return rule.run(doc, ctx);
      } catch (err) {
        return buildResult(rule, false, {
          shortDescription: `Erreur lors de l'exécution de la règle ${rule.code}`,
          detailedExplanation: `Une erreur technique est survenue : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
          detectionReason: 'Erreur technique',
          recommendation: '',
          legalCaution: '',
          confidence: 0,
        });
      }
    });
  }
}

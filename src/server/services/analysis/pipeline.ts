// ============================================================
// PayGuard — Report Generator & Analysis Pipeline
// ============================================================
import {
  StructuredPayrollDocument,
  AnalysisContext,
  AnalysisReport,
  RuleResult,
  GlobalStatus,
  PayrollProfileGuess,
  ComparisonSummary,
  ComparisonField,
} from '@/server/types';
import { RuleEngine } from '@/server/services/rules/engine';
import { getConfig } from '@/server/config';
import { v4 as uuid } from 'uuid';

// ============================================================
// Analysis Pipeline
// ============================================================
export class AnalysisPipeline {
  private ruleEngine: RuleEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
  }

  analyze(
    doc: StructuredPayrollDocument,
    previousDocuments: StructuredPayrollDocument[] = [],
  ): AnalysisReport {
    const config = getConfig();
    const ctx = this.buildContext(doc, previousDocuments, config);
    const results = this.ruleEngine.run(doc, ctx);
    return this.generateReport(doc, results, ctx);
  }

  private buildContext(
    doc: StructuredPayrollDocument,
    previousDocuments: StructuredPayrollDocument[],
    config: ReturnType<typeof getConfig>,
  ): AnalysisContext {
    return {
      previousDocuments,
      configuration: config,
      payrollProfileGuess: this.guessProfile(doc),
      parsingConfidence: doc.overallParsingConfidence,
      assumptions: this.buildAssumptions(doc),
      unresolvedAmbiguities: this.buildAmbiguities(doc),
    };
  }

  private guessProfile(doc: StructuredPayrollDocument): PayrollProfileGuess {
    const hours = doc.normalHours.value;
    const schedule = doc.contractIndicators.workSchedule?.value?.toLowerCase() || '';
    const status = doc.employeeIdentity.status?.value?.toLowerCase() || '';
    const hasPartialActivity = doc.absences.some(a => /activit[eé]\s*partielle/i.test(a.type));

    return {
      isFullTime: schedule.includes('plein') ? true : schedule.includes('partiel') ? false : (hours && hours >= 140 ? true : null),
      isCadre: status.includes('cadre') && !status.includes('non') ? true : status.includes('non') ? false : null,
      hasSpecificAgreement: !!doc.contractIndicators.collectiveAgreementHint?.value,
      isApprentice: doc.employeeIdentity.position?.value?.toLowerCase().includes('apprenti') || null,
      isPartialActivity: hasPartialActivity || null,
      monthlyHoursReference: 151.67,
    };
  }

  private buildAssumptions(doc: StructuredPayrollDocument): string[] {
    const assumptions: string[] = [];
    const profile = this.guessProfile(doc);

    if (profile.isFullTime === null) {
      assumptions.push('Le temps de travail (plein/partiel) n\'a pas été clairement identifié. L\'analyse suppose un temps plein par défaut.');
    }
    if (profile.isCadre === null) {
      assumptions.push('Le statut cadre/non-cadre n\'a pas été identifié. Certaines vérifications de cotisations peuvent être imprécises.');
    }
    if (!profile.hasSpecificAgreement) {
      assumptions.push('Aucune convention collective n\'a été détectée. Les vérifications utilisent les taux légaux par défaut.');
    }
    if (doc.overallParsingConfidence < 0.7) {
      assumptions.push('La qualité de lecture est moyenne. Les montants et champs détectés peuvent contenir des erreurs.');
    }

    return assumptions;
  }

  private buildAmbiguities(doc: StructuredPayrollDocument): string[] {
    const ambiguities: string[] = [];

    if (doc.overtimeBreakdown.some(b => b.tier === 'non précisé')) {
      ambiguities.push('Le taux de majoration des heures supplémentaires n\'est pas clairement identifié.');
    }
    if (doc.absences.some(a => !a.amount?.value)) {
      ambiguities.push('Certaines absences sont mentionnées sans montant associé clairement identifiable.');
    }
    if (doc.socialContributions.some(c => !c.rate)) {
      ambiguities.push('Certains taux de cotisation n\'ont pas pu être lus.');
    }

    return ambiguities;
  }

  private generateReport(
    doc: StructuredPayrollDocument,
    results: RuleResult[],
    ctx: AnalysisContext,
  ): AnalysisReport {
    const triggered = results.filter(r => r.triggered);
    const critical = triggered.filter(r => r.severity === 'critical');
    const important = triggered.filter(r => r.severity === 'important');
    const review = triggered.filter(r => r.severity === 'review');
    const info = results.filter(r => r.severity === 'info' || !r.triggered);

    // Score calculation
    const globalScore = this.calculateScore(doc, triggered);
    const globalStatus = this.getStatus(globalScore, critical.length);

    // Normal findings (rules that passed)
    const normalFindings = results
      .filter(r => !r.triggered)
      .map(r => r.shortDescription)
      .filter(s => s && s !== 'Données insuffisantes.' && s.length > 10);

    // Comparison summary
    const comparisonSummary = ctx.previousDocuments.length > 0
      ? this.buildComparisonSummary(doc, ctx.previousDocuments)
      : undefined;

    return {
      id: uuid(),
      documentId: doc.documentId,
      generatedAt: new Date().toISOString(),
      globalScore,
      globalStatus,
      confidenceBadge: this.getConfidenceBadge(doc.overallParsingConfidence),
      anomaliesCount: triggered.length,
      criticalCount: critical.length,
      importantCount: important.length,
      reviewCount: review.length,
      infoCount: info.length,
      extractionQuality: doc.overallParsingConfidence,
      parsingCompleteness: this.calculateCompleteness(doc),
      executiveSummary: this.buildExecutiveSummary(doc, triggered, globalStatus, ctx),
      readabilityAssessment: this.buildReadabilityAssessment(doc),
      normalFindings,
      criticalFindings: critical,
      importantFindings: important,
      reviewFindings: review,
      infoFindings: info,
      comparisonSummary,
      assumptions: ctx.assumptions,
      analysisLimits: [
        'Cette analyse est réalisée par un outil automatique et ne constitue pas un avis juridique, comptable ou une expertise paie.',
        'Les résultats dépendent fortement de la qualité du document fourni.',
        'L\'outil ne connaît pas votre convention collective ni vos accords d\'entreprise, sauf indication explicite.',
        'Certaines situations légitimes (forfait, modulation, annualisation) peuvent générer des alertes non pertinentes.',
      ],
      practicalAdvice: this.buildPracticalAdvice(triggered, ctx),
      cautionNotices: [
        'PayGuard est un outil d\'aide à la lecture. Il ne remplace pas les conseils d\'un professionnel de la paie ou d\'un avocat en droit du travail.',
        'En cas de doute sérieux sur votre bulletin, contactez votre service RH, un syndicat, ou l\'inspection du travail.',
        'Les montants affichés sont issus de la lecture automatique et peuvent contenir des erreurs, en particulier sur les documents scannés.',
      ],
      extractedDataSnapshot: this.buildSnapshot(doc),
    };
  }

  private calculateScore(doc: StructuredPayrollDocument, triggered: RuleResult[]): number {
    let score = 100;

    // Deductions for parsing quality
    if (doc.overallParsingConfidence < 0.7) score -= 15;
    else if (doc.overallParsingConfidence < 0.85) score -= 5;

    // Deductions for completeness
    const completeness = this.calculateCompleteness(doc);
    score -= Math.round((1 - completeness) * 20);

    // Deductions for alerts
    for (const alert of triggered) {
      switch (alert.severity) {
        case 'critical': score -= 25; break;
        case 'important': score -= 12; break;
        case 'review': score -= 5; break;
        case 'info': score -= 1; break;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getStatus(score: number, criticalCount: number): GlobalStatus {
    if (criticalCount > 0 || score < 40) return 'red';
    if (score < 70) return 'orange';
    return 'green';
  }

  private getConfidenceBadge(confidence: number): string {
    if (confidence >= 0.9) return 'Lecture fiable';
    if (confidence >= 0.7) return 'Lecture correcte';
    if (confidence >= 0.5) return 'Lecture partielle';
    return 'Lecture très incertaine';
  }

  private calculateCompleteness(doc: StructuredPayrollDocument): number {
    const checks = [
      !!doc.employeeIdentity.fullName.value,
      !!doc.employerIdentity.companyName.value,
      !!doc.payPeriod.month.value,
      !!doc.baseSalary.value,
      !!doc.normalHours.value,
      !!doc.grossSalary.value,
      !!doc.taxableNet.value,
      !!doc.netToPay.value,
      doc.socialContributions.length > 0,
      !!doc.hourlyRate.value,
    ];
    return checks.filter(Boolean).length / checks.length;
  }

  private buildExecutiveSummary(
    doc: StructuredPayrollDocument,
    triggered: RuleResult[],
    status: GlobalStatus,
    ctx: AnalysisContext,
  ): string {
    const name = doc.employeeIdentity.fullName.value || 'salarié(e)';
    const period = doc.payPeriod.month.value || 'période inconnue';
    const net = doc.netToPay.value;
    const gross = doc.grossSalary.value;

    let summary = `Bulletin de ${name} — ${period}.\n`;

    if (net) summary += `Net à payer : ${net.toFixed(2)} €`;
    if (gross) summary += ` | Brut : ${gross.toFixed(2)} €`;
    summary += '.\n\n';

    if (status === 'green') {
      summary += '✅ Aucun point critique détecté. Le bulletin semble cohérent dans l\'ensemble.';
    } else if (status === 'orange') {
      summary += `⚠️ ${triggered.length} point(s) mérite(nt) votre attention. Consultez les détails ci-dessous pour en savoir plus.`;
    } else {
      summary += `🔴 ${triggered.filter(t => t.severity === 'critical').length} point(s) critique(s) détecté(s). Vérification recommandée.`;
    }

    if (ctx.assumptions.length > 0) {
      summary += `\n\nHypothèses : ${ctx.assumptions.length} hypothèse(s) ont été formulées pour cette analyse.`;
    }

    return summary;
  }

  private buildReadabilityAssessment(doc: StructuredPayrollDocument): string {
    const conf = doc.overallParsingConfidence;
    if (conf >= 0.9) return 'La lecture du document est de très bonne qualité. Les données extraites sont fiables.';
    if (conf >= 0.7) return 'La lecture du document est correcte. La plupart des données sont probablement exactes, mais quelques champs peuvent contenir des erreurs.';
    if (conf >= 0.5) return 'La lecture du document est partielle. Plusieurs champs peuvent être incorrects ou manquants. Vérifiez les montants importants.';
    return 'La lecture du document est très dégradée. Les résultats de cette analyse sont peu fiables. Nous recommandons de fournir un document de meilleure qualité.';
  }

  private buildPracticalAdvice(triggered: RuleResult[], _ctx: AnalysisContext): string[] {
    const advice: string[] = [];

    const hasCritical = triggered.some(t => t.severity === 'critical');
    const hasOvertimeIssue = triggered.some(t => t.category === 'overtime');
    const hasSmicIssue = triggered.some(t => t.ruleCode === 'SMIC_COHERENCE');

    if (hasCritical) {
      advice.push('Des points critiques ont été détectés. N\'hésitez pas à contacter votre service paie pour obtenir des explications.');
    }
    if (hasOvertimeIssue) {
      advice.push('En cas de doute sur vos heures supplémentaires, conservez votre propre suivi de temps. Vous pouvez demander le relevé détaillé à votre employeur.');
    }
    if (hasSmicIssue) {
      advice.push('Vous pouvez vérifier le SMIC en vigueur sur le site du Service Public (service-public.fr) et comparer avec le taux horaire de votre bulletin.');
    }

    advice.push('Conservez tous vos bulletins de paie : ils n\'ont pas de durée de prescription pour le salarié.');
    advice.push('En cas de litige, l\'inspection du travail et les prud\'hommes sont compétents pour examiner les bulletins de paie.');

    return advice;
  }

  private buildSnapshot(doc: StructuredPayrollDocument): Record<string, unknown> {
    return {
      employee: doc.employeeIdentity.fullName.value,
      employer: doc.employerIdentity.companyName.value,
      period: doc.payPeriod.month.value,
      baseSalary: doc.baseSalary.value,
      hourlyRate: doc.hourlyRate.value,
      normalHours: doc.normalHours.value,
      overtimeHours: doc.overtimeHours.value,
      gross: doc.grossSalary.value,
      taxableNet: doc.taxableNet.value,
      netToPay: doc.netToPay.value,
      bonusCount: doc.bonuses.length,
      absenceCount: doc.absences.length,
      contributionCount: doc.socialContributions.length,
    };
  }

  // ============================================================
  // Comparison
  // ============================================================
  buildComparisonSummary(
    current: StructuredPayrollDocument,
    previous: StructuredPayrollDocument[],
  ): ComparisonSummary {
    const allDocs = [...previous, current];
    const periods = allDocs.map(d => d.payPeriod.month.value || 'Inconnu');

    const fields: ComparisonField[] = [
      this.buildComparisonField('Salaire de base', 'baseSalary', allDocs, d => d.baseSalary.value, d => d.baseSalary.confidence),
      this.buildComparisonField('Taux horaire', 'hourlyRate', allDocs, d => d.hourlyRate.value, d => d.hourlyRate.confidence),
      this.buildComparisonField('Heures normales', 'normalHours', allDocs, d => d.normalHours.value, d => d.normalHours.confidence),
      this.buildComparisonField('Heures supplémentaires', 'overtimeHours', allDocs, d => d.overtimeHours.value, d => d.overtimeHours.confidence),
      this.buildComparisonField('Total brut', 'grossSalary', allDocs, d => d.grossSalary.value, d => d.grossSalary.confidence),
      this.buildComparisonField('Net imposable', 'taxableNet', allDocs, d => d.taxableNet.value, d => d.taxableNet.confidence),
      this.buildComparisonField('Net à payer', 'netToPay', allDocs, d => d.netToPay.value, d => d.netToPay.confidence),
    ];

    // Add bonus fields
    const uniqueBonusLabels = new Set<string>();
    allDocs.forEach(d => d.bonuses.forEach(b => uniqueBonusLabels.add(b.label)));
    for (const label of uniqueBonusLabels) {
      fields.push(this.buildComparisonField(
        label, `bonus_${label}`, allDocs,
        d => d.bonuses.find(b => b.label === label)?.amount.value || null,
        d => d.bonuses.find(b => b.label === label)?.amount.confidence || 0,
      ));
    }

    const highlights: string[] = [];
    for (const field of fields) {
      if (field.isAnomaly) {
        highlights.push(`${field.fieldLabel} : ${field.autoComment}`);
      }
    }

    return {
      periods,
      fields,
      repeatedAlerts: [],
      overallTrend: this.determineOverallTrend(fields),
      highlights,
    };
  }

  private buildComparisonField(
    label: string,
    name: string,
    docs: StructuredPayrollDocument[],
    getValue: (d: StructuredPayrollDocument) => number | null,
    getConf: (d: StructuredPayrollDocument) => number,
  ): ComparisonField {
    const values = docs.map(d => ({
      period: d.payPeriod.month.value || 'Inconnu',
      value: getValue(d),
      confidence: getConf(d),
    }));

    const numericValues = values.filter(v => v.value !== null).map(v => v.value!);

    let variation: number | null = null;
    let variationPercent: number | null = null;
    let trend: ComparisonField['trend'] = 'unknown';
    let isAnomaly = false;
    let anomalyType: ComparisonField['anomalyType'];

    if (numericValues.length >= 2) {
      const last = numericValues[numericValues.length - 1];
      const prev = numericValues[numericValues.length - 2];
      variation = last - prev;
      variationPercent = prev !== 0 ? (variation / prev) * 100 : null;

      // Trend detection
      if (numericValues.length >= 3) {
        const increasing = numericValues.every((v, i) => i === 0 || v >= numericValues[i - 1]);
        const decreasing = numericValues.every((v, i) => i === 0 || v <= numericValues[i - 1]);
        const stableish = numericValues.every(v => Math.abs(v - numericValues[0]) / numericValues[0] < 0.05);

        if (stableish) trend = 'stable';
        else if (increasing) trend = 'increasing';
        else if (decreasing) trend = 'decreasing';
        else trend = 'volatile';
      } else {
        if (Math.abs(variation) < prev * 0.03) trend = 'stable';
        else trend = variation > 0 ? 'increasing' : 'decreasing';
      }

      // Anomaly detection
      if (variationPercent !== null && Math.abs(variationPercent) > 15) {
        isAnomaly = true;
        anomalyType = Math.abs(variationPercent) > 30 ? 'probable_anomaly' : 'to_verify';
      }
    }

    const autoComment = this.generateFieldComment(label, variation, variationPercent, trend, isAnomaly);

    return {
      fieldName: name,
      fieldLabel: label,
      values,
      variation,
      variationPercent,
      trend,
      autoComment,
      isAnomaly,
      anomalyType,
    };
  }

  private generateFieldComment(
    label: string,
    variation: number | null,
    variationPercent: number | null,
    trend: string,
    isAnomaly: boolean,
  ): string {
    if (variation === null || variationPercent === null) return 'Données insuffisantes pour commenter.';

    const direction = variation > 0 ? 'en hausse' : 'en baisse';
    const abs = Math.abs(variationPercent).toFixed(1);

    if (!isAnomaly) {
      if (trend === 'stable') return `${label} stable.`;
      return `${label} légèrement ${direction} (${abs}%) — variation normale.`;
    }

    if (Math.abs(variationPercent) > 30) {
      return `${label} fortement ${direction} (${abs}%). Cette variation importante mérite vérification.`;
    }

    return `${label} ${direction} de ${abs}%. Point à vérifier.`;
  }

  private determineOverallTrend(fields: ComparisonField[]): string {
    const anomalies = fields.filter(f => f.isAnomaly);
    if (anomalies.length === 0) return 'Situation globalement stable sur la période analysée.';
    if (anomalies.length <= 2) return `${anomalies.length} variation(s) notable(s) détectée(s). Consultez les détails.`;
    return `${anomalies.length} variations significatives détectées. Vérification recommandée.`;
  }
}

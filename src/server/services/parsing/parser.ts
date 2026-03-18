// ============================================================
// PayGuard — Structured Payroll Parser
// Sub-parsers for French payslip fields with confidence scoring
// ============================================================
import {
  StructuredPayrollDocument,
  ParsedField,
  PayrollLineItem,
  OvertimeBreakdown,
  AbsenceEntry,
  SocialContribution,
  ConfidenceLevel,
  FieldConfidence,
} from '@/server/types';
import { TextNormalizer, NormalizationResult } from './normalizer';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';

// ============================================================
// Helpers
// ============================================================
function makeField<T>(value: T | null, raw: string, conf: number, method: string, page = 1): ParsedField<T> {
  return {
    value,
    rawSource: raw,
    page,
    matchedText: raw,
    confidence: conf,
    confidenceLevel: getConfidenceLevel(conf),
    methodUsed: method,
  };
}

function getConfidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.85) return 'high';
  if (c >= 0.6) return 'medium';
  if (c >= 0.3) return 'low';
  return 'absent';
}

function findLine(lines: string[], ...patterns: RegExp[]): { line: string; index: number } | null {
  for (const pattern of patterns) {
    const idx = lines.findIndex(l => pattern.test(l));
    if (idx >= 0) return { line: lines[idx], index: idx };
  }
  return null;
}

function extractAmount(text: string): number | null {
  // Match French-format amounts: 1 234,56 or 1234.56 or 1234,56
  const m = text.match(/([-]?\s*\d[\d\s]*[.,]\d{2})\s*€?/);
  if (!m) return null;
  const cleaned = m[1].replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function extractLastAmount(text: string): number | null {
  const matches = [...text.matchAll(/([-]?\s*\d[\d\s]*[.,]\d{2})\s*€?/g)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1][1].replace(/\s/g, '').replace(',', '.');
    return parseFloat(last);
  }
  
  // Legacy PDF/Dot-Matrix fallback: sometimes amounts lack decimals completely (e.g. "543382" instead of "5433,82")
  // If the line ends with a pure large number, we heuristically deduce the last two digits are cents.
  const trailingMatch = text.match(/([-]?\d[\d\s]+)\s*€?$/);
  if (trailingMatch) {
    const rawVal = parseInt(trailingMatch[1].replace(/\s/g, ''), 10);
    // If > 10000 (i.e. 100.00 euros), assume it's cents.
    if (rawVal > 10000) return rawVal / 100;
    return rawVal; // Unsafe to divide smaller numbers, leave as is
  }
  return null;
}

function extractAllAmounts(text: string): number[] {
  // Standard dot/comma separated values
  let matches = [...text.matchAll(/([-]?\s*\d[\d\s]*[.,]\d{2})/g)];
  let parsed = matches.map(m => parseFloat(m[1].replace(/\s/g, '').replace(',', '.'))).filter(v => !isNaN(v));
  
  // Fallback for implied-cents legacy PDFs (e.g. 262375 -> 2623.75)
  if (parsed.length === 0) {
    const rawDigits = [...text.matchAll(/([-]?\b\d{4,}\b)/g)];
    parsed = rawDigits.map(m => parseInt(m[1], 10) / 100).filter(v => !isNaN(v));
  }
  return parsed;
}

function extractPercentage(text: string): number | null {
  const m = text.match(/(\d+[.,]\d+)\s*%/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function extractHours(text: string): number | null {
  const m = text.match(/(\d+[.,]\d{2})\s*h/i);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

// ============================================================
// Main Parser
// ============================================================
export class StructuredPayrollParser {
  private normalizer = new TextNormalizer();

  parse(rawText: string, documentId: string, ocrConfidence: number): StructuredPayrollDocument {
    const norm = this.normalizer.normalize(rawText);
    const lines = norm.normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
    const baseConf = ocrConfidence;
    const warnings: string[] = [];
    const confidenceMap: Record<string, FieldConfidence> = {};

    // --- Sub-parsers ---
    const employer = this.parseEmployer(lines, baseConf);
    const employee = this.parseEmployee(lines, baseConf);
    const period = this.parsePeriod(lines, baseConf);
    const contract = this.parseContract(lines, baseConf);
    const salary = this.parseSalary(lines, baseConf);
    const overtime = this.parseOvertime(lines, baseConf);
    const bonuses = this.parseBonuses(lines, baseConf);
    const allowances = this.parseAllowances(lines, baseConf);
    const absences = this.parseAbsences(lines, baseConf);
    const leave = this.parseLeave(lines, baseConf);
    const contributions = this.parseContributions(lines, baseConf);
    const totals = this.parseTotals(lines, baseConf);
    const tax = this.parseTax(lines, baseConf);
    const cumulated = this.parseCumulated(lines, baseConf);
    const rawLineItems = this.parseRawLines(lines, norm, baseConf);

    // OCR quality warnings
    if (ocrConfidence < 0.7) {
      warnings.push('La qualité de lecture OCR est faible. Certains champs peuvent être incorrects.');
    }
    if (ocrConfidence < 0.5) {
      warnings.push('Lecture très dégradée — de nombreux champs sont probablement erronés ou absents.');
    }

    // Build confidence map
    const addToMap = (name: string, field: ParsedField<unknown>) => {
      confidenceMap[name] = {
        value: field.value,
        rawSource: field.rawSource,
        page: field.page,
        matchedText: field.matchedText,
        confidence: field.confidence,
        confidenceLevel: field.confidenceLevel,
        methodUsed: field.methodUsed,
      };
    };

    addToMap('grossSalary', totals.gross);
    addToMap('netToPay', totals.netToPay);
    addToMap('taxableNet', totals.taxableNet);
    addToMap('baseSalary', salary.baseSalary);
    addToMap('hourlyRate', salary.hourlyRate);
    addToMap('normalHours', salary.normalHours);
    addToMap('overtimeHours', overtime.totalHours);

    // Overall parsing confidence
    const fieldConfidences = Object.values(confidenceMap)
      .filter(fc => fc.value !== null)
      .map(fc => fc.confidence);
    const overallParsingConfidence = fieldConfidences.length > 0
      ? fieldConfidences.reduce((a, b) => a + b, 0) / fieldConfidences.length
      : 0.3;

    return {
      id: uuid(),
      documentId,
      parsedAt: new Date().toISOString(),
      employeeIdentity: employee,
      employerIdentity: employer,
      payPeriod: period,
      contractIndicators: contract,
      baseSalary: salary.baseSalary,
      hourlyRate: salary.hourlyRate,
      normalHours: salary.normalHours,
      overtimeHours: overtime.totalHours,
      overtimeBreakdown: overtime.breakdown,
      bonuses,
      allowances,
      absences,
      paidLeave: leave,
      socialContributions: contributions,
      grossSalary: totals.gross,
      taxableNet: totals.taxableNet,
      netToPay: totals.netToPay,
      withholdingTax: tax,
      cumulatedValues: cumulated,
      rawLines: rawLineItems,
      parsingWarnings: warnings,
      fieldConfidenceMap: confidenceMap,
      overallParsingConfidence,
    };
  }

  // ============================================================
  // Sub-parsers
  // ============================================================

  private parseEmployer(lines: string[], baseConf: number) {
    const companyLine = findLine(lines,
      /^(?:SARL|SAS|SA|SCI|EURL|SASU|ASSOCIATION)\s+/i,
      /^(?:Société|Entreprise)\s+/i,
    );
    const siretLine = findLine(lines, /SIRET\s*:?\s*/i);
    const apeLine = findLine(lines, /(?:Code\s*)?APE\s*:?\s*/i, /NAF\s*:?\s*/i);
    const addressLine = findLine(lines, /\d{5}\s+[A-ZÀ-ÿ]/);
    const urssafLine = findLine(lines, /URSSAF/i);

    const siretMatch = siretLine?.line.match(/(\d[\d\s]{12,16}\d)/);
    const apeMatch = apeLine?.line.match(/(\d{4}[A-Z])/i);

    return {
      companyName: makeField(
        companyLine?.line || null,
        companyLine?.line || '',
        companyLine ? baseConf : 0.2,
        companyLine ? 'pattern-match' : 'not-found',
      ),
      siret: siretMatch
        ? makeField(siretMatch[1].replace(/\s/g, ''), siretLine!.line, baseConf, 'regex')
        : makeField<string>(null, '', 0.1, 'not-found'),
      apeCode: apeMatch
        ? makeField(apeMatch[1], apeLine!.line, baseConf, 'regex')
        : makeField<string>(null, '', 0.1, 'not-found'),
      address: addressLine
        ? makeField(addressLine.line, addressLine.line, baseConf * 0.9, 'pattern-match')
        : makeField<string>(null, '', 0.1, 'not-found'),
      urssafNumber: urssafLine
        ? makeField(urssafLine.line.replace(/.*URSSAF\s*:?\s*/i, '').trim(), urssafLine.line, baseConf * 0.85, 'regex')
        : makeField<string>(null, '', 0.1, 'not-found'),
    };
  }

  private parseEmployee(lines: string[], baseConf: number) {
    const nameLine = findLine(lines, /^Nom\s*:?\s*/i);
    const matLine = findLine(lines, /Matricule\s*:?\s*/i);
    const ssLine = findLine(lines, /N°?\s*(?:Sécurité\s*Sociale|SS)\s*:?\s*/i);
    const emploiLine = findLine(lines, /Emploi\s*:?\s*/i);
    const qualifLine = findLine(lines, /Qualification\s*:?\s*/i);
    const coeffLine = findLine(lines, /Coefficient\s*:?\s*/i);
    const entryLine = findLine(lines, /Date\s*d['\u2019]?entr[eé]e\s*:?\s*/i);
    const statusLine = findLine(lines, /Statut\s*:?\s*/i);

    const nameValue = nameLine?.line.replace(/^Nom\s*:?\s*/i, '').trim() || null;
    const matValue = matLine?.line.replace(/Matricule\s*:?\s*/i, '').trim() || null;
    const ssValue = ssLine?.line.match(/(\d[\d\s]{12,20}\d)/)?.[1] || null;
    const emploiValue = emploiLine?.line.replace(/Emploi\s*:?\s*/i, '').trim() || null;
    const coeffMatch = (qualifLine?.line || coeffLine?.line || '').match(/(\d{2,4})/);
    const entryMatch = entryLine?.line.match(/(\d{2}\/\d{2}\/\d{4})/);
    const statusValue = statusLine?.line.match(/(Cadre|Non\s*cadre)/i)?.[1] || null;

    let identityHash: string | undefined;
    const cleanSs = ssValue?.replace(/\s/g, '').substring(0, 13);
    if (cleanSs && cleanSs.length >= 13) {
      identityHash = createHash('sha256').update(cleanSs).digest('hex');
    }

    return {
      identityHash,
      fullName: makeField(nameValue, nameLine?.line || '', nameValue ? baseConf : 0.2, nameValue ? 'regex' : 'not-found'),
      registrationNumber: makeField(matValue, matLine?.line || '', matValue ? baseConf : 0.15, matValue ? 'regex' : 'not-found'),
      socialSecurityNumber: makeField(ssValue, ssLine?.line || '', ssValue ? baseConf * 0.9 : 0.1, ssValue ? 'regex' : 'not-found'),
      position: makeField(emploiValue, emploiLine?.line || '', emploiValue ? baseConf : 0.15, emploiValue ? 'regex' : 'not-found'),
      qualification: qualifLine ? makeField(qualifLine.line.replace(/Qualification\s*:?\s*/i, '').trim(), qualifLine.line, baseConf * 0.85, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
      coefficient: coeffMatch ? makeField(parseInt(coeffMatch[1]), (qualifLine || coeffLine)!.line, baseConf * 0.8, 'regex') : makeField<number>(null, '', 0.1, 'not-found'),
      entryDate: entryMatch ? makeField(entryMatch[1], entryLine!.line, baseConf, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
      status: makeField(statusValue, statusLine?.line || '', statusValue ? baseConf : 0.15, statusValue ? 'regex' : 'not-found'),
    };
  }

  private parsePeriod(lines: string[], baseConf: number) {
    const periodLine = findLine(lines, /P[eé]riode\s*(?:du)?\s*\d/i, /Mois\s*:?\s*/i);
    const paymentLine = findLine(lines, /(?:Date\s*de\s*)?[Pp]aiement\s*:?\s*/i);

    const periodMatch = periodLine?.line.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:au)\s*(\d{2}\/\d{2}\/\d{4})/i);
    const monthMatch = periodLine?.line.match(/((?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4})/i)
      || periodLine?.line.match(/(\d{2}\/\d{4})/);
    const paymentMatch = paymentLine?.line.match(/(\d{2}\/\d{2}\/\d{4})/);

    let monthValue: string | null = null;
    if (periodMatch) {
      monthValue = periodMatch[0];
    } else if (monthMatch) {
      monthValue = monthMatch[1];
    }

    return {
      month: makeField(monthValue, periodLine?.line || '', monthValue ? baseConf : 0.2, monthValue ? 'regex' : 'not-found'),
      startDate: periodMatch ? makeField(periodMatch[1], periodLine!.line, baseConf, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
      endDate: periodMatch ? makeField(periodMatch[2], periodLine!.line, baseConf, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
      paymentDate: paymentMatch ? makeField(paymentMatch[1], paymentLine!.line, baseConf, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
    };
  }

  private parseContract(lines: string[], baseConf: number) {
    const contractLine = findLine(lines, /Contrat\s*:?\s*/i);
    const ccLine = findLine(lines, /Convention\s*collective\s*:?\s*/i);
    const scheduleLine = findLine(lines, /Temps\s*(?:plein|partiel)/i);

    const contractMatch = contractLine?.line.match(/(CDI|CDD|Int[eé]rim|Apprentissage|Professionnalisation)/i);
    const scheduleMatch = (contractLine?.line || scheduleLine?.line || '').match(/(Temps\s*plein|Temps\s*partiel\s*\d*%?)/i);
    const ccValue = ccLine?.line.replace(/Convention\s*collective\s*:?\s*/i, '').trim() || null;

    return {
      contractType: contractMatch ? makeField(contractMatch[1], contractLine!.line, baseConf, 'regex') : makeField<string>(null, '', 0.15, 'not-found'),
      workSchedule: scheduleMatch ? makeField(scheduleMatch[1], (contractLine || scheduleLine)!.line, baseConf, 'regex') : makeField<string>(null, '', 0.15, 'not-found'),
      collectiveAgreementHint: ccValue ? makeField(ccValue, ccLine!.line, baseConf * 0.9, 'regex') : makeField<string>(null, '', 0.1, 'not-found'),
    };
  }

  private parseSalary(lines: string[], baseConf: number) {
    const salaireLine = findLine(lines, /Salaire\s*de\s*base/i);
    let baseSalary: number | null = null;
    let hourlyRate: number | null = null;
    let normalHours: number | null = null;

    if (salaireLine) {
      const amounts = extractAllAmounts(salaireLine.line);
      const hours = extractHours(salaireLine.line);

      if (hours) normalHours = hours;

      // The last amount on the line is typically the total
      if (amounts.length >= 1) {
        baseSalary = amounts[amounts.length - 1];
      }

      // If we have hours and 2+ amounts, the middle one is the rate
      if (amounts.length >= 2 && normalHours) {
        // Check if first amount could be the rate (< 100 usually)
        const possibleRate = amounts.find(a => a > 5 && a < 100);
        if (possibleRate) hourlyRate = possibleRate;
      }

      // Deduce hourly rate from base salary and hours if not found
      if (!hourlyRate && baseSalary && normalHours && normalHours > 0) {
        hourlyRate = Math.round((baseSalary / normalHours) * 100) / 100;
      }
    }

    return {
      baseSalary: makeField(baseSalary, salaireLine?.line || '', baseSalary ? baseConf : 0.2, baseSalary ? 'heuristic-parse' : 'not-found'),
      hourlyRate: makeField(hourlyRate, salaireLine?.line || '', hourlyRate ? baseConf * 0.85 : 0.15, hourlyRate ? 'heuristic-parse' : 'not-found'),
      normalHours: makeField(normalHours, salaireLine?.line || '', normalHours ? baseConf : 0.2, normalHours ? 'regex' : 'not-found'),
    };
  }

  private parseOvertime(lines: string[], baseConf: number) {
    const breakdown: OvertimeBreakdown[] = [];
    let totalHours = 0;

    const overtimePatterns = [
      { pattern: /[Hh]eures?\s*supp(?:l[eé]mentaires?)?\s*(?:(?:à|a)\s*)?25\s*%/i, tier: '25%', rate: 1.25 },
      { pattern: /[Hh]eures?\s*supp(?:l[eé]mentaires?)?\s*(?:(?:à|a)\s*)?50\s*%/i, tier: '50%', rate: 1.50 },
      { pattern: /[Hh]eures?\s*supp(?:l[eé]mentaires?)?(?!\s*(?:25|50)\s*%)/i, tier: 'non précisé', rate: 0 },
      { pattern: /H\.?\s*Supp/i, tier: 'non précisé', rate: 0 },
    ];

    for (const { pattern, tier, rate } of overtimePatterns) {
      const found = findLine(lines, pattern);
      if (found) {
        const hours = extractHours(found.line);
        const amount = extractLastAmount(found.line);
        const amounts = extractAllAmounts(found.line);

        // Try to find the rate from the amounts
        let detectedRate: number | null = null;
        if (amounts.length >= 2) {
          const possibleRate = amounts.find(a => a > 5 && a < 100);
          if (possibleRate) detectedRate = possibleRate;
        }

        if (hours) totalHours += hours;

        breakdown.push({
          tier,
          hours: makeField(hours, found.line, hours ? baseConf : 0.3, 'regex'),
          rate: makeField(detectedRate || (rate > 0 ? rate : null), found.line, detectedRate ? baseConf * 0.8 : 0.4, detectedRate ? 'heuristic' : rate > 0 ? 'default-rule' : 'not-found'),
          amount: makeField(amount, found.line, amount ? baseConf : 0.3, 'regex'),
        });
      }
    }

    return {
      totalHours: makeField(totalHours > 0 ? totalHours : null, '', totalHours > 0 ? baseConf : 0.1, totalHours > 0 ? 'sum' : 'not-found'),
      breakdown,
    };
  }

  private parseBonuses(lines: string[], baseConf: number) {
    const bonusPatterns = [
      { pattern: /prime\s*(?:d['\u2019]?)?anciennet[eé]/i, type: 'recurring' as const },
      { pattern: /prime\s*(?:d['\u2019]?)?objectifs?/i, type: 'recurring' as const },
      { pattern: /prime\s*exceptionnelle/i, type: 'exceptional' as const },
      { pattern: /prime\s*(?:de\s*)?rendement/i, type: 'recurring' as const },
      { pattern: /prime\s*(?:de\s*)?panier/i, type: 'recurring' as const },
      { pattern: /prime\s*(?:de\s*)?salissure/i, type: 'recurring' as const },
      { pattern: /prime\s*(?:de\s*)?dimanche/i, type: 'recurring' as const },
      { pattern: /prime\s*habillage/i, type: 'recurring' as const },
      { pattern: /13[eè](?:me)?\s*mois/i, type: 'exceptional' as const },
      { pattern: /prime\s*(?:de\s*)?vacances/i, type: 'exceptional' as const },
      { pattern: /gratification/i, type: 'exceptional' as const },
      { pattern: /prime\s*rend\./i, type: 'recurring' as const },
    ];

    const results: { label: string; amount: ParsedField<number>; type: 'recurring' | 'exceptional' | 'unknown' }[] = [];

    for (const { pattern, type } of bonusPatterns) {
      const found = findLine(lines, pattern);
      if (found) {
        const amount = extractLastAmount(found.line);
        const label = found.line.match(pattern)?.[0] || 'Prime';
        results.push({
          label: label.trim(),
          amount: makeField(amount, found.line, amount ? baseConf : 0.3, 'regex'),
          type,
        });
      }
    }

    return results;
  }

  private parseAllowances(lines: string[], baseConf: number) {
    const patterns = [
      { pattern: /[Ii]ndemnit[eé]\s*(?:de\s*)?transport/i, type: 'transport' },
      { pattern: /[Nn]avigo/i, type: 'transport' },
      { pattern: /[Ii]ndemnit[eé]\s*(?:de\s*)?repas/i, type: 'repas' },
      { pattern: /[Ii]ndemnit[eé]\s*(?:de\s*)?trajet/i, type: 'trajet' },
      { pattern: /[Ii]ndemnit[eé]\s*(?:de\s*)?nourriture/i, type: 'nourriture' },
      { pattern: /[Ii]ndemnit[eé]\s*kilom[eé]trique/i, type: 'km' },
      { pattern: /[Ii]ndemnit[eé]\s*activit[eé]\s*partielle/i, type: 'activite-partielle' },
    ];

    const results: { label: string; amount: ParsedField<number>; type: string }[] = [];

    for (const { pattern, type } of patterns) {
      const found = findLine(lines, pattern);
      if (found) {
        const amount = extractLastAmount(found.line);
        results.push({
          label: found.line.match(pattern)?.[0]?.trim() || type,
          amount: makeField(amount, found.line, amount ? baseConf : 0.3, 'regex'),
          type,
        });
      }
    }

    return results;
  }

  private parseAbsences(lines: string[], baseConf: number) {
    const patterns = [
      /[Aa]bsence\s*(?:maladie|injustifi[eé]e|cong[eé]|sans\s*solde)?/i,
      /[Cc]ong[eé]\s*(?:sans\s*solde|pathologique|maternit[eé]|paternit[eé])/i,
      /[Aa]ctivit[eé]\s*partielle/i,
      /IJSS/i,
    ];

    const results: AbsenceEntry[] = [];

    for (const pattern of patterns) {
      const found = findLine(lines, pattern);
      if (found) {
        const hours = extractHours(found.line);
        const amount = extractLastAmount(found.line);
        results.push({
          type: found.line.match(pattern)?.[0]?.trim() || 'Absence',
          hours: hours ? makeField(Math.abs(hours), found.line, baseConf, 'regex') : undefined,
          amount: amount ? makeField(amount, found.line, baseConf, 'regex') : undefined,
          rawText: found.line,
        });
      }
    }

    return results;
  }

  private parseLeave(lines: string[], baseConf: number) {
    const congeLine = findLine(lines, /[Cc]ong[eé]s?\s*(?:[Pp]ay[eé]s?)?/i);
    let acquired: ParsedField<number> | undefined;
    let taken: ParsedField<number> | undefined;
    let remaining: ParsedField<number> | undefined;

    if (congeLine) {
      const acqMatch = congeLine.line.match(/[Aa]cquis\s*:?\s*(\d+[.,]\d+)/);
      const prisMatch = congeLine.line.match(/[Pp]ris\s*:?\s*(\d+[.,]?\d*)/);
      const soldeMatch = congeLine.line.match(/[Ss]olde\s*:?\s*(\d+[.,]\d+)/);

      if (acqMatch) acquired = makeField(parseFloat(acqMatch[1].replace(',', '.')), congeLine.line, baseConf, 'regex');
      if (prisMatch) taken = makeField(parseFloat(prisMatch[1].replace(',', '.')), congeLine.line, baseConf, 'regex');
      if (soldeMatch) remaining = makeField(parseFloat(soldeMatch[1].replace(',', '.')), congeLine.line, baseConf, 'regex');
    }

    return { acquired, taken, remaining };
  }

  private parseContributions(lines: string[], baseConf: number) {
    const contribPatterns = [
      /[Ss][eé]curit[eé]\s*sociale/i,
      /[Rr]etraite/i,
      /AGIRC/i,
      /ARRCO/i,
      /CSG\s*d[eé]ductible/i,
      /CSG\s*non\s*d[eé]ductible/i,
      /CSG\/CRDS/i,
      /CRDS/i,
      /[Cc]h[oô]mage/i,
      /[Pp]r[eé]voyance/i,
      /[Mm]utuelle/i,
    ];

    const results: SocialContribution[] = [];

    for (const pattern of contribPatterns) {
      // Find all lines matching this pattern (there can be multiple)
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          const line = lines[i];
          const amounts = extractAllAmounts(line);
          const rate = extractPercentage(line);

          results.push({
            label: line.match(pattern)?.[0]?.trim() || 'Cotisation',
            base: amounts.length >= 2 ? amounts[0] : null,
            rate: rate || null,
            employeeAmount: amounts.length >= 1 ? amounts[amounts.length - 1] : null,
            employerAmount: null,
            rawText: line,
            confidence: baseConf * 0.85,
          });
          break; // Only first match per pattern
        }
      }
    }

    return results;
  }

  private parseTotals(lines: string[], baseConf: number) {
    const grossLine = findLine(lines, /TOTAL\s*BRUT/i, /Brut\s*mensuel/i, /R[eé]mun[eé]ration\s*Brute/i);
    const netTaxLine = findLine(lines, /NET\s*IMPOSABLE/i, /NET\s*FISCAL/i);
    const netPayLine = findLine(lines, /NET\s*[ÀA]?\s*PAYER(?!\s*AVANT)/i);
    const netPayBeforeTaxLine = findLine(lines, /NET\s*[ÀA]?\s*PAYER\s*AVANT/i);

    return {
      gross: makeField(
        grossLine ? extractLastAmount(grossLine.line) : null,
        grossLine?.line || '',
        grossLine ? baseConf : 0.2,
        grossLine ? 'regex' : 'not-found',
      ),
      taxableNet: makeField(
        netTaxLine ? extractLastAmount(netTaxLine.line) : null,
        netTaxLine?.line || '',
        netTaxLine ? baseConf : 0.2,
        netTaxLine ? 'regex' : 'not-found',
      ),
      netToPay: makeField(
        (netPayLine ? extractLastAmount(netPayLine.line) : null) || (netPayBeforeTaxLine ? extractLastAmount(netPayBeforeTaxLine.line) : null),
        netPayLine?.line || netPayBeforeTaxLine?.line || '',
        netPayLine || netPayBeforeTaxLine ? baseConf : 0.2,
        netPayLine || netPayBeforeTaxLine ? 'regex' : 'not-found',
      ),
    };
  }

  private parseTax(lines: string[], baseConf: number) {
    const pasLine = findLine(lines, /PAS\s*:?\s*/i, /Pr[eé]l[eè]vement\s*[àa]\s*la\s*source/i);

    if (!pasLine) {
      return { rate: undefined, base: undefined, amount: undefined, visible: false };
    }

    const rate = extractPercentage(pasLine.line);
    const amounts = extractAllAmounts(pasLine.line);

    return {
      rate: rate ? makeField(rate, pasLine.line, baseConf, 'regex') : undefined,
      base: amounts.length >= 2 ? makeField(amounts[0], pasLine.line, baseConf * 0.85, 'heuristic') : undefined,
      amount: amounts.length >= 1 ? makeField(amounts[amounts.length - 1], pasLine.line, baseConf, 'regex') : undefined,
      visible: true,
    };
  }

  private parseCumulated(lines: string[], baseConf: number) {
    const brutCumLine = findLine(lines, /[Bb]rut\s*cumul[eé]/i);
    const netCumLine = findLine(lines, /[Nn]et\s*imposable\s*cumul[eé]/i);
    const pasCumLine = findLine(lines, /PAS\s*cumul[eé]/i);
    const heuresCumLine = findLine(lines, /[Hh]eures?\s*travaill[eé]es?/i);

    return {
      grossSalaryYTD: brutCumLine
        ? makeField(extractLastAmount(brutCumLine.line), brutCumLine.line, baseConf * 0.85, 'regex')
        : undefined,
      netTaxableYTD: netCumLine
        ? makeField(extractLastAmount(netCumLine.line), netCumLine.line, baseConf * 0.85, 'regex')
        : undefined,
      taxWithheldYTD: pasCumLine
        ? makeField(extractLastAmount(pasCumLine.line), pasCumLine.line, baseConf * 0.85, 'regex')
        : undefined,
      hoursWorkedYTD: heuresCumLine
        ? makeField(extractLastAmount(heuresCumLine.line), heuresCumLine.line, baseConf * 0.8, 'regex')
        : undefined,
    };
  }

  private parseRawLines(lines: string[], norm: NormalizationResult, baseConf: number): PayrollLineItem[] {
    return norm.detectedPayLines.map((pl, i) => ({
      id: `line-${i}`,
      label: pl.rawText.replace(/[\d.,€%]+/g, '').trim().substring(0, 80),
      category: this.guessLineCategory(pl.rawText),
      base: pl.amounts.length >= 3 ? pl.amounts[0] : null,
      rate: pl.amounts.length >= 3 ? pl.amounts[1] : null,
      quantity: null,
      employeeAmount: pl.amounts.length >= 1 ? pl.amounts[pl.amounts.length - 1] : null,
      employerAmount: null,
      rawText: pl.rawText,
      confidence: baseConf * 0.8,
      page: 1,
    }));
  }

  private guessLineCategory(text: string): PayrollLineItem['category'] {
    const lower = text.toLowerCase();
    if (/cotisation|sécurité sociale|retraite|csg|crds|chômage|prévoyance|mutuelle/i.test(lower)) return 'contribution_employee';
    if (/net à payer|net imposable|net fiscal/i.test(lower)) return 'net';
    if (/absence|retenue|cong[eé] sans solde/i.test(lower)) return 'deduction';
    if (/pas|prélèvement/i.test(lower)) return 'tax';
    if (/prime|indemnit|gratification|13/i.test(lower)) return 'earning';
    if (/salaire|base|heures/i.test(lower)) return 'earning';
    return 'other';
  }
}

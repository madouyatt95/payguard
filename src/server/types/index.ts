// ============================================================
// PayGuard — Core Types
// ============================================================

// --- Document Status Pipeline ---
export type DocumentStatus =
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'ocr_processing'
  | 'parsing'
  | 'parsed_partial'
  | 'parsed_complete'
  | 'analyzing'
  | 'analyzed'
  | 'failed'
  | 'deleted';

// --- Confidence levels ---
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'absent' | 'inferred';

export interface FieldConfidence {
  value: unknown;
  rawSource: string;
  page?: number;
  matchedText: string;
  confidence: number; // 0-1
  confidenceLevel: ConfidenceLevel;
  methodUsed: string;
}

export interface ParsedField<T = unknown> {
  value: T | null;
  rawSource: string;
  page?: number;
  matchedText: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  methodUsed: string;
}

// --- Extraction types ---
export interface ExtractionWord {
  text: string;
  confidence: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
}

export interface ExtractionLine {
  text: string;
  confidence: number;
  words: ExtractionWord[];
  pageNumber: number;
}

export interface ExtractionBlock {
  text: string;
  confidence: number;
  lines: ExtractionLine[];
  pageNumber: number;
}

export interface ExtractionPage {
  pageNumber: number;
  text: string;
  blocks: ExtractionBlock[];
  confidence: number;
}

export interface ExtractionResult {
  fullText: string;
  pages: ExtractionPage[];
  blocks: ExtractionBlock[];
  lines: ExtractionLine[];
  words: ExtractionWord[];
  globalConfidence: number;
  providerUsed: string;
  metadata: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

// --- Payroll line items ---
export interface PayrollLineItem {
  id: string;
  label: string;
  category: 'earning' | 'deduction' | 'contribution_employee' | 'contribution_employer' | 'tax' | 'net' | 'other';
  base?: number | null;
  rate?: number | null;
  quantity?: number | null;
  employeeAmount?: number | null;
  employerAmount?: number | null;
  rawText: string;
  confidence: number;
  page?: number;
}

// --- Overtime details ---
export interface OvertimeBreakdown {
  tier: string; // e.g., "25%", "50%"
  hours: ParsedField<number>;
  rate: ParsedField<number>;
  amount: ParsedField<number>;
}

// --- Absence / Leave entry ---
export interface AbsenceEntry {
  type: string; // e.g. "congé payé", "maladie", "absence"
  days?: ParsedField<number>;
  hours?: ParsedField<number>;
  amount?: ParsedField<number>;
  rawText: string;
}

// --- Social Contribution entry ---
export interface SocialContribution {
  label: string;
  base?: number | null;
  rate?: number | null;
  employeeAmount?: number | null;
  employerAmount?: number | null;
  rawText: string;
  confidence: number;
}

// --- Cumulated values ---
export interface CumulatedValues {
  grossSalaryYTD?: ParsedField<number>;
  netTaxableYTD?: ParsedField<number>;
  netToPaidYTD?: ParsedField<number>;
  taxWithheldYTD?: ParsedField<number>;
  hoursWorkedYTD?: ParsedField<number>;
  cpAcquis?: ParsedField<number>;
  cpPris?: ParsedField<number>;
}

// --- Main Structured Parsed Document ---
export interface StructuredPayrollDocument {
  id: string;
  documentId: string;
  parsedAt: string;

  // Identity
  employeeIdentity: {
    fullName: ParsedField<string>;
    identityHash?: string;
    registrationNumber?: ParsedField<string>;
    socialSecurityNumber?: ParsedField<string>;
    position?: ParsedField<string>;
    qualification?: ParsedField<string>;
    coefficient?: ParsedField<number>;
    entryDate?: ParsedField<string>;
    status?: ParsedField<string>; // cadre / non-cadre
  };

  employerIdentity: {
    companyName: ParsedField<string>;
    siret?: ParsedField<string>;
    apeCode?: ParsedField<string>;
    address?: ParsedField<string>;
    urssafNumber?: ParsedField<string>;
  };

  // Period
  payPeriod: {
    month: ParsedField<string>;
    startDate?: ParsedField<string>;
    endDate?: ParsedField<string>;
    paymentDate?: ParsedField<string>;
    workedDays?: ParsedField<number>;
  };

  // Contract indicators
  contractIndicators: {
    contractType?: ParsedField<string>; // CDI, CDD, interim...
    workSchedule?: ParsedField<string>; // temps plein, temps partiel
    collectiveAgreementHint?: ParsedField<string>;
  };

  // Salary
  baseSalary: ParsedField<number>;
  hourlyRate: ParsedField<number>;
  normalHours: ParsedField<number>;

  // Overtime
  overtimeHours: ParsedField<number>;
  overtimeBreakdown: OvertimeBreakdown[];

  // Bonuses & allowances
  bonuses: {
    label: string;
    amount: ParsedField<number>;
    type: 'recurring' | 'exceptional' | 'unknown';
  }[];

  allowances: {
    label: string;
    amount: ParsedField<number>;
    type: string; // transport, panier, etc.
  }[];

  // Absences & Leave
  absences: AbsenceEntry[];
  paidLeave: {
    acquired?: ParsedField<number>;
    taken?: ParsedField<number>;
    remaining?: ParsedField<number>;
  };

  // Contributions
  socialContributions: SocialContribution[];

  // Totals
  grossSalary: ParsedField<number>;
  taxableNet: ParsedField<number>;
  netToPay: ParsedField<number>;

  // Tax
  withholdingTax: {
    rate?: ParsedField<number>;
    base?: ParsedField<number>;
    amount?: ParsedField<number>;
    visible: boolean;
  };

  // Cumulated
  cumulatedValues?: CumulatedValues;

  // Raw data
  rawLines: PayrollLineItem[];

  // Metadata
  parsingWarnings: string[];
  fieldConfidenceMap: Record<string, FieldConfidence>;
  overallParsingConfidence: number;
}

// --- Rule types ---
export type AlertSeverity = 'critical' | 'important' | 'review' | 'info';
export type AlertCategory =
  | 'required_mentions'
  | 'readability'
  | 'salary_base'
  | 'hourly_rate'
  | 'overtime'
  | 'bonuses'
  | 'leave_absence'
  | 'leave'
  | 'contributions'
  | 'totals'
  | 'month_to_month'
  | 'fraud_or_inconsistency_signal'
  | 'user_attention'
  | 'document_integrity'
  | 'salary_hours'
  | 'tax';

export interface RuleResult {
  ruleId: string;
  ruleCode: string;
  title: string;
  category: AlertCategory;
  severity: AlertSeverity;
  triggered: boolean;
  shortDescription: string;
  detailedExplanation: string;
  detectionReason: string;
  recommendation: string;
  legalCaution: string;
  confidence: number;
  canAutoConclude: boolean;
  sourceEvidence: SourceEvidence[];
  metadata?: Record<string, unknown>;
}

export interface SourceEvidence {
  fieldName: string;
  rawText: string;
  page?: number;
  lineNumber?: number;
  highlightStart?: number;
  highlightEnd?: number;
}

export interface PayrollRule {
  id: string;
  code: string;
  title: string;
  category: AlertCategory;
  defaultSeverity: AlertSeverity;
  shortDescription: string;
  dependsOnFields: string[];
  canAutoConclude: boolean;
  run: (doc: StructuredPayrollDocument, ctx: AnalysisContext) => RuleResult;
}

// --- Analysis Context ---
export interface AnalysisContext {
  previousDocuments: StructuredPayrollDocument[];
  configuration: BusinessConfiguration;
  payrollProfileGuess: PayrollProfileGuess;
  parsingConfidence: number;
  assumptions: string[];
  unresolvedAmbiguities: string[];
}

export interface PayrollProfileGuess {
  isFullTime: boolean | null;
  isCadre: boolean | null;
  hasSpecificAgreement: boolean;
  isApprentice: boolean | null;
  isPartialActivity: boolean | null;
  monthlyHoursReference: number; // default 151.67
}

// --- Business Configuration ---
export interface BusinessConfiguration {
  salaryVariationThresholdPercent: number;
  ocrConfidenceThreshold: number;
  parsingConfidenceThreshold: number;
  alertSensitivity: 'prudent' | 'standard' | 'strict';
  smicHoraireBrut: number; // Current SMIC value
  smicMensuelBrut: number;
  monthlyHoursFullTime: number;
  overtimeTier1Rate: number; // 1.25
  overtimeTier2Rate: number; // 1.50
  enabledRules: string[];
  disabledRules: string[];
  customThresholds: Record<string, number>;
}

// --- Report types ---
export type GlobalStatus = 'green' | 'orange' | 'red';

export interface AnalysisReport {
  id: string;
  documentId: string;
  generatedAt: string;

  // Score
  globalScore: number; // 0-100
  globalStatus: GlobalStatus;
  confidenceBadge: string;

  // Counts
  anomaliesCount: number;
  criticalCount: number;
  importantCount: number;
  reviewCount: number;
  infoCount: number;

  // Quality
  extractionQuality: number;
  parsingCompleteness: number;

  // Sections
  executiveSummary: string;
  readabilityAssessment: string;
  normalFindings: string[];
  reviewFindings: RuleResult[];
  importantFindings: RuleResult[];
  criticalFindings: RuleResult[];
  infoFindings: RuleResult[];

  // Comparison
  comparisonSummary?: ComparisonSummary;

  // Assumptions & limits
  assumptions: string[];
  analysisLimits: string[];
  practicalAdvice: string[];
  cautionNotices: string[];

  // Extracted data snapshot
  extractedDataSnapshot: Record<string, unknown>;
}

// --- Comparison types ---
export interface ComparisonField {
  fieldName: string;
  fieldLabel: string;
  values: { period: string; value: number | null; confidence: number }[];
  variation: number | null;
  variationPercent: number | null;
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile' | 'unknown';
  autoComment: string;
  isAnomaly: boolean;
  anomalyType?: 'probable_anomaly' | 'to_verify' | 'normal_variation';
}

export interface ComparisonSummary {
  periods: string[];
  fields: ComparisonField[];
  repeatedAlerts: { ruleCode: string; count: number; months: string[] }[];
  overallTrend: string;
  highlights: string[];
}

// --- Storage ---
export interface StorageFile {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  path: string;
  createdAt: string;
}

// --- Document metadata ---
export interface PayrollDocumentMeta {
  id: string;
  userId: string;
  fileId: string;
  originalFileName: string;
  status: DocumentStatus;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  uploadedAt: string;
  extractedAt?: string;
  parsedAt?: string;
  analyzedAt?: string;
  deletedAt?: string;
  extractionProvider?: string;
  extractionConfidence?: number;
  parsingConfidence?: number;
  analysisScore?: number;
  error?: string;
}

// --- Audit ---
export type AuditAction =
  | 'upload_started'
  | 'upload_completed'
  | 'extraction_started'
  | 'extraction_completed'
  | 'extraction_failed'
  | 'parsing_started'
  | 'parsing_completed'
  | 'parsing_failed'
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'report_generated'
  | 'document_viewed'
  | 'document_deleted'
  | 'comparison_run'
  | 'account_deletion_requested';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  documentId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

// --- Subscription ---
export type SubscriptionTier = 'free' | 'premium' | 'enterprise';
export type PurchaseType = 'subscription' | 'unit';

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  analysesUsed: number;
  analysesLimit: number;
  features: {
    comparison: boolean;
    detailedReport: boolean;
    unlimitedHistory: boolean;
    prioritySupport: boolean;
  };
}

// --- Dashboard ---
export interface DashboardStats {
  totalDocuments: number;
  analyzedDocuments: number;
  averageScore: number;
  criticalAlerts: number;
  recentDocuments: PayrollDocumentMeta[];
  topAlerts: { code: string; title: string; count: number }[];
}

// --- Admin Stats ---
export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  ocrFailureRate: number;
  avgParsingTimeMs: number;
  fullExtractionRate: number;
  topAlerts: { code: string; title: string; count: number }[];
}

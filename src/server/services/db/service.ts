// ============================================================
// PayGuard — Database Service (Supabase & Local Fallback)
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Supabase Initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Database = any;

let supabase: ReturnType<typeof createClient<Database>> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
} else {
  console.warn('⚠️ Supabase credentials not found in environment variables. Falling back to local JSON persistence.');
}

// Local Fallback Helpers
const DATA_DIR = join(process.cwd(), '.payguard-data');
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}
function readStore<T>(file: string): T[] {
  ensureDir();
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return []; }
}
function writeStore<T>(file: string, data: T[]) {
  ensureDir();
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// Document CRUD
// ============================================================
export interface DbDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  profileId?: string;
  rawText?: string;
  extractionConfidence?: number;
  parsedData?: string;
  reportData?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createDocument(data: { fileName: string; fileSize: number; mimeType: string; profileId?: string; }): Promise<DbDocument> {
  const docData = { ...data, status: 'uploaded' };
  
  if (supabase) {
    const { data: inserted, error } = await supabase.from('documents').insert({
      file_name: docData.fileName,
      file_size: docData.fileSize,
      mime_type: docData.mimeType,
      profile_id: docData.profileId,
      status: docData.status
    }).select().single();
    
    if (error) throw new Error(error.message);
    
    return {
      id: inserted.id,
      fileName: inserted.file_name,
      fileSize: inserted.file_size,
      mimeType: inserted.mime_type,
      status: inserted.status,
      profileId: inserted.profile_id,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    };
  }

  // Fallback
  const docs = readStore<DbDocument>('documents.json');
  const doc: DbDocument = { id: uid(), ...docData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  docs.push(doc);
  writeStore('documents.json', docs);
  return doc;
}

export async function updateDocumentStatus(id: string, status: string, extra?: Partial<DbDocument>): Promise<DbDocument | null> {
  if (supabase) {
    const updateData: any = { status };
    if (extra?.rawText !== undefined) updateData.raw_text = extra.rawText;
    if (extra?.extractionConfidence !== undefined) updateData.extraction_confidence = extra.extractionConfidence;
    if (extra?.parsedData !== undefined) updateData.parsed_data = extra.parsedData;
    if (extra?.reportData !== undefined) updateData.report_data = extra.reportData;

    const { data, error } = await supabase.from('documents')
      .update(updateData).eq('id', id).select().single();
      
    if (error || !data) return null;
    return {
      id: data.id, fileName: data.file_name, fileSize: data.file_size, mimeType: data.mime_type, status: data.status,
      profileId: data.profile_id, rawText: data.raw_text, extractionConfidence: data.extraction_confidence,
      parsedData: data.parsed_data, reportData: data.report_data, createdAt: data.created_at, updatedAt: data.updated_at
    };
  }

  // Fallback
  const docs = readStore<DbDocument>('documents.json');
  const idx = docs.findIndex(d => d.id === id);
  if (idx === -1) return null;
  docs[idx] = { ...docs[idx], ...extra, status, updatedAt: new Date().toISOString() };
  writeStore('documents.json', docs);
  return docs[idx];
}

export async function getDocument(id: string): Promise<DbDocument | null> {
  if (supabase) {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      id: data.id, fileName: data.file_name, fileSize: data.file_size, mimeType: data.mime_type, status: data.status,
      profileId: data.profile_id, rawText: data.raw_text, extractionConfidence: data.extraction_confidence,
      parsedData: data.parsed_data, reportData: data.report_data, createdAt: data.created_at, updatedAt: data.updated_at
    };
  }
  return readStore<DbDocument>('documents.json').find(d => d.id === id) || null;
}

export async function getAllDocuments(): Promise<DbDocument[]> {
  if (supabase) {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(d => ({
      id: d.id, fileName: d.file_name, fileSize: d.file_size, mimeType: d.mime_type, status: d.status,
      profileId: d.profile_id, rawText: d.raw_text, extractionConfidence: d.extraction_confidence,
      parsedData: d.parsed_data, reportData: d.report_data, createdAt: d.created_at, updatedAt: d.updated_at
    }));
  }
  return readStore<DbDocument>('documents.json').reverse();
}

export async function deleteDocument(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('documents').delete().eq('id', id);
    return;
  }
  const docs = readStore<DbDocument>('documents.json');
  writeStore('documents.json', docs.filter(d => d.id !== id));
}

// ============================================================
// EmployeeProfile CRUD
// ============================================================
export interface DbProfile {
  id: string;
  name: string;
  isFullTime: boolean;
  isCadre: boolean;
  weeklyHours: number;
  collectiveAgreement: string | null;
  contractType: string;
  bonusVariationMax: number;
  hoursVariationMax: number;
  netGrossRatioMin: number;
  netGrossRatioMax: number;
  salaryVariationMax: number;
  createdAt: string;
}

export async function createProfile(data: Omit<DbProfile, 'id' | 'createdAt'>): Promise<DbProfile> {
  if (supabase) {
    const { data: inserted, error } = await supabase.from('employee_profiles').insert({
      name: data.name, is_full_time: data.isFullTime, is_cadre: data.isCadre, weekly_hours: data.weeklyHours,
      collective_agreement: data.collectiveAgreement, contract_type: data.contractType, bonus_variation_max: data.bonusVariationMax,
      hours_variation_max: data.hoursVariationMax, net_gross_ratio_min: data.netGrossRatioMin,
      net_gross_ratio_max: data.netGrossRatioMax, salary_variation_max: data.salaryVariationMax
    }).select().single();
    if (error) throw new Error(error.message);
    return {
      id: inserted.id, name: inserted.name, isFullTime: inserted.is_full_time, isCadre: inserted.is_cadre,
      weeklyHours: inserted.weekly_hours, collectiveAgreement: inserted.collective_agreement, contractType: inserted.contract_type,
      bonusVariationMax: inserted.bonus_variation_max, hoursVariationMax: inserted.hours_variation_max,
      netGrossRatioMin: inserted.net_gross_ratio_min, netGrossRatioMax: inserted.net_gross_ratio_max,
      salaryVariationMax: inserted.salary_variation_max, createdAt: inserted.created_at
    };
  }

  const profiles = readStore<DbProfile>('profiles.json');
  const profile: DbProfile = { id: uid(), ...data, createdAt: new Date().toISOString() };
  profiles.push(profile);
  writeStore('profiles.json', profiles);
  return profile;
}

export async function updateProfile(id: string, data: Partial<DbProfile>): Promise<DbProfile | null> {
  if (supabase) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isFullTime !== undefined) updateData.is_full_time = data.isFullTime;
    if (data.isCadre !== undefined) updateData.is_cadre = data.isCadre;
    if (data.weeklyHours !== undefined) updateData.weekly_hours = data.weeklyHours;
    if (data.collectiveAgreement !== undefined) updateData.collective_agreement = data.collectiveAgreement;
    if (data.contractType !== undefined) updateData.contract_type = data.contractType;
    if (data.bonusVariationMax !== undefined) updateData.bonus_variation_max = data.bonusVariationMax;
    if (data.hoursVariationMax !== undefined) updateData.hours_variation_max = data.hoursVariationMax;
    if (data.netGrossRatioMin !== undefined) updateData.net_gross_ratio_min = data.netGrossRatioMin;
    if (data.netGrossRatioMax !== undefined) updateData.net_gross_ratio_max = data.netGrossRatioMax;
    if (data.salaryVariationMax !== undefined) updateData.salary_variation_max = data.salaryVariationMax;

    const { data: updated, error } = await supabase.from('employee_profiles').update(updateData).eq('id', id).select().single();
    if (error || !updated) return null;
    return {
      id: updated.id, name: updated.name, isFullTime: updated.is_full_time, isCadre: updated.is_cadre,
      weeklyHours: updated.weekly_hours, collectiveAgreement: updated.collective_agreement, contractType: updated.contract_type,
      bonusVariationMax: updated.bonus_variation_max, hoursVariationMax: updated.hours_variation_max,
      netGrossRatioMin: updated.net_gross_ratio_min, netGrossRatioMax: updated.net_gross_ratio_max,
      salaryVariationMax: updated.salary_variation_max, createdAt: updated.created_at
    };
  }

  const profiles = readStore<DbProfile>('profiles.json');
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return null;
  profiles[idx] = { ...profiles[idx], ...data };
  writeStore('profiles.json', profiles);
  return profiles[idx];
}

export async function getAllProfiles(): Promise<DbProfile[]> {
  if (supabase) {
    const { data, error } = await supabase.from('employee_profiles').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(d => ({
      id: d.id, name: d.name, isFullTime: d.is_full_time, isCadre: d.is_cadre,
      weeklyHours: d.weekly_hours, collectiveAgreement: d.collective_agreement, contractType: d.contract_type,
      bonusVariationMax: d.bonus_variation_max, hoursVariationMax: d.hours_variation_max,
      netGrossRatioMin: d.net_gross_ratio_min, netGrossRatioMax: d.net_gross_ratio_max,
      salaryVariationMax: d.salary_variation_max, createdAt: d.created_at
    }));
  }
  return readStore<DbProfile>('profiles.json').reverse();
}

export async function deleteProfile(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('employee_profiles').delete().eq('id', id);
    return;
  }
  const profiles = readStore<DbProfile>('profiles.json');
  writeStore('profiles.json', profiles.filter(p => p.id !== id));
}

// ============================================================
// AuditLog
// ============================================================
export interface DbAuditLog { id: string; action: string; documentId?: string; details?: string; timestamp: string; }

export async function logAudit(action: string, documentId?: string, details?: string): Promise<void> {
  if (supabase) {
    await supabase.from('audit_logs').insert({ action, document_id: documentId, details });
    return;
  }
  const logs = readStore<DbAuditLog>('audit.json');
  logs.push({ id: uid(), action, documentId, details, timestamp: new Date().toISOString() });
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  writeStore('audit.json', logs);
}

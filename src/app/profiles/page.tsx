'use client';
// ============================================================
// PayGuard — Profiles Page
// Configurable employee profiles with thresholds
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '../components/Toast';

interface Convention {
  code: string;
  shortName: string;
  idcc: string;
}

interface Profile {
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
  documents?: { id: string }[];
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '', isFullTime: true, isCadre: false, weeklyHours: 35,
    collectiveAgreement: '', contractType: 'CDI',
    bonusVariationMax: 20, hoursVariationMax: 10,
    netGrossRatioMin: 0.6, netGrossRatioMax: 0.85, salaryVariationMax: 15,
  });

  const loadData = useCallback(async () => {
    const res = await fetch('/api/profiles');
    const data = await res.json();
    setProfiles(data.profiles || []);
    setConventions(data.conventions || []);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({
      name: '', isFullTime: true, isCadre: false, weeklyHours: 35,
      collectiveAgreement: '', contractType: 'CDI',
      bonusVariationMax: 20, hoursVariationMax: 10,
      netGrossRatioMin: 0.6, netGrossRatioMax: 0.85, salaryVariationMax: 15,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      addToast('Veuillez sélectionner un fichier PDF.', 'error');
      return;
    }

    setUploadingContract(true);
    addToast('Analyse du contrat en cours...', 'info');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profiles/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        addToast('Contrat analysé ! Le formulaire a été pré-rempli.', 'success');
        setForm(prev => ({
          ...prev,
          name: prev.name || file.name.replace('.pdf', ''),
          contractType: data.data.contractType || prev.contractType,
          isCadre: data.data.isCadre,
          isFullTime: data.data.isFullTime,
          weeklyHours: data.data.weeklyHours || prev.weeklyHours,
          collectiveAgreement: data.data.collectiveAgreement || prev.collectiveAgreement,
        }));
      } else {
        addToast(data.error || 'Erreur lors de l\'analyse', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Impossible de joindre le serveur.', 'error');
    } finally {
      setUploadingContract(false);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { id: editingId, ...form } : form;

    await fetch('/api/profiles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    resetForm();
    loadData();
  };

  const handleEdit = (profile: Profile) => {
    setForm({
      name: profile.name, isFullTime: profile.isFullTime, isCadre: profile.isCadre,
      weeklyHours: profile.weeklyHours, collectiveAgreement: profile.collectiveAgreement || '',
      contractType: profile.contractType, bonusVariationMax: profile.bonusVariationMax,
      hoursVariationMax: profile.hoursVariationMax, netGrossRatioMin: profile.netGrossRatioMin,
      netGrossRatioMax: profile.netGrossRatioMax, salaryVariationMax: profile.salaryVariationMax,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce profil ?')) return;
    await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' });
    loadData();
  };

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>← Retour</Link>
        <h1>👤 Profils salariés</h1>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Créez des profils pour personnaliser les seuils de détection selon votre situation. Les alertes seront plus précises et les faux positifs réduits.
      </p>

      {/* Existing profiles */}
      {profiles.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {profiles.map(p => (
            <div key={p.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>👤 {p.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span className="badge badge-info">{p.contractType}</span>
                  <span className="badge badge-info">{p.isFullTime ? 'Temps plein' : 'Temps partiel'}</span>
                  <span className="badge badge-info">{p.isCadre ? 'Cadre' : 'Non-cadre'}</span>
                  {p.collectiveAgreement && <span className="badge badge-info">{p.collectiveAgreement}</span>}
                </div>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: 0 }}>
                  {p.weeklyHours}h/sem · Seuil variation net: ±{p.salaryVariationMax}% · Ratio net/brut: {(p.netGrossRatioMin * 100).toFixed(0)}%-{(p.netGrossRatioMax * 100).toFixed(0)}%
                  {p.documents && ` · ${p.documents.length} document(s)`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => handleEdit(p)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>✏️ Modifier</button>
                <button className="btn btn-secondary" onClick={() => handleDelete(p.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', color: '#ef4444' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create button */}
      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '2rem' }}>
          ➕ Créer un profil
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>{editingId ? '✏️ Modifier le profil' : '➕ Nouveau profil'}</h3>
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleContractUpload} 
                accept="application/pdf" 
                style={{ display: 'none' }} 
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingContract}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                {uploadingContract ? '⏳ Analyse en cours...' : '📄 Auto-remplir via Contrat (PDF)'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nom du profil *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Jean Dupont" style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>

            {/* Contract type */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Type de contrat</label>
              <select value={form.contractType} onChange={e => setForm({ ...form, contractType: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Interim">Intérim</option>
                <option value="Apprentissage">Apprentissage</option>
              </select>
            </div>

            {/* Convention */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Convention collective</label>
              <select value={form.collectiveAgreement} onChange={e => setForm({ ...form, collectiveAgreement: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="">— Non spécifiée —</option>
                {conventions.map(c => <option key={c.code} value={c.code}>{c.shortName} (IDCC {c.idcc})</option>)}
              </select>
            </div>

            {/* Weekly hours */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Heures / semaine</label>
              <input type="number" value={form.weeklyHours} onChange={e => setForm({ ...form, weeklyHours: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFullTime} onChange={e => setForm({ ...form, isFullTime: e.target.checked })} /> Temps plein
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isCadre} onChange={e => setForm({ ...form, isCadre: e.target.checked })} /> Cadre
              </label>
            </div>

            {/* Thresholds */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Seuil variation salaire (%)</label>
              <input type="number" value={form.salaryVariationMax} onChange={e => setForm({ ...form, salaryVariationMax: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ratio net/brut min</label>
              <input type="number" step="0.01" value={form.netGrossRatioMin} onChange={e => setForm({ ...form, netGrossRatioMin: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ratio net/brut max</label>
              <input type="number" step="0.01" value={form.netGrossRatioMax} onChange={e => setForm({ ...form, netGrossRatioMax: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={handleSave}>💾 {editingId ? 'Mettre à jour' : 'Créer le profil'}</button>
            <button className="btn btn-secondary" onClick={resetForm}>Annuler</button>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="card" style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)' }}>
        <h3>ℹ️ Pourquoi créer un profil ?</h3>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li><strong>Réduire les faux positifs</strong> — Les seuils sont adaptés à votre situation</li>
          <li><strong>Vérifications convention</strong> — Si vous renseignez votre convention collective, des règles spécifiques seront activées (minima, primes obligatoires)</li>
          <li><strong>Historique par profil</strong> — Les comparaisons multi-bulletins se font dans le contexte de chaque profil</li>
          <li><strong>Cadre vs Non-cadre</strong> — Le ratio net/brut attendu diffère significativement</li>
        </ul>
      </div>
    </main>
  );
}

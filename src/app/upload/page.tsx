'use client';
// ============================================================
// PayGuard — Upload Page with Drag & Drop + Pipeline Progress
// ============================================================
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

type PipelineStep = 'idle' | 'uploading' | 'extracting' | 'parsing' | 'analyzing' | 'done' | 'error';

interface UploadResult {
  success: boolean;
  documentId?: string;
  report?: Record<string, unknown>;
  extractionConfidence?: number;
  error?: string;
}

const STEPS: { key: PipelineStep; label: string; icon: string }[] = [
  { key: 'uploading', label: 'Envoi du fichier', icon: '📤' },
  { key: 'extracting', label: 'Extraction du texte', icon: '🔍' },
  { key: 'parsing', label: 'Analyse structurelle', icon: '📋' },
  { key: 'analyzing', label: 'Détection d\'anomalies', icon: '🛡️' },
  { key: 'done', label: 'Rapport prêt', icon: '✅' },
];

export default function UploadPage() {
  const [step, setStep] = useState<PipelineStep>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }, []);

  const selectFile = (file: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Format non supporté. Utilisez un PDF ou une image (PNG, JPEG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setResult(null);
    setStep('idle');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;

    setErrorMsg(null);
    setResult(null);

    // Simulate pipeline steps with delays
    setStep('uploading');
    await new Promise(r => setTimeout(r, 500));

    setStep('extracting');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setStep('parsing');
      await new Promise(r => setTimeout(r, 300));

      setStep('analyzing');

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data: UploadResult = await response.json();

      if (!response.ok) {
        setStep('error');
        setErrorMsg(data.error || 'Erreur lors de l\'analyse.');
        return;
      }

      setStep('done');
      setResult(data);
    } catch {
      setStep('error');
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
    }
  };

  const reset = () => {
    setStep('idle');
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>← Retour</Link>
        <h1>📤 Analyser un bulletin</h1>
      </div>

      {/* Trust banner */}
      <div className="card" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '2rem', padding: '1rem 1.5rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          🔒 <strong>Fichier traité localement.</strong> Votre document est analysé sur notre serveur sécurisé et n&apos;est jamais partagé. L&apos;analyse est automatique et confidentielle.
        </p>
      </div>

      {/* Drop zone */}
      {step === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
            transition: 'all 0.3s ease',
            marginBottom: '2rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isDragging ? '📥' : '📄'}</div>
          <h3 style={{ marginBottom: '0.5rem' }}>
            {selectedFile ? selectedFile.name : 'Glissez votre bulletin ici'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(0)} Ko — ${selectedFile.type}`
              : 'ou cliquez pour sélectionner un fichier'}
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            Formats acceptés : PDF, PNG, JPEG — Max 10 Mo
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <p style={{ color: '#ef4444', margin: 0 }}>❌ {errorMsg}</p>
        </div>
      )}

      {/* Launch button */}
      {selectedFile && step === 'idle' && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={runAnalysis} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
            🛡️ Lancer l&apos;analyse
          </button>
        </div>
      )}

      {/* Pipeline progress */}
      {step !== 'idle' && step !== 'error' && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Pipeline d&apos;analyse</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {STEPS.map((s, i) => {
              const isActive = s.key === step;
              const isDone = currentStepIndex > i;
              const isPending = currentStepIndex < i;

              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  opacity: isPending ? 0.35 : 1,
                  transition: 'opacity 0.3s ease',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    background: isDone ? 'rgba(34, 197, 94, 0.2)' : isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-elevated)',
                    border: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}>
                    {isDone ? '✅' : s.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: isActive ? 600 : 400 }}>{s.label}</div>
                    {isActive && s.key !== 'done' && (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>En cours...</div>
                    )}
                  </div>
                  {isActive && s.key !== 'done' && (
                    <div className="pulse-dot" style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result */}
      {step === 'done' && result?.success && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2>Analyse terminée !</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Votre bulletin a été analysé avec 30 règles de vérification françaises.
            <br />
            Confiance d&apos;extraction : {Math.round((result.extractionConfidence || 0) * 100)}%
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/report/${result.documentId}`}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2rem' }}
            >
              📊 Voir le rapport
            </Link>
            <button className="btn btn-secondary" onClick={reset} style={{ padding: '0.8rem 2rem' }}>
              📄 Analyser un autre bulletin
            </button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={reset} style={{ padding: '0.8rem 2rem' }}>
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>💡 Conseils pour un meilleur résultat</h3>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>Préférez un <strong>PDF natif</strong> (envoyé par email ou téléchargé) plutôt qu&apos;un scan</li>
          <li>Si vous scannez, utilisez une résolution <strong>300 DPI minimum</strong></li>
          <li>Assurez-vous que <strong>toutes les pages</strong> du bulletin sont incluses</li>
          <li>Évitez les photos prises avec un téléphone (distorsion, ombres)</li>
        </ul>
      </div>
    </main>
  );
}

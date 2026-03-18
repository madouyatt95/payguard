'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ExampleContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario') || 'normal-cdi';
  const [report, setReport] = useState<any>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('report');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [repRes, parsedRes] = await Promise.all([
          fetch(`/api/demo?action=report&scenario=${scenarioId}`),
          fetch(`/api/demo?action=parsed&scenario=${scenarioId}`),
        ]);
        const repData = await repRes.json();
        const parsedData = await parsedRes.json();
        if (repData.success) setReport(repData.data);
        if (parsedData.success) setParsed(parsedData.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [scenarioId]);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="container">
            <h1>Analyse en cours...</h1>
            <p>Chargement du rapport</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="pipeline-steps">
            <div className="pipeline-step active"><div className="pipeline-step-icon">📖</div><span className="pipeline-step-label">Lecture du document</span></div>
            <div className="pipeline-step waiting"><div className="pipeline-step-icon">🧩</div><span className="pipeline-step-label">Extraction des champs</span></div>
            <div className="pipeline-step waiting"><div className="pipeline-step-icon">🔎</div><span className="pipeline-step-label">Vérification</span></div>
            <div className="pipeline-step waiting"><div className="pipeline-step-icon">📊</div><span className="pipeline-step-label">Rapport</span></div>
          </div>
        </div>
      </>
    );
  }

  if (!report) {
    return (
      <div className="page-header">
        <div className="container">
          <h1>Erreur</h1>
          <p>Impossible de charger le rapport.</p>
        </div>
      </div>
    );
  }

  const statusColor = report.globalStatus === 'green' ? 'var(--accent-green)' : report.globalStatus === 'orange' ? 'var(--accent-orange)' : 'var(--accent-red)';
  const statusEmoji = report.globalStatus === 'green' ? '✅' : report.globalStatus === 'orange' ? '⚠️' : '🔴';

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Retour</a>
            <h1>Rapport d&apos;analyse</h1>
            <span className={`badge badge-${report.globalStatus}`}>{statusEmoji} {report.confidenceBadge}</span>
          </div>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }}>
        <div className="container">
          {/* Score Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div className="score-ring" style={{ margin: '0 auto' }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={statusColor}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${report.globalScore * 3.14} 314`}
                  />
                </svg>
                <span className="score-value" style={{ color: statusColor }}>{report.globalScore}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Score global</div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Alertes détectées</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{report.anomaliesCount}</div>
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {report.criticalCount > 0 && <span className="badge badge-critical">{report.criticalCount} crit.</span>}
                {report.importantCount > 0 && <span className="badge badge-important">{report.importantCount} imp.</span>}
                {report.reviewCount > 0 && <span className="badge badge-review">{report.reviewCount} rev.</span>}
              </div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Qualité de lecture</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{Math.round(report.extractionQuality * 100)}%</div>
              <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, marginTop: '0.5rem' }}>
                <div style={{ height: '100%', width: `${report.extractionQuality * 100}%`, borderRadius: 3, background: report.extractionQuality > 0.7 ? 'var(--accent-green)' : 'var(--accent-orange)' }} />
              </div>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Complétude</div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{Math.round(report.parsingCompleteness * 100)}%</div>
              <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, marginTop: '0.5rem' }}>
                <div style={{ height: '100%', width: `${report.parsingCompleteness * 100}%`, borderRadius: 3, background: 'var(--accent-primary)' }} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>📊 Rapport</button>
            <button className={`tab ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>📋 Données détectées</button>
            <button className={`tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>🔍 Preuves de détection</button>
            <button className={`tab ${activeTab === 'limits' ? 'active' : ''}`} onClick={() => setActiveTab('limits')}>ℹ️ Hypothèses & Limites</button>
          </div>

          {activeTab === 'report' && (
            <div>
              {/* Executive Summary */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📝 Résumé</h3>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {report.executiveSummary}
                </p>
              </div>

              {/* Readability */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>📖 Fiabilité de lecture</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{report.readabilityAssessment}</p>
              </div>

              {/* Normal findings */}
              {report.normalFindings.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>✅ Ce qui semble normal</h3>
                  {report.normalFindings.map((f: string, i: number) => (
                    <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-green)' }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Critical Findings */}
              {report.criticalFindings.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-critical)' }}>🔴 Points critiques</h3>
                  {report.criticalFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} />)}
                </div>
              )}

              {/* Important Findings */}
              {report.importantFindings.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-important)' }}>⚠️ Points importants</h3>
                  {report.importantFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} />)}
                </div>
              )}

              {/* Review Findings */}
              {report.reviewFindings.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-review)' }}>🔍 À vérifier</h3>
                  {report.reviewFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} />)}
                </div>
              )}

              {/* Practical Advice */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>💡 Conseils pratiques</h3>
                {report.practicalAdvice.map((a: string, i: number) => (
                  <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>💡</span> {a}
                  </div>
                ))}
              </div>

              {/* Caution Notices */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(251, 191, 36, 0.04)', borderColor: 'rgba(251, 191, 36, 0.15)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--accent-orange)' }}>⚖️ Mentions de prudence</h3>
                {report.cautionNotices.map((n: string, i: number) => (
                  <div key={i} style={{ padding: '0.35rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    ⚠️ {n}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fields' && parsed && (
            <div>
              <h3 style={{ marginBottom: '1rem' }}>📋 Données extraites avec niveaux de confiance</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Chaque champ est accompagné d&apos;un indicateur de confiance. <span className="confidence-dot confidence-high"></span>Sûr
                &nbsp;<span className="confidence-dot confidence-medium"></span>Incertain
                &nbsp;<span className="confidence-dot confidence-low"></span>Peu fiable
                &nbsp;<span className="confidence-dot confidence-absent"></span>Absent ou déduit
              </p>
              <div className="parsed-fields-grid">
                <FieldCard label="Nom du salarié" field={parsed.employeeIdentity?.fullName} />
                <FieldCard label="Employeur" field={parsed.employerIdentity?.companyName} />
                <FieldCard label="SIRET" field={parsed.employerIdentity?.siret} />
                <FieldCard label="Période" field={parsed.payPeriod?.month} />
                <FieldCard label="Poste" field={parsed.employeeIdentity?.position} />
                <FieldCard label="Statut" field={parsed.employeeIdentity?.status} />
                <FieldCard label="Convention collective" field={parsed.contractIndicators?.collectiveAgreementHint} />
                <FieldCard label="Contrat" field={parsed.contractIndicators?.contractType} />
                <FieldCard label="Salaire de base" field={parsed.baseSalary} format="money" />
                <FieldCard label="Taux horaire" field={parsed.hourlyRate} format="money" />
                <FieldCard label="Heures normales" field={parsed.normalHours} format="hours" />
                <FieldCard label="Heures supplémentaires" field={parsed.overtimeHours} format="hours" />
                <FieldCard label="Total brut" field={parsed.grossSalary} format="money" />
                <FieldCard label="Net imposable" field={parsed.taxableNet} format="money" />
                <FieldCard label="Net à payer" field={parsed.netToPay} format="money" />
              </div>

              {/* Bonuses */}
              {parsed.bonuses?.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>💰 Primes détectées</h4>
                  <div className="parsed-fields-grid">
                    {parsed.bonuses.map((b: any, i: number) => (
                      <FieldCard key={i} label={b.label} field={b.amount} format="money" />
                    ))}
                  </div>
                </div>
              )}

              {/* Contributions */}
              {parsed.socialContributions?.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>📑 Cotisations détectées</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Libellé</th>
                        <th>Base</th>
                        <th>Taux</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.socialContributions.map((c: any, i: number) => (
                        <tr key={i}>
                          <td>{c.label}</td>
                          <td className="value-cell">{c.base ? `${c.base.toFixed(2)} €` : '—'}</td>
                          <td className="value-cell">{c.rate ? `${c.rate.toFixed(2)}%` : '—'}</td>
                          <td className="value-cell">{c.employeeAmount ? `${c.employeeAmount.toFixed(2)} €` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidence' && (
            <div>
              <h3 style={{ marginBottom: '1rem' }}>🔍 Preuves de détection</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Pour chaque alerte, voici les lignes du bulletin utilisées pour la détection. Ces preuves vous permettent de vérifier la pertinence de chaque signalement.
              </p>
              {[...report.criticalFindings, ...report.importantFindings, ...report.reviewFindings]
                .filter((f: any) => f.sourceEvidence?.length > 0)
                .map((f: any) => (
                  <div key={f.ruleId} className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.title}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{f.detectionReason}</div>
                    <div className="alert-evidence">
                      {f.sourceEvidence.map((e: any, i: number) => (
                        <div key={i}>
                          <span style={{ color: 'var(--accent-primary-light)' }}>{e.fieldName}</span>: &quot;{e.rawText}&quot;
                          {e.page && <span style={{ color: 'var(--text-muted)' }}> (page {e.page})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {[...report.criticalFindings, ...report.importantFindings, ...report.reviewFindings]
                .filter((f: any) => f.sourceEvidence?.length > 0).length === 0 && (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucune preuve de détection disponible pour les alertes de ce rapport.
                </div>
              )}
            </div>
          )}

          {activeTab === 'limits' && (
            <div>
              <h3 style={{ marginBottom: '1rem' }}>ℹ️ Hypothèses de l&apos;analyse</h3>
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                {report.assumptions.map((a: string, i: number) => (
                  <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    📌 {a}
                  </div>
                ))}
              </div>

              <h3 style={{ marginBottom: '1rem' }}>⚠️ Limites de l&apos;analyse</h3>
              <div className="card" style={{ padding: '1.5rem' }}>
                {report.analysisLimits.map((l: string, i: number) => (
                  <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    ⚠️ {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card alert-card severity-${alert.severity}`}>
      <div className="alert-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge badge-${alert.severity}`}>{alert.severity === 'critical' ? '🔴' : alert.severity === 'important' ? '⚠️' : '🔍'} {alert.severity}</span>
          <span className="alert-title">{alert.title}</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary-light)', cursor: 'pointer', fontSize: '0.8rem' }}>
          {expanded ? 'Réduire ▲' : 'Détails ▼'}
        </button>
      </div>
      <div className="alert-body">{alert.shortDescription}</div>

      {expanded && (
        <>
          {alert.detailedExplanation && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {alert.detailedExplanation}
            </div>
          )}
          {alert.sourceEvidence?.length > 0 && (
            <div className="alert-evidence">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Lignes sources utilisées :</div>
              {alert.sourceEvidence.map((e: any, i: number) => (
                <div key={i}>
                  <span style={{ color: 'var(--accent-primary-light)' }}>{e.fieldName}</span>: &quot;{e.rawText}&quot;
                </div>
              ))}
            </div>
          )}
          {alert.recommendation && (
            <div className="alert-recommendation">
              💡 {alert.recommendation}
            </div>
          )}
          {alert.legalCaution && (
            <div className="alert-caution">
              ⚖️ {alert.legalCaution}
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Confiance de détection : {Math.round(alert.confidence * 100)}% | Peut conclure auto : {alert.canAutoConclude ? 'Oui' : 'Non'}
          </div>
        </>
      )}
    </div>
  );
}

function FieldCard({ label, field, format }: { label: string; field: any; format?: string }) {
  if (!field) return (
    <div className="card parsed-field-card">
      <div className="parsed-field-label">{label}</div>
      <div className="parsed-field-value" style={{ color: 'var(--confidence-absent)' }}>Non détecté</div>
    </div>
  );

  const confClass = field.confidenceLevel === 'high' ? 'confidence-high' : field.confidenceLevel === 'medium' ? 'confidence-medium' : field.confidenceLevel === 'low' ? 'confidence-low' : 'confidence-absent';
  const confLabel = field.confidenceLevel === 'high' ? 'Sûr' : field.confidenceLevel === 'medium' ? 'Incertain' : field.confidenceLevel === 'low' ? 'Peu fiable' : 'Absent/Déduit';

  let displayValue = field.value ?? 'Non détecté';
  if (format === 'money' && typeof displayValue === 'number') displayValue = `${displayValue.toFixed(2)} €`;
  if (format === 'hours' && typeof displayValue === 'number') displayValue = `${displayValue} h`;

  return (
    <div className="card parsed-field-card">
      <div className="parsed-field-label">{label}</div>
      <div className="parsed-field-value">
        <span className={`confidence-dot ${confClass}`}></span>
        {String(displayValue)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{confLabel} ({Math.round(field.confidence * 100)}%)</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{field.methodUsed}</span>
      </div>
      {field.rawSource && <div className="parsed-field-source">{field.rawSource.substring(0, 80)}</div>}
    </div>
  );
}

export default function ExamplePage() {
  return (
    <Suspense fallback={<div className="page-header"><div className="container"><h1>Chargement...</h1></div></div>}>
      <ExampleContent />
    </Suspense>
  );
}

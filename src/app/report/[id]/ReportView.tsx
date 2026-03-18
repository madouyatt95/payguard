'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Link from 'next/link';

export default function ReportView({ report, parsed, documentId }: { report: any, parsed: any, documentId: string }) {
  const [activeTab, setActiveTab] = useState('report');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const statusColor = report.globalStatus === 'green' ? 'var(--accent-green)' : report.globalStatus === 'orange' ? 'var(--accent-orange)' : 'var(--accent-red)';
  const statusEmoji = report.globalStatus === 'green' ? '✅' : report.globalStatus === 'orange' ? '⚠️' : '🔴';

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    // Force "report" tab open for export to ensure we capture the main summary
    const originalTab = activeTab;
    setActiveTab('report');
    
    // Slight delay to ensure DOM is updated
    await new Promise(r => setTimeout(r, 200));

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      
      // If content is longer than one page, add pages
      let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
      let position = -pdf.internal.pageSize.getHeight();
      
      while (heightLeft >= 0) {
        position = position - pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`Audit_PayGuard_${documentId}.pdf`);
    } catch (e) {
      console.error('Erreur export PDF', e);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setActiveTab(originalTab);
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Retour</Link>
              <h1>Rapport d&apos;analyse précis</h1>
              <span className={`badge badge-${report.globalStatus}`}>{statusEmoji} {report.confidenceBadge}</span>
            </div>
            <button 
              onClick={exportPDF} 
              disabled={isExporting}
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isExporting ? '⏳ Génération...' : '📥 Exporter en PDF'}
            </button>
          </div>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }} ref={reportRef}>
        <div className="container" style={{ background: 'var(--bg-primary)' }}>
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

          {!isExporting && (
             <div className="tabs" data-html2canvas-ignore>
                <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>📊 Rapport</button>
                <button className={`tab ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>📋 Données détectées</button>
                <button className={`tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>🔍 Preuves de détection</button>
                <button className={`tab ${activeTab === 'limits' ? 'active' : ''}`} onClick={() => setActiveTab('limits')}>ℹ️ Hypothèses & Limites</button>
             </div>
          )}

          {activeTab === 'report' && (
            <div>
              {/* Executive Summary */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📝 Résumé</h3>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {report.executiveSummary}
                </p>
              </div>

              {/* Normal findings */}
              {report.normalFindings?.length > 0 && (
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
              {report.criticalFindings?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-critical)' }}>🔴 Points critiques</h3>
                  {report.criticalFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} isExporting={isExporting} />)}
                </div>
              )}

              {/* Important Findings */}
              {report.importantFindings?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-important)' }}>⚠️ Points importants</h3>
                  {report.importantFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} isExporting={isExporting} />)}
                </div>
              )}

              {/* Review Findings */}
              {report.reviewFindings?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--severity-review)' }}>🔍 À vérifier</h3>
                  {report.reviewFindings.map((f: any) => <AlertCard key={f.ruleId} alert={f} isExporting={isExporting} />)}
                </div>
              )}

              {/* Practical Advice */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>💡 Conseils pratiques</h3>
                {report.practicalAdvice?.map((a: string, i: number) => (
                  <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span>💡</span> {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fields' && parsed && (
             <div>
                <h3 style={{ marginBottom: '1rem' }}>📋 Données extraites avec niveaux de confiance</h3>
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
             </div>
          )}

          {activeTab === 'evidence' && (
             <div>
                <h3 style={{ marginBottom: '1rem' }}>🔍 Preuves de détection</h3>
                {/* Evidence loop logic */}
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  Référez-vous aux lignes indiquées dans les détails de l&apos;alerte.
                </p>
             </div>
          )}

          {activeTab === 'limits' && (
             <div>
                <h3 style={{ marginBottom: '1rem' }}>ℹ️ Hypothèses et limites</h3>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                  {report.assumptions?.map((a: string, i: number) => (
                    <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      📌 {a}
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

function AlertCard({ alert, isExporting }: { alert: any, isExporting: boolean }) {
  // During export, we force expand all alerts so the PDF covers all details
  const [expanded, setExpanded] = useState(false);
  const showDetails = expanded || isExporting;

  return (
    <div className={`card alert-card severity-${alert.severity}`}>
      <div className="alert-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge badge-${alert.severity}`}>{alert.severity === 'critical' ? '🔴' : alert.severity === 'important' ? '⚠️' : '🔍'} {alert.severity}</span>
          <span className="alert-title">{alert.title}</span>
        </div>
        {!isExporting && (
           <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary-light)', cursor: 'pointer', fontSize: '0.8rem' }}>
             {expanded ? 'Réduire ▲' : 'Détails ▼'}
           </button>
        )}
      </div>
      <div className="alert-body">{alert.shortDescription}</div>

      {showDetails && (
        <>
          {alert.detailedExplanation && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {alert.detailedExplanation}
            </div>
          )}
          {alert.sourceEvidence?.length > 0 && (
            <div className="alert-evidence">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Lignes sources :</div>
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
    </div>
  );
}

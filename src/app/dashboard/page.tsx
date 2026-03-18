'use client';

import { useEffect, useState } from 'react';

interface Scenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

interface Report {
  globalScore: number;
  globalStatus: string;
  anomaliesCount: number;
  criticalCount: number;
  importantCount: number;
  reviewCount: number;
  extractionQuality: number;
}

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/demo?action=scenarios');
        const data = await res.json();
        setScenarios(data.data || []);

        // Load reports for each scenario
        const reps: Record<string, Report> = {};
        for (const s of (data.data || [])) {
          const r = await fetch(`/api/demo?action=report&scenario=${s.id}`);
          const rd = await r.json();
          if (rd.success) reps[s.id] = rd.data;
        }
        setReports(reps);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalDocs = scenarios.length;
  const avgScore = Object.values(reports).reduce((a, r) => a + r.globalScore, 0) / (Object.keys(reports).length || 1);
  const totalCritical = Object.values(reports).reduce((a, r) => a + r.criticalCount, 0);

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Tableau de bord</h1>
          <p>Vue d&apos;ensemble de vos analyses de bulletins de paie</p>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }}>
        <div className="container">
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totalDocs}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Documents analysés</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: avgScore >= 70 ? 'var(--accent-green)' : avgScore >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                {loading ? '...' : Math.round(avgScore)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score moyen</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-red)' }}>{totalCritical}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Alertes critiques</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary-light)' }}>18</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Règles actives</div>
            </div>
          </div>

          {/* Scenarios */}
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>📋 Scénarios de démonstration</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Cliquez sur un scénario pour voir l&apos;analyse complète. Ces bulletins fictifs illustrent les capacités de détection de PayGuard.
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              Chargement des analyses...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {scenarios.map(s => {
                const report = reports[s.id];
                return (
                  <a key={s.id} href={`/example?scenario=${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                          </div>
                        </div>
                        {report && (
                          <div className={`badge badge-${report.globalStatus}`}>
                            {report.globalScore}/100
                          </div>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        {s.description}
                      </p>
                      <div className="scenario-tags">
                        {s.tags.map(t => (
                          <span key={t} className="scenario-tag">{t}</span>
                        ))}
                      </div>
                      {report && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          {report.criticalCount > 0 && <span className="badge badge-critical">🔴 {report.criticalCount} critique(s)</span>}
                          {report.importantCount > 0 && <span className="badge badge-important">⚠️ {report.importantCount} important(s)</span>}
                          {report.reviewCount > 0 && <span className="badge badge-review">🔍 {report.reviewCount} à vérifier</span>}
                        </div>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Comparison CTA */}
          <div className="card" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center', background: 'var(--gradient-card)', border: '1px solid var(--border-accent)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>📊 Comparaison multi-bulletins</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Comparez une série de 4 bulletins et identifiez les variations anormales mois par mois.
            </p>
            <a href="/comparison" className="btn-primary">Voir la comparaison</a>
          </div>
        </div>
      </section>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Sparkline from '../components/Sparkline';

export default function ComparisonPage() {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/comparison');
        const data = await res.json();
        if (data.success) setComparison(data.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="container">
            <h1>Comparaison en cours...</h1>
            <p>Analyse multi-bulletins</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          Chargement de la comparaison...
        </div>
      </>
    );
  }

  if (!comparison) {
    return (
      <div className="page-header">
        <div className="container">
          <h1>Erreur</h1>
          <p>Impossible de charger la comparaison.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Retour</a>
            <h1>📊 Comparaison multi-bulletins</h1>
          </div>
          <p style={{ marginTop: '0.5rem' }}>Série de 4 bulletins — Détection des variations et tendances</p>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }}>
        <div className="container">
          {/* Overall trend */}
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>📈 Tendance globale</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{comparison.overallTrend}</p>
          </div>

          {/* Highlights */}
          {comparison.highlights?.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(251, 191, 36, 0.04)', borderColor: 'rgba(251, 191, 36, 0.15)' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-orange)' }}>⚠️ Points d&apos;attention</h3>
              {comparison.highlights.map((h: string, i: number) => (
                <div key={i} style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  ⚠️ {h}
                </div>
              ))}
            </div>
          )}

          {/* Comparison Table */}
          <div className="card" style={{ padding: '1.5rem', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>📋 Tableau de comparaison</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Champ</th>
                  {comparison.periods?.map((p: string, i: number) => (
                    <th key={i}>{p ? (p.length > 25 ? p.substring(0, 25) + '...' : p) : `Mois ${i+1}`}</th>
                  ))}
                  <th>Variation</th>
                  <th>Tendance</th>
                  <th>Évolution</th>
                </tr>
              </thead>
              <tbody>
                {comparison.fields?.map((f: any) => {
                  const trendClass = f.trend === 'increasing' ? 'trend-up' : f.trend === 'decreasing' ? 'trend-down' : f.trend === 'stable' ? 'trend-stable' : 'trend-volatile';
                  const trendIcon = f.trend === 'increasing' ? '📈' : f.trend === 'decreasing' ? '📉' : f.trend === 'stable' ? '➡️' : '📊';
                  const sparkValues = f.values?.map((v: any) => v.value) || [];
                  const sparkColor = f.isAnomaly ? '#f59e0b' : f.trend === 'decreasing' ? '#ef4444' : f.trend === 'increasing' ? '#22c55e' : '#6366f1';

                  return (
                    <tr key={f.fieldName}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{f.fieldLabel}</div>
                        {f.isAnomaly && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <span className={`badge ${f.anomalyType === 'probable_anomaly' ? 'badge-red' : 'badge-orange'}`}>
                              {f.anomalyType === 'probable_anomaly' ? '🔴 Anomalie probable' : '⚠️ À vérifier'}
                            </span>
                          </div>
                        )}
                      </td>
                      {f.values?.map((v: any, i: number) => (
                        <td key={i} className={`value-cell ${f.isAnomaly && i === f.values.length - 1 ? 'anomaly-cell' : ''}`}>
                          {v.value !== null ? (
                            typeof v.value === 'number' ? v.value.toFixed(2) : v.value
                          ) : '—'}
                        </td>
                      ))}
                      <td className={`value-cell ${f.isAnomaly ? 'anomaly-cell' : ''}`}>
                        {f.variationPercent !== null
                          ? `${f.variationPercent > 0 ? '+' : ''}${f.variationPercent.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className={trendClass}>
                        {trendIcon} {f.trend === 'stable' ? 'Stable' : f.trend === 'increasing' ? 'Hausse' : f.trend === 'decreasing' ? 'Baisse' : 'Variable'}
                      </td>
                      <td>
                        <Sparkline values={sparkValues} width={120} height={36} color={sparkColor} showDots={true} showArea={true} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Per-field comments */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>💬 Commentaires automatiques</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {comparison.fields?.filter((f: any) => f.autoComment && f.autoComment !== 'Données insuffisantes pour commenter.').map((f: any) => (
                <div key={f.fieldName} className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>{f.fieldLabel}</div>
                  <div style={{ color: f.isAnomaly ? 'var(--accent-orange)' : 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {f.autoComment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reassurance */}
          <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(52, 211, 153, 0.04)', borderColor: 'rgba(52, 211, 153, 0.15)' }}>
            <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>🛡️ Ce que cette comparaison vous montre</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7 }}>
              PayGuard compare automatiquement vos bulletins mois par mois pour identifier les variations inhabituelles.
              Une variation signalée n&apos;est pas nécessairement une erreur : elle peut résulter d&apos;un changement légitime
              (heures supplémentaires, prime, absence, augmentation). L&apos;objectif est de vous aider à comprendre l&apos;évolution
              de votre rémunération et à poser les bonnes questions si nécessaire.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

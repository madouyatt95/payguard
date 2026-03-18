'use client';

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-badge">
            🇫🇷 Spécialisé bulletins de paie français
          </div>
          <h1>
            Comprenez votre bulletin de paie,<br />
            <span className="gradient-text">détectez les anomalies</span>
          </h1>
          <p className="hero-subtitle">
            PayGuard analyse automatiquement vos fiches de paie françaises,
            détecte les incohérences potentielles et vous explique chaque point
            de manière claire et pédagogique. Sans jargon, sans faux positifs.
          </p>
          <div className="hero-actions">
            <a href="/dashboard" className="btn-primary">
              🔍 Analyser un bulletin
            </a>
            <a href="/example" className="btn-secondary">
              👁️ Voir un exemple
            </a>
          </div>
        </div>
      </section>

      {/* Trust banner */}
      <section style={{ padding: '2rem 0', background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>🔒</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Données sécurisées</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>📋</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>18 règles France</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>📊</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Comparaison multi-mois</div>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>🎓</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Explications pédagogiques</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="section-title">
            <h2>Un outil complet pour vos bulletins de paie</h2>
            <p>Chaque analyse est prudente, expliquée et documentée</p>
          </div>
          <div className="features-grid">
            <div className="card feature-card">
              <div className="feature-icon">📄</div>
              <h3>Lecture intelligente</h3>
              <p>Extracteur OCR avancé capable de lire les bulletins scannés, photographiés ou PDF natifs. Chaque champ détecté est accompagné d&apos;un score de confiance.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Détection prudente</h3>
              <p>18 règles d&apos;analyse spécialisées France : SMIC, heures supplémentaires, primes, cotisations, net/brut. L&apos;outil ne conclut jamais quand il ne sait pas.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">📊</div>
              <h3>Comparaison historique</h3>
              <p>Comparez vos bulletins mois après mois. Détectez les variations anormales de salaire, les primes disparues, les changements de taux.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Score de confiance</h3>
              <p>Chaque champ extrait est évalué avec un niveau de certitude : sûr, incertain, absent, déduit. Vous savez exactement ce que l&apos;outil a pu lire.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">📝</div>
              <h3>Rapport détaillé</h3>
              <p>Rapport premium en 12 sections : résumé, alertes, données extraites, hypothèses, limites, conseils pratiques. Tout est expliqué simplement.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">⚖️</div>
              <h3>Prudence juridique</h3>
              <p>L&apos;outil distingue clairement les anomalies probables, les points à vérifier et les variations normales. Il ne remplace jamais un professionnel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-title">
            <h2>Comment ça marche ?</h2>
            <p>5 étapes, quelques secondes</p>
          </div>
          <div className="pipeline-steps">
            <div className="pipeline-step done">
              <div className="pipeline-step-icon">📤</div>
              <span className="pipeline-step-label">Import du<br/>document</span>
            </div>
            <div className="pipeline-step done">
              <div className="pipeline-step-icon">📖</div>
              <span className="pipeline-step-label">Lecture<br/>OCR</span>
            </div>
            <div className="pipeline-step done">
              <div className="pipeline-step-icon">🧩</div>
              <span className="pipeline-step-label">Extraction<br/>des champs</span>
            </div>
            <div className="pipeline-step done">
              <div className="pipeline-step-icon">🔎</div>
              <span className="pipeline-step-label">Vérification<br/>des règles</span>
            </div>
            <div className="pipeline-step done">
              <div className="pipeline-step-icon">📊</div>
              <span className="pipeline-step-label">Rapport<br/>détaillé</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            Prêt à vérifier votre bulletin ?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Essayez gratuitement avec un exemple de bulletin, ou importez le vôtre pour une analyse complète.
          </p>
          <div className="hero-actions">
            <a href="/dashboard" className="btn-primary">🚀 Commencer l&apos;analyse</a>
            <a href="/example" className="btn-secondary">📋 Voir la démo</a>
          </div>
        </div>
      </section>
    </>
  );
}

'use client';

export default function PricingPage() {
  return (
    <>
      <div className="page-header">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1>Tarifs PayGuard</h1>
          <p>Choisissez la formule adaptée à vos besoins</p>
        </div>
      </div>

      <section style={{ padding: '3rem 0' }}>
        <div className="container">
          <div className="pricing-grid">
            {/* Free */}
            <div className="card pricing-card">
              <h3>Gratuit</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Découverte</div>
              <div className="pricing-price">
                <span className="currency">0 </span>€
                <span className="period"> /mois</span>
              </div>
              <ul className="pricing-features">
                <li>3 analyses par mois</li>
                <li>Rapport simplifié</li>
                <li>Score de confiance</li>
                <li>Détection basique</li>
                <li>Exemples de démonstration</li>
              </ul>
              <a href="/dashboard" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Commencer gratuitement
              </a>
            </div>

            {/* Premium */}
            <div className="card pricing-card featured">
              <h3>Premium</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Pour les salariés exigeants</div>
              <div className="pricing-price">
                <span className="currency">9,99 </span>€
                <span className="period"> /mois</span>
              </div>
              <ul className="pricing-features">
                <li>Analyses illimitées</li>
                <li>Rapport premium complet (12 sections)</li>
                <li>Comparaison multi-bulletins</li>
                <li>Historique complet</li>
                <li>Preuves de détection</li>
                <li>Alertes personnalisables</li>
                <li>Seuils configurables</li>
                <li>Export PDF</li>
                <li>Support prioritaire</li>
              </ul>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Bientôt disponible
              </button>
            </div>

            {/* Unit */}
            <div className="card pricing-card">
              <h3>À l&apos;unité</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Analyse ponctuelle</div>
              <div className="pricing-price">
                <span className="currency">2,99 </span>€
                <span className="period"> par analyse</span>
              </div>
              <ul className="pricing-features">
                <li>1 analyse approfondie</li>
                <li>Rapport premium complet</li>
                <li>Preuves de détection</li>
                <li>Comparaison si historique</li>
                <li>Sans engagement</li>
              </ul>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Bientôt disponible
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '4rem', maxWidth: '700px', margin: '4rem auto 0' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Questions fréquentes</h2>

            <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>PayGuard remplace-t-il un comptable ?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Non. PayGuard est un outil d&apos;aide à la lecture. Il vous aide à identifier des points méritant attention, mais ne remplace en aucun cas les conseils d&apos;un professionnel de la paie, d&apos;un comptable ou d&apos;un avocat.
              </p>
            </div>

            <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Mes données sont-elles sécurisées ?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Vos bulletins de paie contiennent des données sensibles. PayGuard chiffre les données, vérifie l&apos;accès par utilisateur, et permet la suppression de vos documents à tout moment.
              </p>
            </div>

            <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Comment fonctionne la détection ?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                PayGuard utilise 18 règles d&apos;analyse basées sur la réglementation française. Chaque alerte est accompagnée d&apos;un niveau de confiance, d&apos;une explication détaillée et de la preuve de détection (lignes sources). L&apos;outil ne conclut jamais quand il ne peut pas.
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Puis-je supprimer mes données ?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Oui. Vous pouvez supprimer n&apos;importe quel document à tout moment. La suppression est définitive et inclut toutes les données associées (extraction, analyse, rapport).
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

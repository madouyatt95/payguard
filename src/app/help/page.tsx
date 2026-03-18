'use client';

export default function HelpPage() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Centre d&apos;aide</h1>
          <p>Tout comprendre sur PayGuard et vos bulletins de paie</p>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          {/* How to read the report */}
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>📊 Comment lire le rapport PayGuard ?</h2>

            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>1. Le score global</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.7 }}>
              Le score global (0 à 100) reflète la cohérence générale de votre bulletin. Il prend en compte la qualité de la lecture, le nombre de champs détectés et la sévérité des alertes. Un score élevé signifie que les vérifications automatiques n&apos;ont rien détecté d&apos;inhabituel.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-green">✅ 70-100 : RAS</span>
              <span className="badge badge-orange">⚠️ 40-69 : Points d&apos;attention</span>
              <span className="badge badge-red">🔴 0-39 : Vérification recommandée</span>
            </div>

            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>2. Les niveaux d&apos;alerte</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-critical">🔴 Critique</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Anomalie potentiellement grave, vérification recommandée</span>
              </div>
              <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-important">⚠️ Important</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Point notable qui mérite votre attention</span>
              </div>
              <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-review">🔍 À vérifier</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Point à vérifier mais pas nécessairement anormal</span>
              </div>
              <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-info">ℹ️ Info</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Simple information, pas d&apos;action requise</span>
              </div>
            </div>

            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>3. La confiance de lecture</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.7 }}>
              Chaque champ extrait est accompagné d&apos;un indicateur de confiance :
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span className="confidence-dot confidence-high"></span> <strong>Sûr</strong> — La lecture est fiable (confiance &gt; 85%)
              </div>
              <div style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span className="confidence-dot confidence-medium"></span> <strong>Incertain</strong> — Valeur probable mais à vérifier (60-85%)
              </div>
              <div style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span className="confidence-dot confidence-low"></span> <strong>Peu fiable</strong> — Valeur potentiellement erronée (30-60%)
              </div>
              <div style={{ padding: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span className="confidence-dot confidence-absent"></span> <strong>Absent/Déduit</strong> — Non trouvé ou calculé par déduction
              </div>
            </div>

            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>4. Les preuves de détection</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Pour chaque alerte, PayGuard affiche les lignes du bulletin utilisées pour la détection. Cela vous permet de vérifier vous-même si le signalement est pertinent en confrontant les résultats avec votre document original.
            </p>
          </div>

          {/* Tips for better scans */}
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>📸 Conseils pour un meilleur scan</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.7 }}>
              La qualité de l&apos;analyse dépend directement de la qualité du document fourni. Voici quelques conseils :
            </p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 2.2, paddingLeft: '1.5rem' }}>
              <li><strong>Privilégiez les PDF natifs</strong> — Les bulletins reçus par email en PDF offrent la meilleure qualité</li>
              <li><strong>Si vous scannez</strong> — Utilisez une résolution d&apos;au moins 300 DPI</li>
              <li><strong>Évitez les photos</strong> — Les photos de bulletin sont souvent floues et mal cadrées</li>
              <li><strong>Document complet</strong> — Assurez-vous que toutes les pages sont présentes</li>
              <li><strong>Pas de pliures</strong> — Les pliures masquent des informations</li>
              <li><strong>Bonne luminosité</strong> — Évitez les ombres et reflets</li>
              <li><strong>Format A4</strong> — Scannez en format A4 standard</li>
            </ul>
          </div>

          {/* What PayGuard checks */}
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>🔍 Que vérifie PayGuard ?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '📄', title: 'Intégrité du document', desc: 'Complétude, zones illisibles, doublons, pages manquantes' },
                { icon: '📋', title: 'Mentions obligatoires', desc: 'Identité, SIRET, convention collective, période de paie' },
                { icon: '💰', title: 'Salaire de base', desc: 'Cohérence heures/salaire, taux horaire, base salariale' },
                { icon: '⏰', title: 'Heures supplémentaires', desc: 'Majoration, taux, valorisation, récurrence' },
                { icon: '📊', title: 'SMIC', desc: 'Cohérence minimale avec le SMIC horaire brut' },
                { icon: '🎁', title: 'Primes & indemnités', desc: 'Disparition, baisse significative, variation' },
                { icon: '🏖️', title: 'Congés & absences', desc: 'Impact visible, cohérence heures/jours' },
                { icon: '📑', title: 'Cotisations & totaux', desc: 'Net/brut, ratio, net imposable, PAS' },
                { icon: '📈', title: 'Historique', desc: 'Variation nette/brut, tendances, alertes répétées' },
              ].map(item => (
                <div key={item.title} style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal notice */}
          <div className="card" style={{ padding: '2rem', background: 'rgba(251, 191, 36, 0.04)', borderColor: 'rgba(251, 191, 36, 0.15)' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-orange)' }}>⚖️ Mentions légales</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              PayGuard est un outil d&apos;aide à la lecture et à la détection d&apos;anomalies potentielles sur les bulletins de paie français.
              Il ne constitue en aucun cas un conseil juridique, comptable ou un avis professionnel sur la paie.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, marginTop: '0.75rem' }}>
              Les résultats de l&apos;analyse sont indicatifs et dépendent de la qualité du document fourni.
              Quand l&apos;outil ne sait pas conclure, il le signale explicitement avec les mentions &quot;à vérifier&quot;, &quot;non concluant&quot; ou &quot;lecture partielle&quot;.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, marginTop: '0.75rem' }}>
              En cas de doute sur votre bulletin de paie, contactez votre service RH, un syndicat, l&apos;inspection du travail ou un avocat en droit du travail.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

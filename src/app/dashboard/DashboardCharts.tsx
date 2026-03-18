'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface ChartData {
  month: string;
  gross: number;
  net: number;
  score: number;
}

interface ContributionData {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  stats: {
    totalDocs: number;
    avgScore: number;
    totalCritical: number;
    activeRules: number;
  }
  salaryHistory: ChartData[];
  latestContributions: ContributionData[];
}

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#AF19FF'];

export default function DashboardCharts({ stats, salaryHistory, latestContributions }: DashboardChartsProps) {
  return (
    <div className="container">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.totalDocs}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Documents analysés</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.avgScore >= 70 ? 'var(--accent-green)' : stats.avgScore >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
            {Math.round(stats.avgScore)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score moyen de conformité</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-red)' }}>{stats.totalCritical}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Alertes critiques</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary-light)' }}>{stats.activeRules}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Règles actives</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Salary Evolution Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>📈 Évolution Salaire Brut vs Net</h3>
          {salaryHistory.length > 0 ? (
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={salaryHistory} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={value => `${value}€`} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'var(--bg-secondary)'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="gross" name="Salaire Brut" fill="var(--accent-primary-light)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Salaire Net à Payer" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Aucune donnée de salaire extraite.
            </div>
          )}
        </div>

        {/* Contributions Pie Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>🍕 Caisse des cotisations (Dernier bulletin)</h3>
          {latestContributions.length > 0 ? (
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={latestContributions}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    stroke="none"
                  >
                    {latestContributions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `${Number(value || 0).toFixed(2)}€`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Aucune donnée de cotisation trouvée.
            </div>
          )}
        </div>
      </div>
      
      {/* Action shortcuts */}
      <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'var(--gradient-card)', border: '1px solid var(--border-accent)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>🚀 Prêt pour la prochaine analyse ?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Glissez-déposez le PDF de votre fiche de paie du mois pour détecter d'éventuelles anomalies.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/upload" className="btn-primary">📤 Nouvelle analyse</a>
          <a href="/comparison" className="btn-secondary">📊 Comparer les mois</a>
        </div>
      </div>
    </div>
  );
}

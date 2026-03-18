import { getAllDocuments } from '@/server/services/db/service';
import DashboardCharts from './DashboardCharts';
import { StructuredPayrollDocument, AnalysisReport } from '@/server/types';

// Next.js App Router Server Component
export default async function DashboardPage() {
  // 1. Fetch live user documents securely
  const docs = await getAllDocuments();
  
  // Filter for docs that have been fully analyzed
  const analyzedDocs = docs.filter(d => d.status === 'done' && d.parsedData && d.reportData);
  
  // 2. Compute Top-Level Stats
  const totalDocs = analyzedDocs.length;
  let totalScore = 0;
  let totalCritical = 0;
  
  const parsedDocs: { doc: any, parsed: StructuredPayrollDocument, report: AnalysisReport }[] = [];
  
  for (const d of analyzedDocs) {
    try {
      const parsed = JSON.parse(d.parsedData!) as StructuredPayrollDocument;
      const report = JSON.parse(d.reportData!) as AnalysisReport;
      parsedDocs.push({ doc: d, parsed, report });
      totalScore += report.globalScore;
      totalCritical += report.criticalCount;
    } catch (e) {
      // ignore parse errors
    }
  }
  
  const avgScore = totalDocs > 0 ? totalScore / totalDocs : 0;
  
  // 3. Build Chart Data (Salary History)
  // Sort docs from oldest to newest for the timeline
  const sortedDocs = [...parsedDocs].sort((a, b) => 
    new Date(a.doc.createdAt).getTime() - new Date(b.doc.createdAt).getTime()
  );
  
  const salaryHistory = sortedDocs.map((item, idx) => {
    // If there is a period defined in the payslip, use it, otherwise use month index
    const periodName = item.parsed.payPeriod?.month?.value || `Doc ${idx + 1}`;
    return {
      month: periodName,
      gross: item.parsed.grossSalary?.value || 0,
      net: item.parsed.netToPay?.value || 0,
      score: item.report.globalScore
    };
  });
  
  // 4. Build Pie Chart Data (Contributions breakdown of the most recent doc)
  const latestContributions = [];
  if (sortedDocs.length > 0) {
    const latest = sortedDocs[sortedDocs.length - 1];
    
    // Group contributions into high-level categories for a clean pie chart
    let csg = 0;
    let retraite = 0;
    let sante = 0;
    let chomage = 0;
    let autres = 0;
    
    // We sum the employee contributions per category
    for (const c of latest.parsed.socialContributions || []) {
      const name = c.label.toLowerCase();
      const amount = c.employeeAmount || 0;
      if (name.includes('csg') || name.includes('crds')) csg += amount;
      else if (name.includes('retraite') || name.includes('vieillesse') || name.includes('agirc') || name.includes('arrco')) retraite += amount;
      else if (name.includes('maladie') || name.includes('santé') || name.includes('mutuelle') || name.includes('prévoyance')) sante += amount;
      else if (name.includes('chômage') || name.includes('assedic')) chomage += amount;
      else autres += amount;
    }
    
    if (csg > 0) latestContributions.push({ name: 'CSG/CRDS', value: csg });
    if (retraite > 0) latestContributions.push({ name: 'Retraite', value: retraite });
    if (sante > 0) latestContributions.push({ name: 'Santé & Prév.', value: sante });
    if (chomage > 0) latestContributions.push({ name: 'Chômage', value: chomage });
    if (autres > 0) latestContributions.push({ name: 'Autres', value: autres });
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>Tableau de bord</h1>
          <p>Vue d&apos;ensemble de vos analyses et de l&apos;évolution de vos revenus</p>
        </div>
      </div>

      <section style={{ padding: '2rem 0' }}>
        <DashboardCharts 
          stats={{
            totalDocs,
            avgScore,
            totalCritical,
            activeRules: 18 // Demo logic, technically we have 18 rule definitions inside RuleEngine
          }}
          salaryHistory={salaryHistory}
          latestContributions={latestContributions}
        />
      </section>
    </>
  );
}

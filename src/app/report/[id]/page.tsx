import { getDocument } from '@/server/services/db/service';
import ReportView from './ReportView';
import { notFound } from 'next/navigation';

export default async function ReportPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  // Retrieve the document securely.
  // DatabaseService.getDocument automatically applies the user_id RLS if configured correctly,
  // meaning this will return null if the document belongs to someone else or doesn't exist.
  const doc = await getDocument(id);

  if (!doc) {
    return notFound();
  }

  if (doc.status !== 'done' || !doc.reportData || !doc.parsedData) {
    return (
      <div className="page-header">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <h1>Analyse en cours...</h1>
          <p>Le document est encore en traitement ({doc.status}). Veuillez rafraîchir la page dans quelques instants.</p>
        </div>
      </div>
    );
  }

  let report;
  let parsed;

  try {
    report = JSON.parse(doc.reportData);
    parsed = JSON.parse(doc.parsedData);
  } catch (e) {
    return (
      <div className="page-header">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <h1>Erreur de lecture</h1>
          <p>Impossible de lire le rapport généré pour ce document.</p>
        </div>
      </div>
    );
  }

  return <ReportView report={report} parsed={parsed} documentId={doc.id} />;
}

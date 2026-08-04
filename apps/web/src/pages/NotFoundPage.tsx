import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="container page-main">
      <p className="page-eyebrow">Erreur 404</p>
      <h1 className="page-title">Page introuvable</h1>
      <p className="page-subtitle">Cette ressource ou cette page n&apos;existe pas.</p>
      <Link to="/" className="btn btn-primary">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

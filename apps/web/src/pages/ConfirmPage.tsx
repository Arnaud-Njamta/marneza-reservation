import { Link, useParams } from 'react-router-dom';
import { ConfirmClient } from '@/components/booking/ConfirmClient';

export function ConfirmPage() {
  const { slug = '', id = '' } = useParams<{ slug: string; id: string }>();

  return (
    <main className="container page-main">
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to={`/book/${slug}`} style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)' }}>
          ← Modifier
        </Link>
      </p>
      <p className="page-eyebrow">Confirmation</p>
      <h1 className="page-title">Votre réservation</h1>
      <ConfirmClient bookingId={id} />
    </main>
  );
}

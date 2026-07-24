import { Suspense } from 'react';
import { ConfirmClient } from '@/components/booking/ConfirmClient';
import Link from 'next/link';

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function ConfirmPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <main className="container page-main">
      <p style={{ marginBottom: '0.5rem' }}>
        <Link href={`/book/${slug}`} style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)' }}>
          ← Modifier
        </Link>
      </p>
      <p className="page-eyebrow">Confirmation</p>
      <h1 className="page-title">Votre réservation</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <ConfirmClient slug={slug} bookingId={id} />
      </Suspense>
    </main>
  );
}

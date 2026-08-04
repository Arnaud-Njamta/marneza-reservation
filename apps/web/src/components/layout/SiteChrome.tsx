import { useLocation } from 'react-router-dom';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

type Props = { children: React.ReactNode };

/** Header/footer vitrine — masqués sur /admin/* */
export function SiteChrome({ children }: Props) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}

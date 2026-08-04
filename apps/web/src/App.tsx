import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { AdminShell } from '@/layouts/AdminShell';
import { HomePage } from '@/pages/HomePage';
import { BookPage } from '@/pages/BookPage';
import { ConfirmPage } from '@/pages/ConfirmPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminPage } from '@/pages/admin/AdminPage';
import { AdminCalendarPage } from '@/pages/admin/AdminCalendarPage';
import { AdminPricingPage } from '@/pages/admin/AdminPricingPage';
import { AdminTermsPage } from '@/pages/admin/AdminTermsPage';
import { AdminAccountPage } from '@/pages/admin/AdminAccountPage';

export function App() {
  return (
    <SiteChrome>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book/:slug" element={<BookPage />} />
        <Route path="/book/:slug/confirm/:id" element={<ConfirmPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route path="pricing" element={<AdminPricingPage />} />
          <Route path="terms" element={<AdminTermsPage />} />
          <Route path="account" element={<AdminAccountPage />} />
        </Route>
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteChrome>
  );
}

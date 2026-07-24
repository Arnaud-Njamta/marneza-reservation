'use client';

import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminRefreshProvider } from '@/components/admin/AdminRefreshContext';
import { AdminToolbar } from '@/components/admin/AdminToolbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <AdminRefreshProvider>
        <AdminToolbar />
        {children}
      </AdminRefreshProvider>
    </AdminAuthGate>
  );
}

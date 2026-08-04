import { Outlet } from 'react-router-dom';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminRefreshProvider } from '@/components/admin/AdminRefreshContext';
import { AdminToolbar } from '@/components/admin/AdminToolbar';

export function AdminShell() {
  return (
    <AdminAuthGate>
      <AdminRefreshProvider>
        <AdminToolbar />
        <Outlet />
      </AdminRefreshProvider>
    </AdminAuthGate>
  );
}

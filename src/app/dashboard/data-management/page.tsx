'use client';

import { DataManagementClient } from '@/components/data-management-client';

// Force dynamic rendering to avoid static generation issues with SessionProvider
export const dynamic = 'force-dynamic';

export default function DataManagementPage() {
  return <DataManagementClient />;
}
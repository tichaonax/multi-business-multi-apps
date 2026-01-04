'use client';


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { DataManagementClient } from '@/components/data-management-client';

export default function AdminDataManagementPage() {
  return <DataManagementClient />;
}
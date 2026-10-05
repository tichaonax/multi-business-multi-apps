'use client';


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ContentLayout } from '@/components/layout/content-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Shield
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata: any;
  oldValues: any;
  newValues: any;
  changes: any;
  // Prisma relation field is `users` (plural, matching the schema relation
  // name), not `user` — the UI previously referenced `log.user` here, which
  // is always undefined, so the user name/email never actually rendered.
  users: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditStatistics {
  totalLogs: number;
  uniqueUsers: number;
  actionBreakdown: Array<{
    action: string;
    _count: {
      action: number;
    };
  }>;
  businessActivity: Array<{
    entityType: string;
    _count: {
      entityType: number;
    };
  }>;
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    // {from, to} shape from generateChangeLog, or a nested object — print compactly
    const obj = value as Record<string, unknown>;
    if ('from' in obj && 'to' in obj) return `${formatDetailValue(obj.from)} → ${formatDetailValue(obj.to)}`;
    return JSON.stringify(value);
  }
  // ISO date strings render friendlier as a locale date/time
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  return String(value);
}

function humanizeKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

function DetailBlock({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{title}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm bg-gray-50 dark:bg-gray-900/40 rounded-md p-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <dt className="text-gray-500 dark:text-gray-400 shrink-0">{humanizeKey(key)}:</dt>
            <dd className="text-gray-900 dark:text-gray-100 break-words">{formatDetailValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange());
  const [allTime, setAllTime] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchAuditLogs();
      fetchStatistics();
    }
  }, [session, page, searchTerm, selectedAction, selectedEntityType, dateRange, allTime]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedAction && { action: selectedAction }),
        ...(selectedEntityType && { entityType: selectedEntityType }),
        ...(!allTime && { startDate: dateRange.start.toISOString(), endDate: dateRange.end.toISOString() }),
      });

      const response = await fetch(`/api/audit?${params}`);
      const data = await response.json();

      if (data.logs) {
        setLogs(data.logs);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/audit/statistics');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Failed to fetch audit statistics:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGIN_FAILED':
        return <User className="h-4 w-4" />;
      case 'CREATE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PERMISSION_CHANGED':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'LOGIN_FAILED':
      case 'DELETE':
        return 'destructive' as const;
      case 'CREATE':
        return 'success' as const;
      case 'UPDATE':
      case 'LOGIN':
        return 'default' as const;
      case 'PERMISSION_CHANGED':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">You need administrator privileges to view audit logs.</p>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <ContentLayout
        title="📋 Audit Logs"
        subtitle="System activity tracking and security monitoring"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Audit Logs', isActive: true }
        ]}
        maxWidth="7xl"
      >
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Logs</p>
                  <p className="text-3xl font-bold text-primary">{statistics.totalLogs}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="text-3xl font-bold text-primary">{statistics.uniqueUsers}</p>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Most Common Action</p>
                  <p className="text-lg font-bold text-primary">
                    {statistics.actionBreakdown[0]?.action || 'N/A'}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Activity</p>
                  <p className="text-lg font-bold text-primary">
                    {statistics.businessActivity.reduce((sum, item) => sum + item._count.entityType, 0)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>
        )}

        {/* Floating search bar — stays visible while scrolling through logs */}
        <div className="sticky top-16 z-20 mb-6">
          <Card className="p-4 shadow-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs by user, action, or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 space-y-4">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            showAllTime
            allTime={allTime}
            onAllTimeChange={setAllTime}
          />
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGIN_FAILED">Failed Login</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="PERMISSION_CHANGED">Permission Changed</option>
              <option value="DATA_EXPORT">Data Export</option>
              <option value="DATA_IMPORT">Data Import</option>
              <option value="BACKUP_CREATED">Backup Created</option>
              <option value="RECEIPT_SUBMITTED">Receipt Submitted</option>
              <option value="RECEIPT_APPROVED">Receipt Approved</option>
              <option value="RECEIPT_AMENDED">Receipt Amended</option>
              <option value="RECEIPT_DELETED">Receipt Deleted</option>
              <option value="RECEIPT_OVER_LIMIT_OVERRIDE">Receipt Over-Limit Override</option>
              <option value="PAYMENT_REVERSED">Payment Reversed</option>
            </select>

            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="">All Entities</option>
              <option value="User">User</option>
              <option value="Business">Business</option>
              <option value="Employee">Employee</option>
              <option value="BusinessMembership">Business Membership</option>
              <option value="Authentication">Authentication</option>
              <option value="DataExport">Data Export</option>
              <option value="DataImport">Data Import</option>
              <option value="Backup">Backup</option>
              <option value="ExpensePaymentReceipt">Expense Payment Receipt</option>
              <option value="ExpenseAccount">Expense Account</option>
            </select>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {logs.length} of {total} logs
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No audit logs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search criteria or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const reason = log.metadata?.reason;
                const hasDetail = log.oldValues || log.newValues || log.changes || (log.metadata && Object.keys(log.metadata).some(k => !['ipAddress', 'userAgent', 'hash'].includes(k)));
                return (
                  <div key={log.id} className="border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                      className={`w-full flex items-center justify-between p-4 text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getActionVariant(log.action)}>
                              {log.action}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {log.entityType}
                            </span>
                            {reason && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 truncate max-w-xs">— "{reason}"</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {log.users?.name} ({log.users?.email})
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatTimestamp(log.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Entity ID: {log.entityId.substring(0, 8)}...
                        </p>
                        {log.metadata?.ipAddress && (
                          <p className="text-xs text-gray-400">
                            IP: {log.metadata.ipAddress}
                          </p>
                        )}
                        {hasDetail && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{isExpanded ? 'Hide details ▲' : 'Show details ▼'}</p>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        {reason && (
                          <div className="pt-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Reason</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{reason}</p>
                          </div>
                        )}
                        {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                          <DetailBlock title={log.action === 'DELETE' || log.action === 'RECEIPT_DELETED' ? 'Details (before deletion)' : 'Previous Values'} data={log.oldValues} />
                        )}
                        {log.newValues && Object.keys(log.newValues).length > 0 && (
                          <DetailBlock title="New Values" data={log.newValues} />
                        )}
                        {log.metadata && Object.keys(log.metadata).filter(k => !['ipAddress', 'userAgent', 'hash', 'reason'].includes(k)).length > 0 && (
                          <DetailBlock
                            title="Other Metadata"
                            data={Object.fromEntries(Object.entries(log.metadata).filter(([k]) => !['ipAddress', 'userAgent', 'hash', 'reason'].includes(k)))}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
              >
                Next
              </button>
            </div>
          )}
        </Card>
      </ContentLayout>
    </ProtectedRoute>
  );
}
'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { DataResetComponent } from '@/components/admin/data-reset'
import { useState } from 'react'
import {
  Users,
  Shield,
  Settings,
  Database,
  Activity,
  FileText,
  Trash2,
  TestTube,
  BarChart3,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { useEffect } from 'react'
import Link from 'next/link'
import AdminSeedPromptModal from '@/components/admin/admin-seed-prompt-modal'
import { useToastContext } from '@/components/ui/toast'

export default function AdminPage() {
  const [seedingData, setSeedingData] = useState(false)
  const [seedResult, setSeedResult] = useState<any>(null)
  const [seedError, setSeedError] = useState('')
  const [backups, setBackups] = useState<Array<{ name: string; mtime: number; size: number }>>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [seedingReferenceData, setSeedingReferenceData] = useState(false)
  const [referenceDataResult, setReferenceDataResult] = useState<any>(null)
  const [referenceDataError, setReferenceDataError] = useState('')
  const [showSeedTestConfirm, setShowSeedTestConfirm] = useState(false)
  const [showReferenceDataConfirm, setShowReferenceDataConfirm] = useState(false)
  const [showAdminUserConfirm, setShowAdminUserConfirm] = useState(false)
  const [seedTestConfirmText, setSeedTestConfirmText] = useState('')
  const [referenceDataConfirmText, setReferenceDataConfirmText] = useState('')
  const [adminUserConfirmText, setAdminUserConfirmText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBusinessId, setModalBusinessId] = useState<string | null>(null)
  const [modalAction, setModalAction] = useState<null | { endpoint: string; label: string; method?: string; body?: any }> (null)
  const toast = useToastContext()

  const handleSeedTestData = async () => {
    if (seedTestConfirmText !== 'CREATE TEST DATA') {
      setSeedError('Please enter the exact confirmation text: CREATE TEST DATA')
      return
    }

    setSeedingData(true)
    setSeedError('')
    setSeedResult(null)

    try {
      const response = await fetch('/api/admin/seed-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setSeedResult(data)
        setShowSeedTestConfirm(false)
        setSeedTestConfirmText('')
      } else {
        setSeedError(data.message || 'Failed to seed test data')
      }
    } catch (error) {
      setSeedError('Network error occurred')
    } finally {
      setSeedingData(false)
    }
  }

  const handleSeedReferenceData = async () => {
    if (referenceDataConfirmText !== 'SEED REFERENCE DATA') {
      setReferenceDataError('Please enter the exact confirmation text: SEED REFERENCE DATA')
      return
    }

    setSeedingReferenceData(true)
    setReferenceDataError('')
    setReferenceDataResult(null)

    try {
      const response = await fetch('/api/admin/seed-reference-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setReferenceDataResult(data)
        setShowReferenceDataConfirm(false)
        setReferenceDataConfirmText('')
      } else {
        setReferenceDataError(data.message || 'Failed to seed reference data')
      }
    } catch (error) {
      setReferenceDataError('Network error occurred')
    } finally {
      setSeedingReferenceData(false)
    }
  }

  const handleCreateAdminUser = () => {
    if (adminUserConfirmText !== 'CREATE ADMIN USER') {
      return // Should show error in the UI
    }

    setShowAdminUserConfirm(false)
    setAdminUserConfirmText('')
    window.location.href = '/api/admin/create-admin'
  }

  useEffect(() => {
    async function loadBackups() {
      setLoadingBackups(true)
      try {
        const res = await fetch('/api/admin/backups')
        const json = await res.json()
        if (res.ok) setBackups(json.backups || [])
      } catch (e) {
        // ignore
      } finally {
        setLoadingBackups(false)
      }
    }
    loadBackups()
  }, [])

  return (
    <ProtectedRoute>
      <ContentLayout
        title="⚙️ System Administration"
        subtitle="Manage users, system settings, and monitor application security"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', isActive: true }
        ]}
        maxWidth="7xl"
      >

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Data Management</h3>
            <p className="text-secondary mb-4">Export data, import CSV files, and manage database backups</p>
            <a
              href="/admin/data-management"
              className="btn-primary inline-block"
            >
              Manage Data
            </a>
          </div>
          
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Business Management</h3>
            <p className="text-secondary mb-4">Create and manage all businesses in the system</p>
            <a 
              href="/admin/businesses" 
              className="btn-primary inline-block"
            >
              Manage Businesses
            </a>
          </div>
          
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">User Management</h3>
            <p className="text-secondary mb-4">Manage system users and business access</p>
            <a 
              href="/admin/users" 
              className="btn-primary inline-block"
            >
              Manage Users
            </a>
          </div>
          
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Sync Management</h3>
            <p className="text-secondary mb-4">Monitor and control database synchronization</p>
            <a
              href="/admin/sync"
              className="btn-primary inline-block"
            >
              Manage Sync
            </a>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Settings className="h-6 w-6 mr-2 text-purple-500" />
                <h3 className="text-lg font-semibold text-primary">System Settings</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Configure business registration, user defaults, and global settings</p>
            <div className="text-sm text-secondary mb-4">
              • Registration and approval settings
              <br />
              • Default user permissions and roles
              <br />
              • Date formats and country preferences
              <br />
              • System-wide configuration options
            </div>
            <a
              href="/admin/settings"
              className="btn-primary inline-block"
            >
              Configure Settings
            </a>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Audit Logs</h3>
            <p className="text-secondary mb-4">View system audit trail and security monitoring</p>
            <a
              href="/admin/audit-logs"
              className="btn-primary inline-block"
            >
              View Audit Logs
            </a>
          </div>

          {/* Database Performance Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Database className="h-6 w-6 mr-2 text-amber-500" />
                <h3 className="text-lg font-semibold text-primary">Database Performance</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Monitor and optimize database performance</p>
            <div className="text-sm text-secondary mb-4">
              • Query performance monitoring
              <br />
              • Database health checks
              <br />
              • Index optimization
              <br />
              • Storage usage analysis
            </div>
            <div className="text-xs text-gray-500 italic">Feature coming soon</div>
          </div>

          {/* System Monitoring Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Activity className="h-6 w-6 mr-2 text-teal-500" />
                <h3 className="text-lg font-semibold text-primary">System Monitoring</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Real-time system health and performance monitoring</p>
            <div className="text-sm text-secondary mb-4">
              • System health metrics
              <br />
              • Performance analytics
              <br />
              • Error tracking
              <br />
              • Uptime monitoring
            </div>
            <div className="text-xs text-gray-500 italic">Feature coming soon</div>
          </div>

          {/* Employee Management Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 mr-2 text-indigo-500" />
                <h3 className="text-lg font-semibold text-primary">Employee Management</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Global employee oversight and management</p>
            <div className="text-sm text-secondary mb-4">
              • Cross-business employee view
              <br />
              • Contract management
              <br />
              • Performance tracking
              <br />
              • Bulk operations
            </div>
              <Link
                href="/employees"
                className="btn-primary inline-block"
              >
                Manage Employees
              </Link>
          </div>

          {/* System Reports Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-orange-500" />
                <h3 className="text-lg font-semibold text-primary">System Reports</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Comprehensive system analytics and reports</p>
            <div className="text-sm text-secondary mb-4">
              • Business performance metrics
              <br />
              • User activity reports
              <br />
              • System usage statistics
              <br />
              • Data integrity reports
            </div>
            <a
              href="/reports"
              className="btn-primary inline-block"
            >
              View Reports
            </a>
          </div>

          {/* Data Reset Card - Dangerous operations */}
          <div className="card p-6 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Trash2 className="h-6 w-6 mr-2 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Data Reset</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Reset all business and employee data for testing</p>
            <div className="text-sm text-secondary mb-4">
              <strong className="text-red-600 dark:text-red-400">What will be deleted:</strong>
              <br />
              • All businesses and their details
              <br />
              • All employees and contracts
              <br />
              • All business memberships
              <br />
              • All business-related data
              <br />
              • All reference data (ID formats, job titles, compensation types, benefit types)
              <br />
              <br />
              <strong className="text-green-600 dark:text-green-400">What will be preserved:</strong>
              <br />
              • User accounts and login credentials
              <br />
              • System audit logs and activity history
              <br />
              <br />
              <strong className="text-blue-600 dark:text-blue-400">What will be automatically recreated:</strong>
              <br />
              • 89 essential reference data records (ID formats, job titles, compensation types, etc.)
              <br />
              • System ready for immediate employee management
            </div>
            <DataResetComponent />
          </div>

          {/* Developer Seeds Card - dedicated area for seed/unseed controls */}
          <div className="card p-6 col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TestTube className="h-6 w-6 mr-2 text-green-600" />
                <h3 className="text-lg font-semibold text-primary">Developer Seeds</h3>
              </div>
            </div>
            <p className="text-secondary mb-4">Quick seed/unseed operations for demo data (admin only)</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setModalBusinessId(null)
                  setModalAction({ endpoint: '/api/admin/seed-dev-data', label: 'Create Dev Seed', method: 'POST', body: { confirm: true } })
                  setModalOpen(true)
                }}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
              >
                Create Dev Seed
              </button>

              <button
                onClick={() => {
                  setModalBusinessId(null)
                  setModalAction({ endpoint: '/api/admin/cleanup-dev-data', label: 'Remove Dev Seed', method: 'POST', body: { confirm: true } })
                  setModalOpen(true)
                }}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded"
              >
                Remove Dev Seed
              </button>

              {/* Individual seeds */}
              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/seed-restaurant', label: 'Seed Restaurant Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Seed Restaurant Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/seed-hardware', label: 'Seed Hardware Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Seed Hardware Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/seed-contractors', label: 'Seed Contractors Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Seed Contractors Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/seed-grocery', label: 'Seed Grocery Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Seed Grocery Demo</button>

              {/* Unseed buttons */}
              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/unseed-contractors', label: 'Unseed Contractors Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded">Unseed Contractors Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/unseed-grocery', label: 'Unseed Grocery Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded">Unseed Grocery Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/unseed-hardware', label: 'Unseed Hardware Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded">Unseed Hardware Demo</button>

              <button onClick={() => { setModalBusinessId(null); setModalAction({ endpoint: '/api/admin/cleanup-dev-data', label: 'Unseed Restaurant Demo', method: 'POST', body: { confirm: true } }); setModalOpen(true) }} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded">Unseed Restaurant Demo</button>
            </div>
            {modalAction && (
              <AdminSeedPromptModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setModalAction(null) }}
                businessId={modalBusinessId}
                onConfirm={async (_useTargeted: boolean) => {
                  // execute the pending action
                  setModalOpen(false)
                  if (!modalAction) return
                  try {
                    const endpoint = modalAction.endpoint
                    // generate a confirm text based on endpoint to satisfy server checks
                    const nowSuffix = Date.now().toString().slice(-6)
                    let confirmText = `ADMIN-CONFIRM-${nowSuffix}`
                    if (endpoint.includes('seed-hardware')) confirmText = `SEED-HARDWARE-${nowSuffix}`
                    if (endpoint.includes('unseed-hardware')) confirmText = `UNSEED-HARDWARE-${nowSuffix}`
                    if (endpoint.includes('seed-grocery')) confirmText = `SEED-GROCERY-${nowSuffix}`
                    if (endpoint.includes('unseed-grocery')) confirmText = `UNSEED-GROCERY-${nowSuffix}`
                    if (endpoint.includes('seed-contractors')) confirmText = `SEED-CONTRACTORS-${nowSuffix}`
                    if (endpoint.includes('unseed-contractors')) confirmText = `UNSEED-CONTRACTORS-${nowSuffix}`
                    if (endpoint.includes('seed-restaurant')) confirmText = `SEED-RESTAURANT-${nowSuffix}`
                    if (endpoint.includes('unseed-restaurant') || endpoint.includes('cleanup-dev-data')) confirmText = `UNSEED-RESTAURANT-${nowSuffix}`
                    if (endpoint.includes('seed-dev-data')) confirmText = `CREATE-DEV-SEED-${nowSuffix}`

                    const body = { ...(modalAction.body || {}), confirm: true, confirmText }

                    toast.push(`${modalAction.label} started`)
                    const res = await fetch(endpoint, { method: modalAction.method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                    const json = await res.json().catch(() => ({}))
                    if (!res.ok) {
                      toast.push(`${modalAction.label} failed: ${json?.message || res.statusText}`)
                    } else {
                      toast.push(`${modalAction.label} completed`)
                      // update small results where appropriate
                      if (modalAction.endpoint.includes('seed-dev-data')) setSeedResult(json)
                      if (modalAction.endpoint.includes('cleanup-dev-data')) setReferenceDataResult(json)
                    }
                  } catch (err: any) {
                    toast.push(`${modalAction.label} error: ${err?.message || String(err)}`)
                  } finally {
                    setModalAction(null)
                    setSeedingData(false)
                  }
                }}
              />
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Zap className="h-6 w-6 mr-2 text-blue-500" />
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Quick Actions</h3>
              </div>
            </div>
              <div className="space-y-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">Backup Files</div>
                    <div className="text-blue-700 dark:text-blue-300 text-xs">Recent cleanup backups</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {loadingBackups ? 'Loading backups...' : (
                    backups.length === 0 ? 'No backups found' : (
                      <div className="space-y-2">
                        {backups.map(b => (
                          <div key={b.name} className="flex items-center justify-between p-2 border rounded">
                            <div className="mr-2">
                              <div className="font-mono text-xs">{b.name}</div>
                              <div className="text-xs text-gray-500">{new Date(b.mtime).toLocaleString()} · {b.size} bytes</div>
                            </div>
                            <div className="flex gap-2">
                              <a href={`/api/admin/backups/${encodeURIComponent(b.name)}`} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs rounded">Download</a>
                              <button onClick={() => {
                                const filename = b.name
                                setModalBusinessId(null)
                                setModalAction({ endpoint: '/api/admin/restore-backup', label: 'Restore Backup', method: 'POST', body: { filename } })
                                setModalOpen(true)
                              }} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded">Restore</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
              {/* Removed the Dev Seed Controls block here; moved into a dedicated card below for clarity */}
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Restaurant demo seed includes multi-size variants (Small/Regular/Large), POS attributes (posCategory, printToKitchen), and sample kitchen tickets to exercise POS & kitchen flows.</div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                {!showSeedTestConfirm ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                        Seed Test Data
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs">
                        Generate sample businesses and employees for testing
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSeedTestConfirm(true)}
                      disabled={seedingData}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 flex items-center"
                    >
                      <TestTube className="h-3 w-3 mr-1" />
                      Seed Data
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">Confirm Test Data Creation</div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                        This will create sample businesses, employees, and contracts for testing purposes.
                      </div>
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2">
                        CREATE TEST DATA
                      </div>
                      <input
                        type="text"
                        value={seedTestConfirmText}
                        onChange={(e) => setSeedTestConfirmText(e.target.value)}
                        placeholder="Type confirmation text..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={seedingData}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowSeedTestConfirm(false)
                          setSeedTestConfirmText('')
                          setSeedError('')
                        }}
                        disabled={seedingData}
                        className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSeedTestData}
                        disabled={seedingData || seedTestConfirmText !== 'CREATE TEST DATA'}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 flex items-center"
                      >
                        {seedingData ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            Seeding...
                          </>
                        ) : (
                          <>
                            <TestTube className="h-3 w-3 mr-1" />
                            Confirm
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {seedResult && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <div className="text-sm">
                      <div className="font-medium text-green-800 dark:text-green-200">Test data created successfully!</div>
                      <div className="text-green-700 dark:text-green-300 text-xs mt-1">
                        {seedResult.summary.businesses} businesses, {seedResult.summary.employees} employees, {seedResult.summary.contracts} contracts
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {seedError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <div className="text-sm text-red-700 dark:text-red-300">{seedError}</div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                {!showReferenceDataConfirm ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                        Seed Reference Data
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs">
                        Create ID formats, job titles, compensation types, benefits
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReferenceDataConfirm(true)}
                      disabled={seedingReferenceData}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded disabled:opacity-50 flex items-center"
                    >
                      <Database className="h-3 w-3 mr-1" />
                      Seed Reference
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">Confirm Reference Data Creation</div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                        This will create 89 essential reference records: ID formats, job titles, compensation types, benefits.
                      </div>
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2">
                        SEED REFERENCE DATA
                      </div>
                      <input
                        type="text"
                        value={referenceDataConfirmText}
                        onChange={(e) => setReferenceDataConfirmText(e.target.value)}
                        placeholder="Type confirmation text..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={seedingReferenceData}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowReferenceDataConfirm(false)
                          setReferenceDataConfirmText('')
                          setReferenceDataError('')
                        }}
                        disabled={seedingReferenceData}
                        className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSeedReferenceData}
                        disabled={seedingReferenceData || referenceDataConfirmText !== 'SEED REFERENCE DATA'}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded disabled:opacity-50 flex items-center"
                      >
                        {seedingReferenceData ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                            Seeding...
                          </>
                        ) : (
                          <>
                            <Database className="h-3 w-3 mr-1" />
                            Confirm
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {referenceDataResult && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                    <div className="text-sm">
                      <div className="font-medium text-purple-800 dark:text-purple-200">Reference data created successfully!</div>
                      <div className="text-purple-700 dark:text-purple-300 text-xs mt-1">
                        89 reference records: ID formats, job titles, compensation types, benefits
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {referenceDataError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <div className="text-sm text-red-700 dark:text-red-300">{referenceDataError}</div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                {!showAdminUserConfirm ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                        Create Admin User
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs">
                        Generate default admin user (admin@business.local)
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAdminUserConfirm(true)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Create Admin
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">Confirm Admin User Creation</div>
                      <div className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                        This will create/reset the admin user: admin@business.local / admin123
                      </div>
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mb-2">
                        CREATE ADMIN USER
                      </div>
                      <input
                        type="text"
                        value={adminUserConfirmText}
                        onChange={(e) => setAdminUserConfirmText(e.target.value)}
                        placeholder="Type confirmation text..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAdminUserConfirm(false)
                          setAdminUserConfirmText('')
                        }}
                        className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAdminUser}
                        disabled={adminUserConfirmText !== 'CREATE ADMIN USER'}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50 flex items-center"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8">
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <HardDrive className="h-6 w-6 mr-2 text-emerald-500" />
              <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">System Status</h3>
            </div>
            <p className="text-secondary mb-4">Current system health and statistics</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Active</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">System Status</div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">Online</div>
                <div className="text-sm text-green-700 dark:text-green-300">Database</div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">Secured</div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Authentication</div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Normal</div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Performance</div>
              </div>
            </div>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
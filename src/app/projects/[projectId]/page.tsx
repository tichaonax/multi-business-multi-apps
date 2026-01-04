'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCustomPermissionValue, isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'
import Link from 'next/link'

interface ProjectContractor {
  id: string
  isPrimary: boolean
  assignedDate: string
  person: {
    id: string
    fullName: string
    phone: string
    email: string
    isActive: boolean
  }
  totalPaid: number
  paymentCount: number
  lastPayment: string | null
}

interface ProjectTransaction {
  id: string
  amount: number
  description: string
  transactionType: string
  transactionSubType: string
  status: string
  createdAt: string
  projectContractor?: {
    person: {
      id: string
      fullName: string
    }
  }
}

interface ProjectStage {
  id: string
  name: string
  description?: string
  order: number
  isCompleted: boolean
  completedAt?: string
}

interface Project {
  id: string
  name: string
  description?: string
  businessType: string
  status: string
  budget?: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
  projectType: {
    id: string
    name: string
    description?: string
    businessType: string
    isSystem: boolean
  }
  user?: {
    id: string
    name: string
    email: string
  }
  projectContractors: ProjectContractor[]
  contractorSummaries: ProjectContractor[]
  projectTransactions: ProjectTransaction[]
  projectStages: ProjectStage[]
  financialSummary: {
    totalBudget: number
    totalSpent: number
    remainingBudget: number
    contractorPayments: number
    projectExpenses: number
    percentageSpent: number
    transactionCounts: {
      total: number
      contractorPayments: number
      projectExpenses: number
    }
  }
}

export default function ProjectDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const projectId = params.projectId as string

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else if (response.status === 404) {
        setError('Project not found')
      } else if (response.status === 403) {
        setError('You don\'t have permission to view this project')
      } else {
        setError('Failed to load project')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const canViewProject = (businessType: string) => {
    if (!session?.user) return false

    // System admins can view all projects
    if (isSystemAdmin(session.user as any)) return true

    // Check general view projects permission first
    if (hasUserPermission(session.user as any, 'canViewProjects')) return true

    // For personal projects, also check personal project permissions
    if (businessType === 'personal') {
      return hasUserPermission(session.user as any, 'canCreatePersonalProjects') ||
             hasUserPermission(session.user as any, 'canManagePersonalProjects')
    }

    // For business projects, check business-specific permissions
    return getCustomPermissionValue(session.user as any, `${businessType}.canViewProjects`, undefined, false)
  }

  const canEditProject = (businessType: string) => {
    if (!session?.user) return false

    // System admins can edit all projects
    if (isSystemAdmin(session.user as any)) return true

    // Check general edit projects permission first
    if (hasUserPermission(session.user as any, 'canEditProjects')) return true

    // For personal projects, also check personal project permissions
    if (businessType === 'personal') {
      return hasUserPermission(session.user as any, 'canCreatePersonalProjects') ||
             hasUserPermission(session.user as any, 'canManagePersonalProjects')
    }

    // For business projects, check business-specific permissions
    return getCustomPermissionValue(session.user as any, `${businessType}.canEditProjects`, undefined, false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'on-hold':
        return <AlertCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTransactionIcon = (transactionType: string, transactionSubType: string) => {
    if (transactionSubType === 'contractor_payment') {
      return <Users className="h-4 w-4 text-blue-600" />
    } else {
      return <DollarSign className="h-4 w-4 text-green-600" />
    }
  }

  if (loading) {
    return (
      <ContentLayout title="Loading Project..." subtitle="Please wait">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-secondary/80">Loading project details...</p>
            </div>
          </CardContent>
        </Card>
      </ContentLayout>
    )
  }

  if (error || !project) {
    return (
      <ContentLayout title="Project Not Found" subtitle="Unable to load project">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary mb-2">
                {error || 'Project not found'}
              </h3>
              <p className="text-secondary/80 mb-4">
                The project you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link href="/projects">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </ContentLayout>
    )
  }

  if (!canViewProject(project.businessType)) {
    return (
      <ContentLayout title="Access Denied" subtitle="Insufficient permissions">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary mb-2">Access Denied</h3>
              <p className="text-secondary/80 mb-4">
                You don't have permission to view {project.businessType} projects.
              </p>
              <Link href="/projects">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={project.name}
      subtitle={project.description || 'Project details and financial breakdown'}
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Projects', href: '/projects' },
        { label: project.name, isActive: true }
      ]}
      headerActions={
        <div className="flex gap-2">
          {canEditProject(project.businessType) && (
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          )}
          <Link href="/projects">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Project Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(project.status)}
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Business Type</p>
                  <Badge variant="outline" className="mt-1">
                    {project.businessType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Project Type</p>
                  <p className="text-sm font-medium mt-1">
                    {project.projectType.name}
                    {project.projectType.isSystem && (
                      <span className="ml-2 text-xs text-secondary/60">(System)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-medium mt-1">
                    {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>

              {(project.startDate || project.endDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.startDate && (
                    <div>
                      <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm font-medium mt-1">{formatDate(project.startDate)}</p>
                    </div>
                  )}
                  {project.endDate && (
                    <div>
                      <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">End Date</p>
                      <p className="text-sm font-medium mt-1">{formatDate(project.endDate)}</p>
                    </div>
                  )}
                </div>
              )}

              {project.user && (
                <div>
                  <p className="text-sm font-medium text-secondary/60 uppercase tracking-wide">Created By</p>
                  <p className="text-sm font-medium mt-1">
                    {project.user.name} ({project.user.email})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-secondary/60 uppercase tracking-wide">Budget</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(project.financialSummary.totalBudget)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-secondary/60 uppercase tracking-wide">Total Spent</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(project.financialSummary.totalSpent)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-secondary/60 uppercase tracking-wide">Remaining</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(project.financialSummary.remainingBudget)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="financial" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="financial">Financial Summary</TabsTrigger>
                <TabsTrigger value="contractors">Contractors</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="stages">Project Stages</TabsTrigger>
              </TabsList>

              <TabsContent value="financial" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-secondary/60">Contractor Payments</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(project.financialSummary.contractorPayments)}
                          </p>
                          <p className="text-xs text-secondary/60">
                            {project.financialSummary.transactionCounts.contractorPayments} payments
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-secondary/60">Project Expenses</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(project.financialSummary.projectExpenses)}
                          </p>
                          <p className="text-xs text-secondary/60">
                            {project.financialSummary.transactionCounts.projectExpenses} expenses
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-secondary/60">Budget Progress</p>
                          <p className="text-lg font-bold text-primary">
                            {project.financialSummary.percentageSpent.toFixed(1)}%
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${Math.min(project.financialSummary.percentageSpent, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-secondary/60">Total Transactions</p>
                          <p className="text-lg font-bold text-primary">
                            {project.financialSummary.transactionCounts.total}
                          </p>
                          <p className="text-xs text-secondary/60">All transaction types</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {project.financialSummary.percentageSpent > 100 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This project is over budget by {formatCurrency(Math.abs(project.financialSummary.remainingBudget))}.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contractors" className="p-6">
                {project.contractorSummaries.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-secondary mb-2">No Contractors Assigned</h3>
                    <p className="text-secondary/80">This project doesn't have any contractors assigned yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.contractorSummaries.map((contractor) => (
                      <Card key={contractor.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{contractor.person.fullName}</h4>
                                  {contractor.isPrimary && (
                                    <Badge variant="outline" className="text-xs">Primary</Badge>
                                  )}
                                  {!contractor.person.isActive && (
                                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-secondary/80">{contractor.person.phone}</p>
                                {contractor.person.email && (
                                  <p className="text-sm text-secondary/80">{contractor.person.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{formatCurrency(contractor.totalPaid)}</p>
                              <p className="text-sm text-secondary/80">
                                {contractor.paymentCount} payment{contractor.paymentCount !== 1 ? 's' : ''}
                              </p>
                              {contractor.lastPayment && (
                                <p className="text-xs text-secondary/60">
                                  Last: {formatDate(contractor.lastPayment)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="p-6">
                {project.projectTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-secondary mb-2">No Transactions</h3>
                    <p className="text-secondary/80">This project doesn't have any transactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.projectTransactions.map((transaction) => (
                      <Card key={transaction.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getTransactionIcon(transaction.transactionType, transaction.transactionSubType)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{transaction.description}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {transaction.transactionSubType === 'contractor_payment' ? 'Contractor' : 'Expense'}
                                  </Badge>
                                </div>
                                {transaction.projectContractor && (
                                  <p className="text-sm text-secondary/80">
                                    To: {transaction.projectContractor.person.fullName}
                                  </p>
                                )}
                                <p className="text-xs text-secondary/60">
                                  {formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{formatCurrency(transaction.amount)}</p>
                              <Badge
                                className={
                                  transaction.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : transaction.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stages" className="p-6">
                {project.projectStages.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-secondary/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-secondary mb-2">No Project Stages</h3>
                    <p className="text-secondary/80">This project doesn't have any stages defined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.projectStages.map((stage) => (
                      <Card key={stage.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {stage.isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-orange-600" />
                              )}
                              <div>
                                <h4 className="font-semibold">{stage.name}</h4>
                                {stage.description && (
                                  <p className="text-sm text-secondary/80">{stage.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={
                                  stage.isCompleted
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                }
                              >
                                {stage.isCompleted ? 'Completed' : 'In Progress'}
                              </Badge>
                              {stage.completedAt && (
                                <p className="text-xs text-secondary/60 mt-1">
                                  Completed: {formatDate(stage.completedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}
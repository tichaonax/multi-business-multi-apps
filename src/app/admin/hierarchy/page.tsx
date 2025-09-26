'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  email: string | null
  phone: string
  employmentStatus: string
  isActive: boolean
  jobTitle: {
    id: string
    title: string
    department: string | null
    level: string | null
  }
  supervisor: {
    id: string
    fullName: string
    jobTitle: {
      title: string
    }
  } | null
  primaryBusiness: {
    id: string
    name: string
    type: string
  }
  businessAssignments: Array<{
    id: string
    business: {
      id: string
      name: string
      type: string
    }
    role: string | null
    isActive: boolean
    assignedAt: string
  }>
  subordinates: Array<{
    id: string
    fullName: string
    jobTitle: {
      title: string
    }
  }>
  _count: {
    subordinates: number
  }
}

interface Business {
  id: string
  name: string
  type: string
}

interface HierarchyNode {
  employee: Employee
  children: HierarchyNode[]
}

export default function HierarchyPage() {
  const { data: session } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([])

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    employeeId: '',
    businessId: '',
    role: '',
    supervisorId: ''
  })

  const currentUser = session?.user as any
  const canManageEmployees = currentUser && hasPermission(currentUser, 'canEditEmployees')
  const canViewEmployees = currentUser && hasPermission(currentUser, 'canViewEmployees')

  useEffect(() => {
    if (canViewEmployees) {
      fetchData()
    }
  }, [canViewEmployees])

  useEffect(() => {
    if ((employees || []).length > 0) {
      buildHierarchy()
    }
  }, [employees, selectedBusiness])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [employeesRes, businessesRes] = await Promise.all([
        fetch('/api/employees?includeInactive=false'),
        fetch('/api/businesses')
      ])

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData.employees || [])
      }
      if (businessesRes.ok) setBusinesses(await businessesRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildHierarchy = () => {
    // Filter employees by business if selected
    let filteredEmployees = employees || []
    if (selectedBusiness) {
      filteredEmployees = (employees || []).filter(emp => 
        emp.primaryBusiness.id === selectedBusiness ||
        emp.businessAssignments.some(assignment => 
          assignment.business.id === selectedBusiness && assignment.isActive
        )
      )
    }

    // Find top-level managers (no supervisor or supervisor not in current business filter)
    const topLevel = filteredEmployees.filter(emp => {
      if (!emp.supervisor) return true
      
      // If business is selected, check if supervisor is in the same business context
      if (selectedBusiness) {
        const supervisorInBusiness = filteredEmployees.find(e => e.id === emp.supervisor!.id)
        return !supervisorInBusiness
      }
      
      return false
    })

    // Build hierarchy recursively
    const buildNode = (employee: Employee): HierarchyNode => {
      const children = filteredEmployees
        .filter(emp => emp.supervisor?.id === employee.id)
        .map(emp => buildNode(emp))
        .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName))

      return {
        employee,
        children
      }
    }

    const hierarchy = topLevel.map(emp => buildNode(emp))
      .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName))

    setHierarchyData(hierarchy)
  }

  const openAssignModal = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee)
      setAssignmentForm({
        employeeId: employee.id,
        businessId: '',
        role: '',
        supervisorId: employee.supervisor?.id || ''
      })
    } else {
      setSelectedEmployee(null)
      setAssignmentForm({
        employeeId: '',
        businessId: '',
        role: '',
        supervisorId: ''
      })
    }
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
    setSelectedEmployee(null)
    setAssignmentForm({
      employeeId: '',
      businessId: '',
      role: '',
      supervisorId: ''
    })
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assignmentForm.employeeId || !assignmentForm.businessId) {
      alert('Please select employee and business')
      return
    }

    try {
      const response = await fetch('/api/employee-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentForm)
      })

      if (response.ok) {
        fetchData()
        closeAssignModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create assignment')
      }
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert('Failed to create assignment')
    }
  }

  const updateSupervisor = async (employeeId: string, supervisorId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supervisorId })
      })

      if (response.ok) {
        fetchData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update supervisor')
      }
    } catch (error) {
      console.error('Error updating supervisor:', error)
      alert('Failed to update supervisor')
    }
  }

  const HierarchyNode: React.FC<{ node: HierarchyNode; level: number }> = ({ node, level }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2)
    const { employee, children } = node

    return (
      <div className="mb-2">
        <div 
          className={`flex items-center p-4 rounded-lg border ${
            level === 0 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {children.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-4">
            <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
              {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h4 className="font-semibold text-primary">{employee.fullName}</h4>
              <span className="text-sm text-secondary">{employee.jobTitle.title}</span>
              {employee.jobTitle.department && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded">
                  {employee.jobTitle.department}
                </span>
              )}
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 rounded">
                {employee._count.subordinates} direct reports
              </span>
            </div>
            <div className="text-sm text-secondary mt-1">
              {employee.employeeNumber} • {employee.primaryBusiness.name}
              {employee.businessAssignments.length > 0 && (
                <span> • +{employee.businessAssignments.length} additional assignments</span>
              )}
            </div>
          </div>

          {canManageEmployees && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openAssignModal(employee)}
                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                Assign
              </button>
              <select
                value={employee.supervisor?.id || ''}
                onChange={(e) => updateSupervisor(employee.id, e.target.value)}
                className="text-sm input"
              >
                <option value="">No Supervisor</option>
                {employees
                  .filter(emp => emp.id !== employee.id)
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="mt-2">
            {children.map(child => (
              <HierarchyNode key={child.employee.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <ContentLayout title="Employee Hierarchy">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view employee hierarchy.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewEmployees) {
    return (
      <ContentLayout title="Employee Hierarchy">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view employee hierarchy.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Employee Hierarchy & Assignments"
      subtitle="Manage organizational structure and business assignments"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Hierarchy', isActive: true }
      ]}
      headerActions={
        canManageEmployees ? (
          <button onClick={() => openAssignModal()} className="btn-primary">
            <span className="mr-2">+</span>
            New Assignment
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Filter by Business
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="input w-full"
              >
                <option value="">All Businesses</option>
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.name} ({business.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={fetchData}
                className="btn-secondary"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">👥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{(employees || []).length}</p>
                <p className="text-sm text-secondary">Total Employees</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 dark:text-purple-300 text-sm font-semibold">👑</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {(employees || []).filter(emp => emp._count?.subordinates > 0).length}
                </p>
                <p className="text-sm text-secondary">Managers</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 dark:text-green-300 text-sm font-semibold">🏢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{businesses.length}</p>
                <p className="text-sm text-secondary">Businesses</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mr-3">
                <span className="text-yellow-600 dark:text-yellow-300 text-sm font-semibold">📋</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {(employees || []).reduce((sum, emp) => sum + (emp.businessAssignments?.length || 0), 0)}
                </p>
                <p className="text-sm text-secondary">Cross-Business Assignments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy Visualization */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-primary">
              Organizational Hierarchy
              {selectedBusiness && (
                <span className="ml-2 text-sm font-normal text-secondary">
                  - {businesses.find(b => b.id === selectedBusiness)?.name}
                </span>
              )}
            </h3>
            <p className="text-sm text-secondary mt-1">
              Click arrows to expand/collapse teams. Use dropdowns to reassign supervisors.
            </p>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-secondary">Loading hierarchy...</p>
              </div>
            ) : hierarchyData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary">No employees found for the selected criteria.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hierarchyData.map(node => (
                  <HierarchyNode key={node.employee.id} node={node} level={0} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="relative my-10 mx-4 sm:mx-auto w-full max-w-lg bg-white dark:bg-gray-800 rounded-md shadow-lg border p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-primary mb-4">
                {selectedEmployee ? `New Assignment for ${selectedEmployee.fullName}` : 'New Employee Assignment'}
              </h3>
              
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                {!selectedEmployee && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Employee *
                    </label>
                    <select
                      value={assignmentForm.employeeId}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      className="input w-full"
                      required
                    >
                      <option value="">Select Employee</option>
                      {(employees || []).map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} - {emp.jobTitle.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Business *
                  </label>
                  <select
                    value={assignmentForm.businessId}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, businessId: e.target.value }))}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Business</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name} ({business.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Role in Business
                  </label>
                  <input
                    type="text"
                    value={assignmentForm.role}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, role: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g., Assistant Manager, Consultant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Supervisor in This Business
                  </label>
                  <select
                    value={assignmentForm.supervisorId}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, supervisorId: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">No Supervisor</option>
                    {employees
                      .filter(emp => emp.id !== assignmentForm.employeeId)
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} - {emp.jobTitle.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeAssignModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
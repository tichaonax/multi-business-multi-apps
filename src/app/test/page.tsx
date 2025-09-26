'use client'

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  email: string | null
  phone: string
  nationalId: string
  hireDate: string
  employmentStatus: string
  isActive: boolean
}

interface JobTitle {
  id: string
  title: string
  description: string | null
  department: string | null
  level: string | null
  isActive: boolean
}

interface CompensationType {
  id: string
  name: string
  type: string
  description: string | null
  baseAmount: number | null
  commissionPercentage: number | null
  isActive: boolean
}

interface Business {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  createdBy: string
}

interface EmployeeWithRelations {
  id: string
  fullName: string
  users?: any
  jobTitles?: any
  compensationTypes?: any
  business?: any
  employees?: any
}

export default function TestPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [employeeRelations, setEmployeeRelations] = useState<EmployeeWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTest, setActiveTest] = useState<string>('employees')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/test/employees')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEmployees(data)
    } catch (err) {
      console.error('Error fetching employees:', err)
      throw err
    }
  }

  const fetchJobTitles = async () => {
    try {
      const response = await fetch('/api/test/job-titles')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setJobTitles(result.data || [])
    } catch (err) {
      console.error('Error fetching job titles:', err)
      throw err
    }
  }

  const fetchCompensationTypes = async () => {
    try {
      const response = await fetch('/api/test/compensation-types')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setCompensationTypes(result.data || [])
    } catch (err) {
      console.error('Error fetching compensation types:', err)
      throw err
    }
  }

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/test/businesses')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setBusinesses(result.data || [])
    } catch (err) {
      console.error('Error fetching businesses:', err)
      throw err
    }
  }

  const fetchEmployeeRelations = async () => {
    try {
      const response = await fetch('/api/test/employee-relations')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setEmployeeRelations(result.data || [])
    } catch (err) {
      console.error('Error fetching employee relations:', err)
      throw err
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        fetchEmployees(),
        fetchJobTitles(),
        fetchCompensationTypes(),
        fetchBusinesses(),
        fetchEmployeeRelations()
      ])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ContentLayout
      title="Database Schema Test"
      subtitle="Testing employee table and relationships with camelCase"
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Test', isActive: true }
      ]}
    >
      <div className="space-y-6">
        {/* Global Status */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-blue-800 font-medium">Loading all test data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="card p-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'employees', label: `Employees (${employees.length})`, emoji: '👥' },
              { key: 'job-titles', label: `Job Titles (${jobTitles.length})`, emoji: '💼' },
              { key: 'compensation', label: `Compensation (${compensationTypes.length})`, emoji: '💰' },
              { key: 'businesses', label: `Businesses (${businesses.length})`, emoji: '🏢' },
              { key: 'relations', label: `Relations (${employeeRelations.length})`, emoji: '🔗' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTest(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTest === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Employees Table */}
          {activeTest === 'employees' && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">
                Step 1: Basic Employee Table Test (Top 5 Records)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">National ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.employeeNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.email || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.nationalId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(employee.hireDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employmentStatus}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && !loading && (
                  <div className="text-center py-8 text-secondary">No employees found</div>
                )}
              </div>
            </div>
          )}

          {/* Job Titles Table */}
          {activeTest === 'job-titles' && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">
                Step 2: Job Titles Table Test
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobTitles.map((jobTitle) => (
                      <tr key={jobTitle.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{jobTitle.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{jobTitle.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobTitle.department || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jobTitle.level || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${jobTitle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {jobTitle.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobTitles.length === 0 && !loading && (
                  <div className="text-center py-8 text-secondary">No job titles found</div>
                )}
              </div>
            </div>
          )}

          {/* Compensation Types Table */}
          {activeTest === 'compensation' && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">
                Step 3: Compensation Types Table Test
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {compensationTypes.map((comp) => (
                      <tr key={comp.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comp.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{comp.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{comp.baseAmount ? `$${comp.baseAmount}` : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{comp.commissionPercentage ? `${comp.commissionPercentage}%` : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${comp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {comp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {compensationTypes.length === 0 && !loading && (
                  <div className="text-center py-8 text-secondary">No compensation types found</div>
                )}
              </div>
            </div>
          )}

          {/* Businesses Table */}
          {activeTest === 'businesses' && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">
                Step 4: Businesses Table Test
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{business.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{business.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{business.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{business.createdBy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${business.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {business.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {businesses.length === 0 && !loading && (
                  <div className="text-center py-8 text-secondary">No businesses found</div>
                )}
              </div>
            </div>
          )}

          {/* Employee Relations Test */}
          {activeTest === 'relations' && (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">
                Step 5: Employee Relations Test (Critical!)
              </h2>
              <div className="space-y-4">
                {employeeRelations.map((employee, index) => (
                  <div key={employee.id} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Employee #{index + 1}: {employee.fullName}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* User Relations */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">👤 User Account</h4>
                        {employee.users ? (
                          <div className="text-sm">
                            <div>Name: {employee.users.name}</div>
                            <div>Email: {employee.users.email}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No user account</div>
                        )}
                      </div>

                      {/* Job Title Relations */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">💼 Job Title</h4>
                        {employee.jobTitles ? (
                          <div className="text-sm">
                            <div>Title: {employee.jobTitles.title}</div>
                            <div>Dept: {employee.jobTitles.department}</div>
                            <div>Level: {employee.jobTitles.level}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No job title</div>
                        )}
                      </div>

                      {/* Compensation Relations */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">💰 Compensation</h4>
                        {employee.compensationTypes ? (
                          <div className="text-sm">
                            <div>Name: {employee.compensationTypes.name}</div>
                            <div>Type: {employee.compensationTypes.type}</div>
                            <div>Base: ${employee.compensationTypes.baseAmount || 'N/A'}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No compensation</div>
                        )}
                      </div>

                      {/* Business Relations */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">🏢 Business</h4>
                        {employee.business ? (
                          <div className="text-sm">
                            <div>Name: {employee.business.name}</div>
                            <div>Type: {employee.business.type}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No business</div>
                        )}
                      </div>

                      {/* Supervisor Relations */}
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">👔 Supervisor</h4>
                        {employee.employees ? (
                          <div className="text-sm">
                            <div>Name: {employee.employees.fullName}</div>
                            <div>Title: {employee.employees.jobTitles?.title || 'N/A'}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No supervisor</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {employeeRelations.length === 0 && !loading && (
                  <div className="text-center py-8 text-secondary">No employee relations found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {loading ? 'Loading All Data...' : '🔄 Refresh All Test Data'}
          </button>
        </div>

        {/* Summary Status */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-primary mb-4">Test Summary:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
              <div className="text-sm text-gray-600">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{jobTitles.length}</div>
              <div className="text-sm text-gray-600">Job Titles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{compensationTypes.length}</div>
              <div className="text-sm text-gray-600">Compensation Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{businesses.length}</div>
              <div className="text-sm text-gray-600">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{employeeRelations.length}</div>
              <div className="text-sm text-gray-600">Relations</div>
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}
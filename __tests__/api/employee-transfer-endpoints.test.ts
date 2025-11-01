/**
 * Employee Transfer API Endpoint Tests
 * 
 * Tests for all employee transfer API endpoints:
 * - GET /api/admin/businesses/[id]/transferable-employees
 * - GET /api/admin/businesses/[id]/compatible-targets
 * - POST /api/admin/businesses/[id]/transfer-preview
 * - POST /api/admin/businesses/[id]/transfer-employees
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { GET as getTransferableEmployees } from '@/app/api/admin/businesses/[id]/transferable-employees/route'
import { GET as getCompatibleTargets } from '@/app/api/admin/businesses/[id]/compatible-targets/route'
import { POST as transferPreview } from '@/app/api/admin/businesses/[id]/transfer-preview/route'
import { POST as transferEmployees } from '@/app/api/admin/businesses/[id]/transfer-employees/route'
import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock employee transfer service
jest.mock('@/lib/employee-transfer-service', () => ({
  getTransferableEmployees: jest.fn(),
  getCompatibleTargetBusinesses: jest.fn(),
  validateTransfer: jest.fn(),
  transferEmployeesToBusiness: jest.fn(),
}))

const mockAdminSession = {
  user: {
    id: 'user1',
    email: 'admin@test.com',
    name: 'Admin User',
    isSystemAdmin: true,
  }
}

const mockNonAdminSession = {
  user: {
    id: 'user2',
    email: 'user@test.com',
    name: 'Regular User',
    isSystemAdmin: false,
  }
}

describe('Employee Transfer API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/businesses/[id]/transferable-employees', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transferable-employees')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getTransferableEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when not system admin', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockNonAdminSession)

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transferable-employees')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getTransferableEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('system admin')
    })

    it('should return transferable employees for valid request', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { getTransferableEmployees: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: true,
        count: 2,
        employees: [
          { id: 'emp1', fullName: 'John Doe' },
          { id: 'emp2', fullName: 'Jane Smith' }
        ]
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transferable-employees')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getTransferableEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(2)
      expect(data.employees).toHaveLength(2)
    })

    it('should handle service errors', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { getTransferableEmployees: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transferable-employees')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getTransferableEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Database error')
    })
  })

  describe('GET /api/admin/businesses/[id]/compatible-targets', () => {
    it('should return compatible businesses', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { getCompatibleTargetBusinesses: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: true,
        count: 2,
        businesses: [
          { id: 'biz2', name: 'Store 2', type: 'retail' },
          { id: 'biz3', name: 'Store 3', type: 'retail' }
        ]
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/compatible-targets')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getCompatibleTargets(req, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.businesses).toHaveLength(2)
    })

    it('should require admin authentication', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockNonAdminSession)

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/compatible-targets')
      const params = Promise.resolve({ id: 'biz1' })

      const response = await getCompatibleTargets(req, { params })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/admin/businesses/[id]/transfer-preview', () => {
    it('should validate and return transfer preview', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { validateTransfer: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: true,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          validEmployeeIds: ['emp1', 'emp2']
        }
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-preview', {
        method: 'POST',
        body: JSON.stringify({
          targetBusinessId: 'biz2',
          employeeIds: ['emp1', 'emp2']
        })
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferPreview(req, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.validation.isValid).toBe(true)
      expect(data.validation.validEmployeeIds).toHaveLength(2)
    })

    it('should return validation errors', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { validateTransfer: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: true,
        validation: {
          isValid: false,
          errors: ['Business types do not match'],
          warnings: [],
          validEmployeeIds: []
        }
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-preview', {
        method: 'POST',
        body: JSON.stringify({
          targetBusinessId: 'biz2',
          employeeIds: ['emp1']
        })
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferPreview(req, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.validation.isValid).toBe(false)
      expect(data.validation.errors).toContain('Business types do not match')
    })

    it('should require targetBusinessId and employeeIds', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-preview', {
        method: 'POST',
        body: JSON.stringify({ targetBusinessId: 'biz2' }) // Missing employeeIds
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferPreview(req, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('POST /api/admin/businesses/[id]/transfer-employees', () => {
    it('should successfully transfer employees', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { transferEmployeesToBusiness: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: true,
        transferredCount: 2,
        contractRenewalsCreated: 2,
        businessAssignmentsUpdated: 4,
        employeeIds: ['emp1', 'emp2'],
        auditLogId: 'audit1'
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-employees', {
        method: 'POST',
        body: JSON.stringify({
          targetBusinessId: 'biz2',
          employeeIds: ['emp1', 'emp2']
        })
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.transferredCount).toBe(2)
      expect(data.data.contractRenewalsCreated).toBe(2)
    })

    it('should handle transfer failures', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      
      const { transferEmployeesToBusiness: mockService } = require('@/lib/employee-transfer-service')
      mockService.mockResolvedValue({
        success: false,
        error: 'Transfer failed'
      })

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-employees', {
        method: 'POST',
        body: JSON.stringify({
          targetBusinessId: 'biz2',
          employeeIds: ['emp1']
        })
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferEmployees(req, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Transfer failed')
    })

    it('should require admin authentication', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/admin/businesses/biz1/transfer-employees', {
        method: 'POST',
        body: JSON.stringify({
          targetBusinessId: 'biz2',
          employeeIds: ['emp1']
        })
      })
      const params = Promise.resolve({ id: 'biz1' })

      const response = await transferEmployees(req, { params })

      expect(response.status).toBe(401)
    })
  })
})

'use client'

import { useState } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import { useBusinessContext } from '@/components/universal'

interface ImportJob {
  id: string
  filename: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  errors: string[]
  createdAt: string
}

interface ClothingBulkImportProps {
  businessId: string
}

export function ClothingBulkImport({ businessId }: ClothingBulkImportProps) {
  const { formatDate } = useBusinessContext()
  const customAlert = useAlert()
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [activeTab, setActiveTab] = useState<'upload' | 'jobs'>('upload')

  const handleFileSelect = async (file: File) => {
    if (file && (file.type === 'text/csv' || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file)
    } else {
      await customAlert({ title: 'Invalid file', description: 'Please select a CSV or Excel file' })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const startImport = () => {
    if (!selectedFile) return

    const newJob: ImportJob = {
      id: `job-${Date.now()}`,
      filename: selectedFile.name,
      status: 'PROCESSING',
      totalRows: 150,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      errors: [],
      createdAt: new Date().toISOString()
    }

    setImportJobs([newJob, ...importJobs])
    setSelectedFile(null)

    // Simulate import progress
    simulateImportProgress(newJob.id)
  }

  const simulateImportProgress = (jobId: string) => {
    let processed = 0
    const total = 150

    const interval = setInterval(() => {
      processed += Math.floor(Math.random() * 10) + 1

      if (processed >= total) {
        processed = total
        setImportJobs(jobs => jobs.map(job =>
          job.id === jobId
            ? {
                ...job,
                status: 'COMPLETED' as const,
                processedRows: processed,
                successRows: processed - 5,
                errorRows: 5,
                errors: [
                  'Row 12: Invalid size "XXS" for product type',
                  'Row 45: Missing required field "color"',
                  'Row 78: Duplicate SKU "TSH-001-M-BLK"',
                  'Row 92: Invalid price format',
                  'Row 134: Brand "Unknown" not found'
                ]
              }
            : job
        ))
        clearInterval(interval)
      } else {
        setImportJobs(jobs => jobs.map(job =>
          job.id === jobId
            ? { ...job, processedRows: processed, successRows: processed }
            : job
        ))
      }
    }, 500)
  }

  const downloadTemplate = () => {
    // Sample CSV template for clothing products
    const csvContent = `Product Name,SKU,Description,Base Price,Category,Brand,Condition,Season,Gender,Material,Care Instructions,Size,Color,Variant SKU,Variant Price,Stock Quantity,Reorder Level
"Men's Cotton T-Shirt",TSH-001,"Comfortable cotton tee",24.99,Tops,GenericBrand,NEW,All Season,Men,100% Cotton,"Machine wash cold",S,Black,TSH-001-S-BLK,24.99,10,5
"Men's Cotton T-Shirt",TSH-001,"Comfortable cotton tee",24.99,Tops,GenericBrand,NEW,All Season,Men,100% Cotton,"Machine wash cold",M,Black,TSH-001-M-BLK,24.99,15,5
"Men's Cotton T-Shirt",TSH-001,"Comfortable cotton tee",24.99,Tops,GenericBrand,NEW,All Season,Men,100% Cotton,"Machine wash cold",L,Black,TSH-001-L-BLK,24.99,20,5`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clothing-products-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: { color: 'bg-gray-100 text-gray-800', icon: '⏳' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: '⚙️' },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: '✅' },
      FAILED: { color: 'bg-red-100 text-red-800', icon: '❌' }
    }
    return configs[status as keyof typeof configs] || configs.PENDING
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'upload', label: 'Upload File', icon: '📁' },
            { id: 'jobs', label: 'Import History', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Product Data</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">📁</div>
              <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Drop your file here or click to browse
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Supports CSV and Excel files up to 10MB
              </div>

              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer"
              >
                Browse Files
              </label>
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">{selectedFile.name}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to import
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Remove
                    </button>
                    <button
                      onClick={startImport}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Start Import
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Template and Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Download Template</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Use our template to ensure your data is formatted correctly for import.
              </p>
              <button
                onClick={downloadTemplate}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download CSV Template
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Import Guidelines</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Each row can create a product or variant</li>
                <li>• Required fields: Product Name, SKU, Base Price</li>
                <li>• Variants need Size/Color and Variant SKU</li>
                <li>• Maximum 1000 rows per import</li>
                <li>• Duplicate SKUs will be skipped</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import History</h3>

          {importJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Import Jobs</h3>
              <p className="text-gray-600 dark:text-gray-400">Your import history will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {importJobs.map((job) => {
                const statusConfig = getStatusConfig(job.status)
                const progressPercent = job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0

                return (
                  <div key={job.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{job.filename}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Started {formatDate(new Date(job.createdAt))}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.icon} {job.status}
                      </span>
                    </div>

                    {job.status === 'PROCESSING' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{job.processedRows} / {job.totalRows}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-green-600 dark:text-green-400">{job.successRows}</div>
                        <div className="text-gray-600 dark:text-gray-400">Success</div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600 dark:text-red-400">{job.errorRows}</div>
                        <div className="text-gray-600 dark:text-gray-400">Errors</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{job.totalRows}</div>
                        <div className="text-gray-600 dark:text-gray-400">Total Rows</div>
                      </div>
                    </div>

                    {job.errors.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                          View Errors ({job.errors.length})
                        </summary>
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                          <ul className="space-y-1">
                            {job.errors.map((error, index) => (
                              <li key={index} className="text-red-700 dark:text-red-300">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
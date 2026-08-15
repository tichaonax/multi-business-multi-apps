'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatPhoneNumberLocal, formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

// Work document only — deliberately renders no pricing, fees, or charges anywhere,
// even though the underlying job detail API returns them. See MBM-262 Decision #2.
export default function JobCardPrintPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const { format: dateFormat } = useDateFormat()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/vehicle-service/jobs/${jobId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setJob(data.job))
      .catch(() => setError('Failed to load job card'))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (error || !job) return <div className="p-8 text-center text-red-600">{error || 'Job not found'}</div>

  return (
    <div className="max-w-2xl mx-auto p-8 text-gray-900 bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>

      <button
        onClick={() => window.print()}
        className="no-print mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
      >
        🖨️ Print
      </button>

      <div className="border-2 border-black p-6">
        <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
          <h1 className="text-xl font-bold">JOB CARD</h1>
          <div className="text-right text-xs">
            <div>Job #{job.id.slice(0, 8).toUpperCase()}</div>
            <div>{formatDateByFormat(job.createdAt, dateFormat)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Vehicle</p>
            <p className="font-semibold">{[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || '—'}</p>
            {job.vehiclePlate && <p>Plate: {job.vehiclePlate}</p>}
            {job.vehicleVin && <p>VIN: {job.vehicleVin}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Customer</p>
            <p className="font-semibold">{job.business_customers?.name || 'Walk-in customer'}</p>
            {job.business_customers?.phone && <p>{formatPhoneNumberLocal(job.business_customers.phone)}</p>}
          </div>
        </div>

        <div className="mb-4 text-sm">
          <p className="text-xs text-gray-500 uppercase">Primary Contractor</p>
          <p className="font-semibold">{job.primaryContractor?.persons?.fullName || '—'}</p>
        </div>

        {job.notes && (
          <div className="mb-4 text-sm">
            <p className="text-xs text-gray-500 uppercase">Job Notes</p>
            <p>{job.notes}</p>
          </div>
        )}

        <div className="border-t-2 border-black pt-3">
          <p className="text-xs text-gray-500 uppercase mb-2">Work Required</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1">Service</th>
                <th className="text-left py-1">Assigned To</th>
                <th className="text-left py-1">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {job.tasks.map((t: any) => (
                <tr key={t.id} className="border-b border-gray-200">
                  <td className="py-2 pr-2">{t.subcategory.emoji} {t.subcategory.name}</td>
                  <td className="py-2 pr-2">{t.contractor.persons.fullName}</td>
                  <td className="py-2">{t.workDescription || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs">
          <div>
            <div className="border-b border-gray-500 h-8"></div>
            <p className="mt-1">Contractor signature / collected by</p>
          </div>
          <div>
            <div className="border-b border-gray-500 h-8"></div>
            <p className="mt-1">Date collected</p>
          </div>
        </div>
      </div>
    </div>
  )
}

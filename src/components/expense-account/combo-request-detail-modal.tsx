'use client'

import { useState, useEffect } from 'react'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface PayeeInfo {
  name: string
  phone?: string | null
  contactPerson?: string | null
}

interface ComboItem {
  id: string
  description: string
  quantity: number | null
  unit: string | null
  estimatedAmount: number | null
  approvedAmount: number | null
  isPaid: boolean
  paidAmount: number | null
  notes: string | null
  sortOrder: number
}

interface ComboSection {
  id: string
  sectionType: string
  sectionName: string | null
  sortOrder: number
  payeeType: string | null
  payeeUser: { id: string; name: string } | null
  payeeEmployee: { id: string; fullName: string; phone?: string | null } | null
  payeePerson: { id: string; fullName: string; phone?: string | null } | null
  payeeBusiness: { id: string; name: string } | null
  payeeSupplier: { id: string; name: string; phone?: string | null; contactPerson?: string | null } | null
  items: ComboItem[]
}

interface ComboRequestSummary {
  id: string
  title: string
  status: string
  requestedAmount: number
  approvedAmount: number | null
  notes: string | null
  submittedAt: string | null
  approvedAt: string | null
  creator: { id: string; name: string }
  approver: { id: string; name: string } | null
  sections: ComboSection[]
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:              { label: 'Draft',               cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  SUBMITTED:          { label: 'Submitted',           cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  APPROVED:           { label: 'Approved',            cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  PARTIALLY_APPROVED: { label: 'Partially Approved',  cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  PARTIALLY_PAID:     { label: 'Partially Paid',      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  PAID:               { label: 'Paid',                cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED:          { label: 'Cancelled',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  SETTLE_REQUESTED:   { label: 'Awaiting Settlement', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  SETTLED:            { label: 'Settled',             cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
}

const SECTION_ICONS: Record<string, string> = {
  GROCERY: '🛒',
  MONTHLY_CONTRIBUTION: '📅',
  SCHOOL_FEES: '🎓',
  CUSTOM: '📋',
}

const SECTION_LABELS: Record<string, string> = {
  GROCERY: 'Grocery / Supplies',
  MONTHLY_CONTRIBUTION: 'Monthly Contribution',
  SCHOOL_FEES: 'School Fees',
  CUSTOM: 'Custom',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolvePayee(section: ComboSection): PayeeInfo | null {
  if (section.payeeEmployee) return { name: section.payeeEmployee.fullName, phone: section.payeeEmployee.phone }
  if (section.payeePerson)   return { name: section.payeePerson.fullName,   phone: section.payeePerson.phone }
  if (section.payeeSupplier) return { name: section.payeeSupplier.name,     phone: section.payeeSupplier.phone, contactPerson: section.payeeSupplier.contactPerson }
  if (section.payeeUser)     return { name: section.payeeUser.name }
  if (section.payeeBusiness) return { name: section.payeeBusiness.name }
  return null
}

function formatPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  try { return formatPhoneNumberForDisplay(raw) || raw } catch { return raw }
}

export function ComboRequestDetailModal({
  isOpen,
  onClose,
  accountId,
  comboRequestId,
}: {
  isOpen: boolean
  onClose: () => void
  accountId: string
  comboRequestId: string
}) {
  const [request, setRequest] = useState<ComboRequestSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !accountId || !comboRequestId) { setRequest(null); return }
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/combo-requests/${comboRequestId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const raw = d?.data
        if (!raw) return
        setRequest({
          ...raw,
          requestedAmount: Number(raw.requestedAmount),
          approvedAmount: raw.approvedAmount !== null ? Number(raw.approvedAmount) : null,
          sections: (raw.sections ?? []).map((s: any) => ({
            ...s,
            items: (s.items ?? []).map((i: any) => ({
              ...i,
              estimatedAmount: i.estimatedAmount !== null ? Number(i.estimatedAmount) : null,
              approvedAmount: i.approvedAmount !== null ? Number(i.approvedAmount) : null,
              paidAmount: i.paidAmount !== null ? Number(i.paidAmount) : null,
            })),
          })),
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, accountId, comboRequestId])

  if (!isOpen) return null

  const statusInfo = STATUS_BADGE[request?.status ?? ''] ?? { label: request?.status ?? '', cls: 'bg-gray-100 text-gray-600' }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-border w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🧾</span>
            <h3 className="text-base font-semibold text-primary truncate">
              {loading ? 'Combo Request' : (request?.title ?? 'Combo Request')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 ml-2"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
          ) : !request ? (
            <p className="text-sm text-gray-400 py-8 text-center">Request not found</p>
          ) : (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Requested by <span className="font-medium text-primary">{request.creator.name}</span>
                  {request.submittedAt && <> · submitted {fmtDate(request.submittedAt)}</>}
                </span>
              </div>

              {/* Amount pills */}
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Requested</span>
                  <span className="text-sm font-semibold text-primary">{fmt(request.requestedAmount)}</span>
                </div>
                {request.approvedAmount !== null && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Approved</span>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">{fmt(request.approvedAmount)}</span>
                  </div>
                )}
                {request.approver && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Approved by</span>
                    <span className="text-sm font-medium text-primary">{request.approver.name}</span>
                  </div>
                )}
              </div>

              {request.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
                  {request.notes}
                </p>
              )}

              {/* Sections & items */}
              {request.sections.length > 0 && (
                <div className="space-y-3">
                  {request.sections.map(section => {
                    const payee = resolvePayee(section)
                    const phone = formatPhone(payee?.phone)
                    return (
                    <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Section header */}
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span>{SECTION_ICONS[section.sectionType] ?? '📋'}</span>
                          <span className="text-xs font-semibold text-primary">
                            {section.sectionName ?? SECTION_LABELS[section.sectionType] ?? section.sectionType}
                          </span>
                        </div>
                        {payee && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">👤 {payee.name}</span>
                            {payee.contactPerson && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">c/o {payee.contactPerson}</span>
                            )}
                            {phone && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">📞 {phone}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Items */}
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {section.items.map(item => (
                          <div key={item.id} className="px-3 py-2 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-primary truncate">{item.description}</p>
                              {item.quantity && (
                                <p className="text-xs text-gray-400">
                                  qty {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-gray-400 italic truncate">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {item.approvedAmount !== null ? (
                                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                  {fmt(item.approvedAmount)}
                                </span>
                              ) : item.estimatedAmount !== null ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ~{fmt(item.estimatedAmount)}
                                </span>
                              ) : null}
                              {item.isPaid && (
                                <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ paid</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-between items-center shrink-0">
          {request && (
            <a
              href={`/expense-accounts/${accountId}/combo-requests/${comboRequestId}`}
              onClick={onClose}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              View full details →
            </a>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

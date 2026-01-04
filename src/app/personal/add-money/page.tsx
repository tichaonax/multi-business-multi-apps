'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface FundSource {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  usageCount: number
}

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  remainingBalance: number
  borrowerBusiness?: { name: string }
  borrowerPerson?: { fullName: string; phone?: string }
  lenderBusiness?: { name: string }
  borrowerType: 'business' | 'person'
}

export default function AddMoneyPage() {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [fundSources, setFundSources] = useState<FundSource[]>([])
  const [moneyType, setMoneyType] = useState<'regular' | 'loan-repayment'>('regular')
  const [loanRepaymentType, setLoanRepaymentType] = useState<'business' | 'person'>('business')
  const [selectedLoan, setSelectedLoan] = useState('')
  const [businessLoans, setBusinessLoans] = useState<Loan[]>([])
  const [personLoans, setPersonLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Default fund sources
  const defaultSources = [
    '💰 Salary',
    '🏢 Freelance Payment', 
    '💼 Business Income',
    '🎁 Gift Money',
    '💳 Refund',
    '📈 Investment Return',
    '🏦 Tax Refund',
    '💵 Cash Deposit',
    '🔄 Transfer from Savings'
  ]

  useEffect(() => {
    // Fetch custom fund sources
    fetch('/api/personal/fund-sources')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setFundSources(data)
        } else {
          console.error('Fund sources API returned non-array:', data)
          setFundSources([])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch fund sources:', error)
        setFundSources([])
      })

    // Fetch existing loans where user is the lender (loans that can receive repayments)
    fetch('/api/personal/loans?type=existing')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const businessLoansList = data.filter(loan => loan.borrowerType === 'business')
          const personLoansList = data.filter(loan => loan.borrowerType === 'person')
          setBusinessLoans(businessLoansList)
          setPersonLoans(personLoansList)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch loans:', error)
        setBusinessLoans([])
        setPersonLoans([])
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (moneyType === 'loan-repayment') {
      // Handle loan repayment
      if (!amount || Number(amount) <= 0 || !selectedLoan) return
      
      setLoading(true)
      try {
        // Create loan payment through expenses API (this will add money back to budget)
        const response = await fetch('/api/personal/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            description: 'Loan repayment received',
            category: 'Loan Payment',
            date: new Date().toISOString().split('T')[0],
            paymentType: 'loan',
            loanId: selectedLoan,
            loanType: 'existing',
            notes: `Repayment from ${loanRepaymentType === 'business' ? 'business' : 'person'}`
          })
        })

        if (response.ok) {
          // Use replace instead of push to prevent back button from returning to form
          router.replace('/personal')
        } else {
          const errorData = await response.json()
          console.error('Failed to record loan repayment:', errorData)
        }
      } catch (error) {
        console.error('Error recording loan repayment:', error)
      } finally {
        setLoading(false)
      }
    } else {
      // Handle regular money deposit
      const finalDescription = selectedSource === 'custom' ? customDescription : (selectedSource || description)
      if (!amount || Number(amount) <= 0 || !finalDescription) return

      setLoading(true)
      try {
        const response = await fetch('/api/personal/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            description: finalDescription,
            type: 'deposit'
          })
        })

        if (response.ok) {
          // Use replace instead of push to prevent back button from returning to form
          router.replace('/personal')
        } else {
          console.error('Failed to add money')
        }
      } catch (error) {
        console.error('Error adding money:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <ProtectedRoute module="personal">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">💰 Add Money</h1>
          <div className="flex gap-3">
            <Link
              href="/personal/fund-sources"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Manage Sources
            </Link>
            <Link
              href="/personal"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ← Back to Personal
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Type of Money Addition *
              </label>
              <div className="flex gap-6">
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="moneyType"
                    value="regular"
                    checked={moneyType === 'regular'}
                    onChange={(e) => setMoneyType(e.target.value as 'regular' | 'loan-repayment')}
                    className="mr-2"
                  />
                  💰 Regular Income
                </label>
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="moneyType"
                    value="loan-repayment"
                    checked={moneyType === 'loan-repayment'}
                    onChange={(e) => setMoneyType(e.target.value as 'regular' | 'loan-repayment')}
                    className="mr-2"
                  />
                  🏦 Loan Repayment
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {moneyType === 'loan-repayment' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Repayment From *
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="loanRepaymentType"
                        value="business"
                        checked={loanRepaymentType === 'business'}
                        onChange={(e) => {
                          setLoanRepaymentType(e.target.value as 'business' | 'person')
                          setSelectedLoan('')
                        }}
                        className="mr-2"
                      />
                      🏢 Business
                    </label>
                    <label className="flex items-center text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="loanRepaymentType"
                        value="person"
                        checked={loanRepaymentType === 'person'}
                        onChange={(e) => {
                          setLoanRepaymentType(e.target.value as 'business' | 'person')
                          setSelectedLoan('')
                        }}
                        className="mr-2"
                      />
                      👤 Individual Person
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="loanSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Loan to Receive Payment *
                  </label>
                  <select
                    id="loanSelect"
                    value={selectedLoan}
                    onChange={(e) => setSelectedLoan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a loan...</option>
                    {(loanRepaymentType === 'business' ? businessLoans : personLoans).map(loan => (
                      <option key={loan.id} value={loan.id}>
                        {loan.loanNumber} - {
                          loanRepaymentType === 'business' 
                            ? loan.borrowerBusiness?.name 
                            : `${loan.borrowerPerson?.fullName}${loan.borrowerPerson?.phone ? ` • ${formatPhoneNumberForDisplay(loan.borrowerPerson.phone)}` : ''}`
                        } - Balance: ${loan.remainingBalance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {moneyType === 'regular' && (
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source of Funds *
                </label>
              <select
                id="source"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select source of funds</option>
                
                {/* Custom fund sources (most used first) */}
                {Array.isArray(fundSources) && fundSources.map(source => (
                  <option key={source.id} value={`${source.emoji} ${source.name}`}>
                    {source.emoji} {source.name} ({source.usageCount} times)
                  </option>
                ))}
                
                {Array.isArray(fundSources) && fundSources.length > 0 && <option disabled>────── Default Sources ──────</option>}
                
                {/* Default sources */}
                {defaultSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
                
                <option value="custom">✏️ Custom Description</option>
              </select>
              
              {selectedSource === 'custom' && (
                <div className="mt-4">
                  <label htmlFor="customDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Description *
                  </label>
                  <input
                    type="text"
                    id="customDescription"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter custom description..."
                    required
                  />
                </div>
              )}
            </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={
                  loading || 
                  !amount || 
                  Number(amount) <= 0 || 
                  (moneyType === 'regular' && ((!selectedSource && !description) || (selectedSource === 'custom' && !customDescription))) ||
                  (moneyType === 'loan-repayment' && !selectedLoan)
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? (moneyType === 'loan-repayment' ? 'Recording...' : 'Adding...') : (moneyType === 'loan-repayment' ? 'Record Payment' : 'Add Money')}
              </button>
              
              <Link
                href="/personal"
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
}
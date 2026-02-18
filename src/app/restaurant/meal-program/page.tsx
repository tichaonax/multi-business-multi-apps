'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'

export default function MealProgramHubPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()

  const cards = [
    {
      href: '/restaurant/meal-program/participants',
      emoji: '👥',
      title: 'Participants',
      description: 'Register external participants and view employee eligibility status',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    },
    {
      href: '/restaurant/meal-program/eligible-items',
      emoji: '🍱',
      title: 'Eligible Items',
      description: 'Configure which menu items are included in the $0.50 daily program',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    },
    {
      href: '/restaurant/reports/meal-program',
      emoji: '📊',
      title: 'Reports',
      description: 'Salesperson summaries, participant history, and expense totals',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    },
  ]

  return (
    <ProtectedRoute>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="🍽️ Employee Meal Program"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Meal Program', isActive: true },
          ]}
        >
          {/* Info banner */}
          <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🍽️</span>
              <div>
                <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  $0.50 Daily Meal Subsidy Program
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Each enrolled participant receives a flat{' '}
                  <span className="font-bold">$0.50 daily subsidy</span> automatically debited from
                  the business expense account. The $0.50 covers one program item entirely, or is
                  applied as a partial subsidy toward any other menu item (participant pays the
                  difference). Unused subsidies are forfeited daily.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card) => (
              <Link key={card.href} href={card.href} className="block group">
                <div
                  className={`border rounded-xl p-6 ${card.bg} hover:shadow-md transition-shadow h-full`}
                >
                  <div className={`text-4xl mb-4`}>{card.emoji}</div>
                  <h3 className={`text-lg font-semibold mb-2 ${card.color}`}>{card.title}</h3>
                  <p className="text-sm text-secondary">{card.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* POS shortcut */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-primary">Ready to process a meal program sale?</p>
              <p className="text-sm text-secondary mt-0.5">
                Use the Meal Program mode inside the Restaurant POS.
              </p>
            </div>
            <Link
              href="/restaurant/pos"
              className="ml-4 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              Open POS →
            </Link>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </ProtectedRoute>
  )
}

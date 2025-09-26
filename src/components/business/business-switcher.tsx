'use client'

import { useState } from 'react';
import { BusinessMembership } from '@/types/permissions';

interface BusinessSwitcherProps {
  currentBusiness: BusinessMembership | null;
  businesses: BusinessMembership[];
  onSwitch: (businessId: string) => Promise<void>;
  loading?: boolean;
}

export function BusinessSwitcher({ 
  currentBusiness, 
  businesses, 
  onSwitch, 
  loading = false 
}: BusinessSwitcherProps) {
  
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !currentBusiness) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="text-gray-400">🏢</span>
        <span className="max-w-48 truncate">{currentBusiness.businessName}</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute z-20 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Switch Business
              </div>
              {businesses
                .filter((business) => business.businessId !== currentBusiness.businessId)
                .map((business) => (
                <button
                  key={business.businessId}
                  onClick={async () => {
                    try {
                      await onSwitch(business.businessId);

                      // Track last accessed business for future logins
                      try {
                        const response = await fetch('/api/user/last-accessed-business', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            businessId: business.businessId,
                            businessType: business.businessType,
                          }),
                        });

                        if (response.ok) {
                          // console.log(`📝 Tracked last accessed business: ${business.businessName}`);
                        } else {
                          // console.warn('Failed to track last accessed business');
                        }
                      } catch (trackError) {
                        // console.warn('Error tracking last accessed business:', trackError);
                      }
                    } catch (error) {
                      console.error('Failed to switch business:', error);
                    }
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors text-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">🏢</span>
                    <span className="truncate">{business.businessName}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {business.role.replace('-', ' ')}
                  </div>
                </button>
              ))}
              
              {businesses.filter((business) => business.businessId !== currentBusiness.businessId).length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No other businesses available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
'use client'

import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context';
import { BusinessPermissions } from '@/types/permissions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface BusinessProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof BusinessPermissions;
  requiredPermissions?: (keyof BusinessPermissions)[];
  requireAny?: (keyof BusinessPermissions)[]; // OR logic - user needs ANY of these permissions
  fallbackComponent?: React.ReactNode;
  redirectTo?: string;
}

export function BusinessProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAny = [],
  fallbackComponent,
  redirectTo = '/dashboard',
}: BusinessProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { 
    hasPermission, 
    currentBusiness, 
    loading, 
    error,
    isAuthenticated 
  } = useBusinessPermissionsContext();

  // Combine single permission with array
  const allRequiredPermissions = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions,
  ];

  useEffect(() => {
    if (status === 'loading' || loading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    // Redirect if no business access
    if (!currentBusiness) {
      router.push('/onboarding/select-business');
      return;
    }

    // Check if user has required permissions
    if (allRequiredPermissions.length > 0) {
      const hasAllPermissions = allRequiredPermissions.every(permission =>
        hasPermission(permission)
      );

      if (!hasAllPermissions && redirectTo) {
        router.push(redirectTo);
        return;
      }
    }

    // Check if user has any of the required permissions (OR logic)
    if (requireAny.length > 0) {
      const hasAnyPermission = requireAny.some(permission =>
        hasPermission(permission)
      );

      if (!hasAnyPermission && redirectTo) {
        router.push(redirectTo);
        return;
      }
    }
  }, [
    status, 
    loading, 
    isAuthenticated, 
    currentBusiness, 
    allRequiredPermissions,
    requireAny, 
    hasPermission, 
    router, 
    redirectTo
  ]);

  // Show loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if no business access
  if (!currentBusiness) {
    return null;
  }

  // Check permissions and show fallback if needed
  if (allRequiredPermissions.length > 0) {
    const hasAllPermissions = allRequiredPermissions.every(permission =>
      hasPermission(permission)
    );

    if (!hasAllPermissions) {
      if (fallbackComponent) {
        return <>{fallbackComponent}</>;
      }

      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this resource in{' '}
              <span className="font-semibold">{currentBusiness.businessName}</span>.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Convenience component for business admin only routes
export function BusinessAdminRoute({
  children,
  fallbackComponent,
}: {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}) {
  return (
    <BusinessProtectedRoute
      requiredPermissions={['canManageBusinessUsers', 'canEditBusiness']}
      fallbackComponent={fallbackComponent}
    >
      {children}
    </BusinessProtectedRoute>
  );
}

// Convenience component for business owner only routes
export function BusinessOwnerRoute({
  children,
  fallbackComponent,
}: {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}) {
  const { isBusinessOwner } = useBusinessPermissionsContext();
  
  if (!isBusinessOwner) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Owner Access Required</h2>
          <p className="text-gray-600 mb-4">
            This section is only available to business owners.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
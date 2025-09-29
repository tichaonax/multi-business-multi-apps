"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from "react";
import { useSession } from "next-auth/react";
import { BusinessPermissions, BusinessMembership, hasBusinessPermission, getActiveBusinesses } from "@/types/permissions";
import { useToastContext } from '@/components/ui/toast'
import AdminSeedPromptModal from '@/components/admin/admin-seed-prompt-modal'

interface BusinessPermissionsContextType {
  currentBusinessId: string | null;
  currentBusiness: BusinessMembership | null;
  hasPermission: (permission: keyof BusinessPermissions) => boolean;
  hasPermissionInBusiness: (permission: keyof BusinessPermissions, businessId: string) => boolean;
  businesses: BusinessMembership[];
  activeBusinesses: BusinessMembership[];
  switchBusiness: (businessId: string) => Promise<void>;
  isSystemAdmin: boolean;
  isBusinessOwner: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const BusinessPermissionsContext = createContext<BusinessPermissionsContextType | undefined>(undefined);

interface BusinessPermissionsProviderProps {
  children: ReactNode;
}

export function BusinessPermissionsProvider({ children }: BusinessPermissionsProviderProps) {
  const { data: session, status } = useSession();
  const toast = useToastContext()
  const [showSeedModal, setShowSeedModal] = useState(false)
  const [seedTargetBusiness, setSeedTargetBusiness] = useState<string | null>(null)
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!session?.user;
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status === "loading" || !session?.user?.id) {
      if (status !== "loading") setLoading(false);
      return;
    }

    const fetchBusinessMemberships = async () => {
      try {
        // Abort any prior in-flight request before starting a new one
        if (controllerRef.current) controllerRef.current.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const signal = controller.signal;

        const res = await fetch("/api/user/business-memberships", { signal });
        if (!res.ok) throw new Error("Failed to fetch business memberships");
        const memberships: BusinessMembership[] = await res.json();
        setBusinesses(memberships);

        // If we don't have a current business set, select a sensible default
        if (!currentBusinessId) {
          const activeMemberships = getActiveBusinesses(memberships);
          if (activeMemberships.length > 0) {
            setCurrentBusinessId(activeMemberships[0].businessId);

            // Try to load the user's last accessed business in the background
            fetch("/api/user/last-accessed-business")
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                const lastAccessedId = data?.lastAccessed?.businessId;
                if (
                  lastAccessedId &&
                  lastAccessedId !== activeMemberships[0].businessId &&
                  activeMemberships.some((m) => m.businessId === lastAccessedId)
                ) {
                  setCurrentBusinessId(lastAccessedId);
                }
              })
              .catch(() => {
                /* ignore */
              });
          }
        }

        setError(null);
      } catch (err) {
        const name = (err as any)?.name;
        if (name === "AbortError") return; // expected during rapid navigation
        setError(err instanceof Error ? err.message : "Failed to load business data");
        console.error("Error fetching business memberships:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessMemberships();

    return () => {
      controllerRef.current?.abort();
    };
    // Intentionally exclude currentBusinessId from deps to avoid loops when we set it here
  }, [session?.user?.id, status]);

  const currentBusiness = useMemo(() => {
    return businesses.find((b) => b.businessId === currentBusinessId && b.isActive) || null;
  }, [businesses, currentBusinessId]);

  const hasPermission = (permission: keyof BusinessPermissions): boolean => {
    if (session?.user?.role === "admin") return true;
    return hasBusinessPermission(currentBusiness, permission);
  };

  const hasPermissionInBusiness = (permission: keyof BusinessPermissions, businessId: string): boolean => {
    if (session?.user?.role === "admin") return true;
    const membership = businesses.find((b) => b.businessId === businessId && b.isActive);
    return hasBusinessPermission(membership, permission);
  };

  const switchBusiness = async (businessId: string): Promise<void> => {
    let membership = businesses.find((b) => b.businessId === businessId && b.isActive);
    if (!membership) {
      // The memberships cache may be stale (demo seeding/unseeding operations can change available businesses).
      // Try a one-off refetch to avoid spurious console errors and to pick up newly-created demo businesses.
      try {
        const res = await fetch("/api/user/business-memberships");
        if (res.ok) {
          const refreshed: BusinessMembership[] = await res.json();
          setBusinesses(refreshed);
          membership = refreshed.find((b) => b.businessId === businessId && b.isActive) || undefined;
        }
      } catch (err) {
        // ignore network errors here; we'll handle below
      }

      if (!membership) {
        // If the user is an admin, offer to create dev/demo data for them via a nicer modal
        const isAdmin = session?.user?.role === 'admin';
        if (isAdmin) {
          // For admins, first check if the business exists on the server. If it does, try to set it
          // as the current business (server will allow admin switches). Only show the seed modal
          // if the business truly does not exist.
          try {
            const check = await fetch(`/api/businesses/${businessId}`)
            if (check.ok) {
              // Attempt to set current business on server (admin path).
              await fetch('/api/user/set-current-business', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId })
              })

              // Refresh memberships in background (may or may not include admin-created membership)
              try {
                const r2 = await fetch('/api/user/business-memberships')
                if (r2.ok) {
                  const refreshed2: BusinessMembership[] = await r2.json()
                  setBusinesses(refreshed2)
                }
              } catch (e) {
                // ignore
              }

              // Update current business id locally and return
              setCurrentBusinessId(businessId)
              return
            }
          } catch (e) {
            // network error or 404 — fall through to show seed modal
          }

          // Show modal and allow user to pick targeted seed or full dev dataset
          setSeedTargetBusiness(businessId)
          setShowSeedModal(true)
          // Wait for modal action via onConfirm below (it will update membership or show toasts)
          return
        }

        console.warn("Business not found for switch (after refresh):", businessId);
        return;
      }
    }

    const updated = [membership, ...businesses.filter((b) => b.businessId !== businessId)];
    setBusinesses(updated);
    setCurrentBusinessId(businessId);

    try {
      await fetch("/api/user/set-current-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
    } catch (err) {
      console.error("Failed to sync business switch with backend:", err);
    }
  };

  const activeBusinesses = getActiveBusinesses(businesses);
  const isSystemAdmin = currentBusiness?.permissions?.canManageAllBusinesses || false;
  const isBusinessOwner = currentBusiness?.role === "business-owner";

  const contextValue: BusinessPermissionsContextType = {
    currentBusinessId,
    currentBusiness,
    hasPermission,
    hasPermissionInBusiness,
    businesses,
    activeBusinesses,
    switchBusiness,
    isSystemAdmin,
    isBusinessOwner,
    isAuthenticated,
    loading: loading || status === "loading",
    error,
  };

  const handleSeedConfirm = async (useTargeted: boolean) => {
    setShowSeedModal(false)
    if (!seedTargetBusiness) return
    try {
      toast.push('Starting demo seed...')

      // Optional: let the API infer script type from businessId, but include an explicit hint when sensible
      const hintType = seedTargetBusiness.includes('hardware')
        ? 'hardware'
        : seedTargetBusiness.includes('grocery')
        ? 'grocery'
        : seedTargetBusiness.includes('contractors')
        ? 'contractors'
        : seedTargetBusiness.includes('fleet') || seedTargetBusiness.includes('maintenance')
        ? 'maintenance'
        : undefined

      if (useTargeted) {
        // Try targeted endpoint first
        const payload: any = { businessId: seedTargetBusiness, confirm: true }
        if (hintType) payload.type = hintType
        const res = await fetch('/api/admin/seed-business-by-id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

        if (res.status === 501) {
          // Targeted seeding not implemented on server for this script; fall back to full dev seed
          toast.push('Targeted seed not available, falling back to full dev dataset...')
          const nowSuffix = Date.now().toString().slice(-6)
          const confirmText = `CREATE-DEV-SEED-${nowSuffix}`
          const fallback = await fetch('/api/admin/seed-dev-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, confirmText }) })
          const json = await fallback.json().catch(() => ({}))
          if (!fallback.ok) {
            toast.push(json?.message || 'Fallback dev seed failed')
            return
          }
          toast.push('Fallback dev seed completed')
        } else {
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            toast.push(json?.message || 'Targeted seed failed')
            return
          }

          // Success: show whether it ran in-process or via node
            if (json?.ranInProcess) toast.push('Targeted seed completed (in-process)')
            else toast.push('Targeted seed completed')

            // If server auto-created the target business placeholder, refresh memberships and switch to it
            if (json?.createdBusiness) {
              try {
                const r2 = await fetch('/api/user/business-memberships')
                if (r2.ok) {
                  const refreshed2: BusinessMembership[] = await r2.json()
                  setBusinesses(refreshed2)
                  const found = refreshed2.find((b) => b.businessId === json.createdBusiness && b.isActive)
                  if (found) {
                    setCurrentBusinessId(json.createdBusiness)
                    toast.push('Switched to newly-created business')
                  }
                }
              } catch (err) {
                // ignore
              }
            }
        }
      } else {
        // Full dev dataset
        toast.push('Seeding full dev dataset...')
        const nowSuffix = Date.now().toString().slice(-6)
        const confirmText = `CREATE-DEV-SEED-${nowSuffix}`
        const res = await fetch('/api/admin/seed-dev-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, confirmText }) })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.push(json?.message || 'Dev seed failed')
          return
        }
        toast.push('Dev seed completed')
      }

      // Refresh memberships and try to switch to newly-created business
      toast.push('Refreshing businesses...')
      try {
        // Helper: attempt to refresh memberships multiple times with a short delay
        const attemptRefresh = async (attempts = 4, delayMs = 1500) => {
          for (let i = 0; i < attempts; i++) {
            try {
              const r = await fetch('/api/user/business-memberships')
              if (!r.ok) continue
              const refreshed: BusinessMembership[] = await r.json()
              setBusinesses(refreshed)
              const found = refreshed.find((b) => b.businessId === seedTargetBusiness && b.isActive)
              if (found) return found
            } catch (e) {
              // ignore and retry
            }
            // wait before next attempt to give server time to finish background creation
            // eslint-disable-next-line no-await-in-loop
            await new Promise((res) => setTimeout(res, delayMs))
          }
          return undefined
        }

        const found = await attemptRefresh(5, 1500)
        if (found) {
          setCurrentBusinessId(seedTargetBusiness)
          toast.push('Switched to newly-seeded business')
        } else {
          // Give one final, actionable notice and log details for debugging
          const msg = `Demo seed completed but business ${seedTargetBusiness} not found after retries`
          toast.push(msg)
          toast.push('Try refreshing memberships, check server seed logs, or re-run the targeted seed')
          // Helpful console output for admins/developers checking the browser console
          // (keeps visibility when toast may be missed)
          // eslint-disable-next-line no-console
          console.warn('Seed finished but target business not found:', { businessId: seedTargetBusiness })
        }
      } catch (err) {
        // ignore network/other transient errors here
      }
    } catch (err: any) {
      toast.push('Seeding failed: ' + (err?.message || String(err)))
    } finally {
      setSeedTargetBusiness(null)
    }
  }

  return (
    <BusinessPermissionsContext.Provider value={contextValue}>
      {children}
      <AdminSeedPromptModal isOpen={showSeedModal} onClose={() => setShowSeedModal(false)} businessId={seedTargetBusiness} onConfirm={handleSeedConfirm} />
    </BusinessPermissionsContext.Provider>
  )
}

export function useBusinessPermissionsContext(): BusinessPermissionsContextType {
  const context = useContext(BusinessPermissionsContext);
  if (context === undefined) throw new Error("useBusinessPermissionsContext must be used within a BusinessPermissionsProvider");
  return context;
}

export const useBusinessPermissions = useBusinessPermissionsContext;
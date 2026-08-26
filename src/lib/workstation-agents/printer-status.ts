/**
 * Shared "what's actually configured for this workstation" lookup — used by
 * BOTH the agent's own periodic sync (agent-hub.ts's handleSync(), which the
 * tray/Manage Profiles page ultimately display) AND the business-facing
 * admin list (GET /api/admin/workstation-agents), so the web page can show
 * an admin the current setup status without needing anything live from the
 * agent's own connection — it's the exact same database read either way.
 * Keeping this in one place avoids the two call sites silently drifting
 * apart on what "configured" means.
 */

import { prisma } from '@/lib/prisma'

/** Printers actually routed through this workstation via AGENT relay mode. */
export async function getAgentRelayedPrinters(workstationAgentId: string): Promise<string[]> {
  const printers = await prisma.networkPrinters.findMany({
    where: { workstationAgentId, connectionMode: 'AGENT' },
    select: { printerName: true },
  })
  return printers.map(p => p.printerName)
}

/**
 * QZ Tray's printer for this workstation — a separate, browser-driven print
 * path this agent/server has no control over, just visibility into (see
 * qz-config/route.ts). Prefers this exact workstation's own saved config;
 * falls back to the business-wide default when this workstation has none of
 * its own.
 */
export async function getQzPrinterName(businessId: string, workstationAgentId: string): Promise<string | undefined> {
  const config = await prisma.qzPrinterConfigs.findFirst({ where: { businessId, workstationAgentId } })
    ?? await prisma.qzPrinterConfigs.findFirst({ where: { businessId, workstationAgentId: null } })
  return config?.printerName
}

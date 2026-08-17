import { prisma } from '@/lib/prisma'

// Auto-advances a job from 'open' to 'in_progress' the moment any one of its
// tasks starts — staff/contractors no longer need to remember to flip the
// job status pill by hand once real work begins. Never touches a job
// already past 'open' (in_progress, completed, billed, cancelled all stay
// exactly as they are) — this only ever moves the job forward, once.
export async function autoAdvanceJobIfOpen(jobId: string, currentJobStatus: string): Promise<void> {
  if (currentJobStatus !== 'open') return
  await prisma.vehicleServiceJobs.update({ where: { id: jobId }, data: { status: 'in_progress' } })
}

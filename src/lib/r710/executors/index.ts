import type { R710Executor } from './types'
import { directExecutor } from './direct-executor'
import { remoteAgentExecutor } from './remote-agent-executor'

export type {
  R710Executor,
  R710DeviceTarget,
  R710GuestPassParams,
  R710GuestPassResult,
  R710BulkGenerateResult,
  R710QueryTokensResult,
  R710ExecutorContext,
} from './types'

/** connectionMode is the Prisma R710ConnectionMode enum value ('DIRECT' | 'AGENT'). */
export function getR710Executor(connectionMode: string): R710Executor {
  return connectionMode === 'AGENT' ? remoteAgentExecutor : directExecutor
}

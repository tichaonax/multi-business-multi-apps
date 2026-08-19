/**
 * R710 Agent Hub — dispatch, timeout, and disconnect behavior (MBM-272)
 */

import { EventEmitter } from 'events'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    r710RemoteAgents: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { r710AgentHub, AgentDispatchError } from '../agent-hub'

const AGENT_TOKEN = 'test-agent-token'
const AGENT_TOKEN_HASH = require('bcryptjs').hashSync(AGENT_TOKEN, 4)
const DEVICE_ID = 'device-1'
const AGENT_ID = 'agent-1'

// Minimal fake Socket.io Server + Socket good enough for agent-hub's usage:
// io.on('connection', cb), socket.join/emit/disconnect, io.to(room).emit(),
// io.sockets.sockets.get(id).
class FakeSocket extends EventEmitter {
  id: string
  data: Record<string, unknown> = {}
  rooms = new Set<string>()
  disconnected = false
  constructor(id: string) {
    super()
    this.id = id
  }
  join(room: string) { this.rooms.add(room) }
  disconnect() { this.disconnected = true; this.emit('disconnect') }
}

class FakeIo extends EventEmitter {
  sockets = { sockets: new Map<string, FakeSocket>() }
  private roomEmits: Array<{ room: string; event: string; payload: unknown }> = []

  addSocket(socket: FakeSocket) {
    this.sockets.sockets.set(socket.id, socket)
    this.emit('connection', socket)
  }

  to(room: string) {
    return {
      emit: (event: string, payload: unknown) => {
        this.roomEmits.push({ room, event, payload })
        for (const socket of this.sockets.sockets.values()) {
          if (socket.rooms.has(room)) socket.emit(`__sent:${event}`, payload)
        }
      },
    }
  }

  lastEmit() {
    return this.roomEmits[this.roomEmits.length - 1]
  }
}

async function connectAgent(io: FakeIo, socketId: string): Promise<FakeSocket> {
  const socket = new FakeSocket(socketId)
  io.addSocket(socket)
  await new Promise<void>((resolve) => {
    socket.emit('r710-agent:connect', { agentToken: AGENT_TOKEN }, () => resolve())
  })
  return socket
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(prisma.r710RemoteAgents.findMany as jest.Mock).mockResolvedValue([
    { id: AGENT_ID, deviceRegistryId: DEVICE_ID, agentTokenHash: AGENT_TOKEN_HASH },
  ])
})

describe('R710AgentHub', () => {
  it('rejects dispatch with AGENT_OFFLINE when no agent is connected', async () => {
    const io = new FakeIo()
    r710AgentHub.attach(io as any)

    await expect(
      r710AgentHub.dispatchJob('unpaired-device', { jobType: 'HEALTH_CHECK', device: { ipAddress: 'x', adminUsername: 'a', adminPassword: 'b' } })
    ).rejects.toMatchObject({ code: 'AGENT_OFFLINE' })
  })

  it('authenticates a connecting agent and dispatches/resolves a job', async () => {
    const io = new FakeIo()
    r710AgentHub.attach(io as any)
    const socket = await connectAgent(io, 'socket-a')

    const dispatchPromise = r710AgentHub.dispatchJob(DEVICE_ID, {
      jobType: 'TOKEN_GENERATE',
      device: { ipAddress: '192.168.1.77', adminUsername: 'admin', adminPassword: 'pw' },
    })

    const sentJob = io.lastEmit()
    expect(sentJob.event).toBe('r710-agent:job')
    const jobId = (sentJob.payload as any).jobId

    socket.emit('r710-agent:result', { jobId, success: true, data: { token: { username: 'u', password: 'p' } } })

    const result = await dispatchPromise
    expect(result.success).toBe(true)
  })

  it('rejects with TIMEOUT and discards a late response instead of double-resolving', async () => {
    jest.useFakeTimers()
    const io = new FakeIo()
    r710AgentHub.attach(io as any)
    const socket = await connectAgent(io, 'socket-b')

    const dispatchPromise = r710AgentHub.dispatchJob(DEVICE_ID, {
      jobType: 'TOKEN_GENERATE',
      device: { ipAddress: '192.168.1.77', adminUsername: 'admin', adminPassword: 'pw' },
    })
    const jobId = (io.lastEmit().payload as any).jobId

    const assertion = expect(dispatchPromise).rejects.toMatchObject({ code: 'TIMEOUT' })
    jest.advanceTimersByTime(25_000)
    await assertion

    // Late response after timeout must not throw or resolve anything further.
    expect(() => socket.emit('r710-agent:result', { jobId, success: true })).not.toThrow()

    jest.useRealTimers()
  })

  it('immediately fails pending jobs as AGENT_OFFLINE when the agent disconnects mid-flight', async () => {
    const io = new FakeIo()
    r710AgentHub.attach(io as any)
    const socket = await connectAgent(io, 'socket-c')

    const dispatchPromise = r710AgentHub.dispatchJob(DEVICE_ID, {
      jobType: 'TOKEN_GENERATE',
      device: { ipAddress: '192.168.1.77', adminUsername: 'admin', adminPassword: 'pw' },
    })

    socket.disconnect()

    await expect(dispatchPromise).rejects.toMatchObject({ code: 'AGENT_OFFLINE' })
  })
})

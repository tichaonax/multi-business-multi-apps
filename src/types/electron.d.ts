export interface ScaleWeight {
  weight: number
  stable: boolean
  overload: boolean
  error: boolean
  unit: 'kg' | 'g' | 'lb'
}

export interface ScaleStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  comPort: string | null
  error?: string
}

export interface ComPort {
  path: string
  manufacturer: string | null
  serialNumber: string | null
  pnpId: string | null
  vendorId: string | null
  productId: string | null
}

export interface ActiveServer {
  id: string
  label: string
  host: string
  url: string
}

export interface DefaultBusiness {
  id: string
  label: string
}

export interface SetDefaultBusinessResult {
  ok: boolean
  message?: string
}

export interface ElectronAPI {
  isElectron: true
  getDisplays: () => Promise<unknown[]>
  reopenCustomerDisplay: () => void
  quit: () => void
  switchServer: () => Promise<boolean>
  getActiveServer: () => Promise<ActiveServer | null>
  getDefaultBusiness: () => Promise<DefaultBusiness | null>
  setDefaultBusiness: (pin: string, businessId: string, businessLabel: string) => Promise<SetDefaultBusinessResult>
  hasPin: () => Promise<boolean>
  setPin: (pin: string) => Promise<boolean>
  scale: {
    listPorts: () => Promise<ComPort[]>
    getSavedPort: () => Promise<string | null>
    getSavedBaud: () => Promise<number | null>
    connect: (comPort: string, baudRate?: number) => Promise<{ ok: boolean }>
    disconnect: () => Promise<{ ok: boolean }>
    tare: () => Promise<{ ok: boolean }>
    detectBaud: (comPort: string) => Promise<{ baudRate: number | null }>
    onWeight: (callback: (data: ScaleWeight) => void) => () => void
    onStatus: (callback: (data: ScaleStatus) => void) => () => void
  }
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

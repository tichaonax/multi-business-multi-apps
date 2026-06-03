export interface ScaleWeight {
  weight: number
  stable: boolean
  overload: boolean
  error: boolean
  unit: 'kg' | 'g' | 'lb'
}

export interface ScaleStatus {
  status: 'connected' | 'disconnected' | 'error'
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

export interface ElectronAPI {
  isElectron: true
  getDisplays: () => Promise<unknown[]>
  reopenCustomerDisplay: () => void
  quit: () => void
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

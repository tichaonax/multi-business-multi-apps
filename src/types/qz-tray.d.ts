declare module 'qz-tray' {
  const qz: {
    websocket: {
      isActive(): boolean
      connect(options?: { retries?: number; delay?: number }): Promise<void>
      disconnect(): Promise<void>
    }
    printers: {
      find(query?: string): Promise<string[]>
    }
    configs: {
      create(printer: string, options?: Record<string, unknown>): unknown
    }
    print(config: unknown, data: unknown[]): Promise<void>
  }
  export default qz
}

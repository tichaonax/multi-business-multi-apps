// Personal chat preferences (notification sound, how many satellite windows
// can be open at once) — localStorage only, same pattern as
// use-page-size-preference.ts, no backend/DB table needed for a UI setting.

export interface ChatSettings {
  soundEnabled: boolean
  maxOpenWindows: number
}

export const MIN_OPEN_WINDOWS = 1
export const MAX_OPEN_WINDOWS_CAP = 5
export const DEFAULT_CHAT_SETTINGS: ChatSettings = { soundEnabled: true, maxOpenWindows: 4 }

function storageKey(userId?: string | null) {
  return userId ? `chat-settings-${userId}` : 'chat-settings'
}

export function clampMaxOpenWindows(value: unknown): number {
  const n = typeof value === 'number' && !isNaN(value) ? value : DEFAULT_CHAT_SETTINGS.maxOpenWindows
  return Math.min(MAX_OPEN_WINDOWS_CAP, Math.max(MIN_OPEN_WINDOWS, Math.round(n)))
}

export function loadChatSettings(userId?: string | null): ChatSettings {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_CHAT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_CHAT_SETTINGS.soundEnabled,
      maxOpenWindows: clampMaxOpenWindows(parsed.maxOpenWindows),
    }
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS }
  }
}

export function saveChatSettings(userId: string | null | undefined, settings: ChatSettings) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(settings))
  } catch { /* non-critical */ }
}

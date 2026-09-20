// Tiny cross-component pub-sub so GlobalHeader's mobile chat toggle can show
// the same unread badges as FloatingChat's own minimized bubble, without
// lifting the whole chat panel/socket logic out of floating-chat.tsx.
export interface ChatBadgeState {
  unread: number
  unreadDirect: number
  onlineCount: number
}

let state: ChatBadgeState = { unread: 0, unreadDirect: 0, onlineCount: 0 }
const listeners = new Set<(s: ChatBadgeState) => void>()

export function setChatBadge(next: ChatBadgeState) {
  state = next
  listeners.forEach(l => l(state))
}

export function subscribeChatBadge(listener: (s: ChatBadgeState) => void) {
  listeners.add(listener)
  listener(state)
  return () => { listeners.delete(listener) }
}

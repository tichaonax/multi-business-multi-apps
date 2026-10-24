'use client'

/**
 * MBM-328 — emojis in chat, shared by the Team Chat hub (floating-chat.tsx)
 * and every satellite ChatWindow:
 *  - EmojiPickerButton: 😊 next to 📎 in the composer; inserts at the cursor
 *  - MessageReactions: "👍 3" chips under a message + a quick-reaction bar
 *  - applyReactions: merges a chat:message:reactions update into state
 */
import { useEffect, useRef, useState } from 'react'

export type Reaction = { emoji: string; count: number; users: { id: string; name: string }[] }

/** Offered on hover under a message. */
export const QUICK_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🙏']

const FREQUENT = ['👍', '👎', '❤️', '😂', '😊', '🙏', '👏', '🔥', '✅', '❌', '😢', '😮', '🎉', '👌', '🤝', '💯']

const EMOJI_GROUPS: { key: string; icon: string; label: string; emojis: string[] }[] = [
  { key: 'smileys', icon: '😀', label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '😘', '😋', '😛', '😜', '🤪', '🤗', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🥵', '🥶', '😵', '🤯', '🥳', '😎', '🤓', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😱', '😤', '😡', '🤬', '😈', '💀'] },
  { key: 'gestures', icon: '👍', label: 'Gestures', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '👋', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '👀', '🫡', '🤷', '🙋', '🙅', '🙆', '💁'] },
  { key: 'hearts', icon: '❤️', label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💯', '💢', '💥', '💫', '💤'] },
  { key: 'things', icon: '🍔', label: 'Food & things', emojis: ['🍔', '🍕', '🍟', '🌭', '🍗', '🍖', '🥩', '🍚', '🍛', '🥗', '🍲', '🍞', '🥚', '🍳', '🍰', '🎂', '🍩', '🍪', '☕', '🍵', '🥤', '🍺', '🍷', '🎉', '🎁', '🎈', '📦', '🛒', '💰', '💵', '💳', '🧾', '📱', '💻', '🖨️', '📞', '🚗', '🚚', '⛽', '🔑', '⏰', '📅', '📌', '📎'] },
  { key: 'symbols', icon: '✅', label: 'Symbols', emojis: ['✅', '☑️', '✔️', '❌', '❎', '⚠️', '🚫', '⛔', '❗', '❓', '‼️', '⭐', '🌟', '✨', '🔥', '⚡', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⬆️', '⬇️', '➡️', '⬅️', '🔄', '🆗', '🆕', '🆘'] },
]

const RECENT_KEY = 'chat:recentEmojis'
const RECENT_MAX = 16

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch { return [] }
}
function rememberRecent(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter(e => e !== emoji)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* storage unavailable — fine */ }
}

/** Inserts `emoji` at the textarea's cursor (replacing any selection), then
 * puts the cursor right after it. `setValue` is the composer's onChange. */
export function insertAtCursor(el: HTMLTextAreaElement | null, value: string, emoji: string, setValue: (v: string) => void) {
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  setValue(value.slice(0, start) + emoji + value.slice(end))
  requestAnimationFrame(() => {
    if (!el) return
    el.focus()
    const pos = start + emoji.length
    el.setSelectionRange(pos, pos)
  })
}

/** 😊 button for the composer. The panel opens upward and stays open so
 * several emojis can be added; closes on outside click or Esc. */
export function EmojiPickerButton({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('frequent')
  const [recent, setRecent] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setRecent(readRecent())
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const pick = (emoji: string) => {
    rememberRecent(emoji)
    setRecent(readRecent())
    onPick(emoji)
  }

  const tabs = [{ key: 'frequent', icon: '🕘', label: 'Frequently used' }, ...EMOJI_GROUPS]
  const group = EMOJI_GROUPS.find(g => g.key === tab)

  const grid = (emojis: string[]) => (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map(e => (
        <button key={e} type="button" onClick={() => pick(e)} title={e}
          className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {e}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)} title="Emoji"
        className={`w-8 h-8 flex items-center justify-center rounded-full text-lg transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : open ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        😊
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-40 w-[260px] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-1">
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} title={t.label}
                className={`flex-1 py-1.5 text-base border-b-2 ${tab === t.key ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                {t.icon}
              </button>
            ))}
          </div>
          <div className="p-1.5 max-h-52 overflow-y-auto space-y-1.5">
            {tab === 'frequent' ? (
              <>
                {recent.length > 0 && (
                  <>
                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 px-0.5">Recently used</div>
                    {grid(recent)}
                  </>
                )}
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 px-0.5">Frequently used</div>
                {grid(FREQUENT)}
              </>
            ) : group && grid(group.emojis)}
          </div>
        </div>
      )}
    </div>
  )
}

/** Merges a chat:message:reactions update (or a POST response) into a list. */
export function applyReactions<T extends { id: string; reactions?: Reaction[] }>(list: T[], id: string, reactions: Reaction[]): T[] {
  return list.some(m => m.id === id) ? list.map(m => (m.id === id ? { ...m, reactions } : m)) : list
}

/** Reaction chips under a message ("👍 3" — highlighted if you reacted;
 * hover for who), plus a "☺+" toggle (shown when `showAdd`, i.e. while the
 * message is hovered) that opens a one-tap quick-reaction bar. */
export function MessageReactions({ messageId, reactions, currentUserId, showAdd, alignRight, onUpdated }: {
  messageId: string
  reactions: Reaction[] | undefined
  currentUserId: string | undefined
  showAdd: boolean
  alignRight?: boolean
  onUpdated: (id: string, reactions: Reaction[]) => void
}) {
  const [barOpen, setBarOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const list = reactions ?? []

  useEffect(() => { if (!showAdd) setBarOpen(false) }, [showAdd])

  const toggle = async (emoji: string) => {
    if (busy) return
    setBusy(true)
    setBarOpen(false)
    try {
      const r = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
      })
      if (r.ok) {
        const j = await r.json()
        onUpdated(messageId, j.reactions ?? [])
      }
    } catch { /* offline — nothing changes */ } finally { setBusy(false) }
  }

  if (list.length === 0 && !showAdd) return null

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-0.5 mx-1 ${alignRight ? 'justify-end' : ''}`}>
      {list.map(r => {
        const mine = !!currentUserId && r.users.some(u => u.id === currentUserId)
        return (
          <button key={r.emoji} type="button" onClick={() => toggle(r.emoji)} disabled={busy}
            title={`${r.users.map(u => (u.id === currentUserId ? 'You' : u.name)).join(', ')} — click to ${mine ? 'remove yours' : 'add yours'}`}
            className={`flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[11px] border leading-5 ${mine
              ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            <span className="text-sm leading-none">{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
        )
      })}
      {showAdd && (
        barOpen ? (
          <span className="flex items-center gap-0.5 px-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
            {QUICK_REACTIONS.map(e => (
              <button key={e} type="button" onClick={() => toggle(e)} disabled={busy} title={`React ${e}`}
                className="w-6 h-6 flex items-center justify-center text-base rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-125 transition-transform">
                {e}
              </button>
            ))}
          </span>
        ) : (
          <button type="button" onClick={() => setBarOpen(true)} title="Add a reaction"
            className="px-1.5 rounded-full text-[11px] leading-5 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:border-indigo-400">
            ☺+
          </button>
        )
      )}
    </div>
  )
}

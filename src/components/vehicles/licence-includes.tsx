'use client'

// MBM-354: the authorities issue registration, radio licence and insurance on
// one receipt. Wherever a licence renewal is entered or paid for, these boxes
// say which of the other two came on the same receipt; they are then renewed
// with it, and the registration carries the fee.

export const COMBINED_LICENCE_TYPES = ['REGISTRATION', 'RADIO', 'INSURANCE']
export const COMBINED_LICENCE_LABEL: Record<string, string> = { REGISTRATION: 'Registration', RADIO: 'Radio licence', INSURANCE: 'Insurance' }

/** "RADIO,INSURANCE" or an array → the valid types */
export function toIncludes(v: string | string[] | null | undefined): string[] {
  const list = Array.isArray(v) ? v : (v || '').split(',')
  return [...new Set(list.map(t => t.trim()).filter(t => COMBINED_LICENCE_TYPES.includes(t)))]
}

/** "Registration (incl. radio licence, insurance)" */
export function licenceGroupLabel(type: string, includes: string[] | string | null | undefined): string {
  const others = toIncludes(includes).filter(t => t !== type)
  const label = COMBINED_LICENCE_LABEL[type] || type
  return others.length ? `${label} (incl. ${others.map(t => COMBINED_LICENCE_LABEL[t].toLowerCase()).join(', ')})` : label
}

/** The "… included" boxes for a licence type (nothing for other types) */
export function LicenceIncludesBoxes({ licenseType, value, onChange, compact, disabled }: {
  /** The licence being renewed / paid for */
  licenseType: string | null | undefined
  value: string[]
  onChange: (v: string[]) => void
  /** Small, inline (a request line) */
  compact?: boolean
  disabled?: boolean
}) {
  if (!licenseType || !COMBINED_LICENCE_TYPES.includes(licenseType)) return null
  const others = COMBINED_LICENCE_TYPES.filter(t => t !== licenseType)
  const chosen = value.filter(t => t !== licenseType)
  const text = compact ? 'text-xs' : 'text-sm'
  const feeOn = [licenseType, ...chosen].includes('REGISTRATION') ? 'Registration' : COMBINED_LICENCE_LABEL[licenseType]
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2'}>
      <span className={`${compact ? 'text-xs' : 'text-xs font-medium'} text-gray-600 dark:text-gray-300`}>On the same receipt:</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {others.map(t => (
          <label key={t} className={`flex items-center gap-1.5 ${text} text-gray-700 dark:text-gray-300 cursor-pointer`}>
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600" disabled={disabled}
              checked={chosen.includes(t)}
              onChange={e => onChange(e.target.checked ? [...chosen, t] : chosen.filter(x => x !== t))} />
            {COMBINED_LICENCE_LABEL[t]} included
          </label>
        ))}
      </div>
      {!compact && chosen.length > 0 && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {[licenseType, ...chosen].map(t => COMBINED_LICENCE_LABEL[t]).join(', ')} are all renewed together, with the same
          number and dates. The whole receipt&apos;s fee is recorded on the {feeOn}; the others at 0.
        </p>
      )}
    </div>
  )
}

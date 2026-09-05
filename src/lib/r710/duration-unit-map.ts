/**
 * Maps R710TokenConfigs.durationUnit (DB format, e.g. 'hour_Hours') to the
 * R710 device API's expected duration unit.
 */
export const durationUnitMap: Record<string, 'hour' | 'day' | 'week'> = {
  'hour_Hours': 'hour',
  'day_Days': 'day',
  'week_Weeks': 'week'
}

/**
 * Resolves a stored R710TokenConfigs duration into the (value, unit) pair
 * actually sent to the device — converting weeks to days first.
 *
 * `week_Weeks` is documented as a valid `duration-unit` value
 * (scripts/ruckus-api-discovery/RUCKUS-API-SPECIFICATION.md), but unlike
 * `hour_Hours`/`day_Days` there's no captured real-device example proving it
 * actually works, and an admin-issued "52 Weeks" long-term token came back
 * from a real device expiring in ~1 day instead of ~365 — i.e. the device
 * silently mishandled the raw "week" unit rather than rejecting it outright.
 * Days are the one unit with a verified-correct captured response, and this
 * app already has a separately-confirmed real-device cap of 365 days, so
 * every caller should go through this instead of sending 'week' on the wire.
 */
export function resolveR710Duration(
  durationValue: number,
  storedDurationUnit: string
): { duration: number; durationUnit: 'hour' | 'day' } {
  const mapped = durationUnitMap[storedDurationUnit] || 'hour'
  if (mapped === 'week') {
    return { duration: durationValue * 7, durationUnit: 'day' }
  }
  return { duration: durationValue, durationUnit: mapped }
}

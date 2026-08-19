/**
 * Maps R710TokenConfigs.durationUnit (DB format, e.g. 'hour_Hours') to the
 * R710 device API's expected duration unit. Shared by generate-and-sell-token.ts
 * and auto-generate-service.ts so both stay in sync.
 */
export const durationUnitMap: Record<string, 'hour' | 'day' | 'week'> = {
  'hour_Hours': 'hour',
  'day_Days': 'day',
  'week_Weeks': 'week'
}

export type MileageUnit = 'km' | 'miles'

export const MILEAGE_UNITS: Record<MileageUnit, { label: string; abbreviation: string }> = {
  km: {
    label: 'Kilometers',
    abbreviation: 'km'
  },
  miles: {
    label: 'Miles',
    abbreviation: 'miles'
  }
}

/**
 * Format mileage with the appropriate unit
 * @param mileage - The mileage value
 * @param unit - The mileage unit ('km' or 'miles')
 * @returns Formatted mileage string
 */
export function formatMileage(mileage: number | null | undefined, unit: MileageUnit = 'km'): string {
  if (mileage === null || mileage === undefined) {
    return 'N/A'
  }

  return `${mileage.toLocaleString()} ${MILEAGE_UNITS[unit].abbreviation}`
}

/**
 * Get the display label for a mileage unit
 * @param unit - The mileage unit
 * @returns The display label
 */
export function getMileageUnitLabel(unit: MileageUnit): string {
  return MILEAGE_UNITS[unit].label
}

/**
 * Get the abbreviation for a mileage unit
 * @param unit - The mileage unit
 * @returns The abbreviation
 */
export function getMileageUnitAbbreviation(unit: MileageUnit): string {
  return MILEAGE_UNITS[unit].abbreviation
}

/**
 * Validate if a string is a valid mileage unit
 * @param unit - The unit string to validate
 * @returns True if valid, false otherwise
 */
export function isValidMileageUnit(unit: string): unit is MileageUnit {
  return unit === 'km' || unit === 'miles'
}

/**
 * Get options for mileage unit select components
 * @returns Array of select options
 */
export function getMileageUnitOptions() {
  return Object.entries(MILEAGE_UNITS).map(([value, config]) => ({
    value: value as MileageUnit,
    label: config.label,
    abbreviation: config.abbreviation
  }))
}

/**
 * Check if a vehicle can have its mileage unit changed
 * This checks if the vehicle has any mileage entries that would make the unit readonly
 * @param hasInitialMileage - Whether the vehicle has initial mileage entries
 * @param isAdmin - Whether the current user is an admin
 * @returns True if the unit can be changed, false otherwise
 */
export function canChangeMileageUnit(hasInitialMileage: boolean, isAdmin: boolean = false): boolean {
  // If vehicle has no mileage entries, anyone can change the unit
  if (!hasInitialMileage) {
    return true
  }

  // If vehicle has mileage entries, only admins can change the unit
  return isAdmin
}

/**
 * Get warning message for mileage unit changes
 * @param hasInitialMileage - Whether the vehicle has initial mileage entries
 * @param isAdmin - Whether the current user is an admin
 * @returns Warning message or null
 */
export function getMileageUnitWarning(hasInitialMileage: boolean, isAdmin: boolean = false): string | null {
  if (!hasInitialMileage) {
    return 'Once mileage entries are recorded, this unit setting becomes readonly (admin-only changes).'
  }

  if (isAdmin) {
    return 'Warning: Changing the unit will not convert existing mileage values. Ensure existing data is correct for the new unit.'
  }

  return 'Mileage unit is readonly after initial mileage entries. Contact an administrator to change this setting.'
}
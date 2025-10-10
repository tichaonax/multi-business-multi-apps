/**
 * Overtime Calculation Utilities
 *
 * Provides standardized overtime pay calculations for payroll processing.
 * Supports both standard overtime (1.5x) and double-time overtime (2.0x).
 */

/**
 * Calculate overtime pay based on hours worked and hourly rate
 *
 * @param hours - Number of overtime hours worked
 * @param hourlyRate - Base hourly rate for the employee
 * @param isDoubleTime - If true, uses 2.0x multiplier; if false, uses 1.5x multiplier
 * @returns Calculated overtime pay, rounded to 2 decimal places
 *
 * @example
 * // Standard overtime (1.5x)
 * calculateOvertimePay(10, 5.13, false) // Returns 76.95
 *
 * @example
 * // Double-time overtime (2.0x)
 * calculateOvertimePay(5, 5.13, true) // Returns 51.30
 */
export function calculateOvertimePay(
  hours: number,
  hourlyRate: number,
  isDoubleTime: boolean = false
): number {
  if (!hours || hours <= 0) return 0
  if (!hourlyRate || hourlyRate <= 0) return 0

  const multiplier = isDoubleTime ? 2.0 : 1.5
  const overtimePay = hours * hourlyRate * multiplier

  return Math.round(overtimePay * 100) / 100
}

/**
 * Calculate total overtime pay for both standard and double-time hours
 *
 * @param standardHours - Number of standard overtime hours (1.5x)
 * @param doubleTimeHours - Number of double-time overtime hours (2.0x)
 * @param hourlyRate - Base hourly rate for the employee
 * @returns Total overtime pay for both types combined
 *
 * @example
 * calculateTotalOvertimePay(10, 5, 5.13) // Returns 128.25
 */
export function calculateTotalOvertimePay(
  standardHours: number,
  doubleTimeHours: number,
  hourlyRate: number
): number {
  const standardPay = calculateOvertimePay(standardHours, hourlyRate, false)
  const doubleTimePay = calculateOvertimePay(doubleTimeHours, hourlyRate, true)

  return Math.round((standardPay + doubleTimePay) * 100) / 100
}

/**
 * Derive hourly rate from monthly salary using standard calculation
 *
 * Assumes:
 * - 6 working days per week
 * - 9 working hours per day
 * - 52 weeks per year
 * Total: 2,808 hours per year
 *
 * @param monthlyBaseSalary - Monthly base salary
 * @returns Calculated hourly rate
 *
 * @example
 * deriveHourlyRateFromMonthlySalary(1200) // Returns 5.13
 */
export function deriveHourlyRateFromMonthlySalary(monthlyBaseSalary: number): number {
  if (!monthlyBaseSalary || monthlyBaseSalary <= 0) return 0

  const annualSalary = monthlyBaseSalary * 12
  const hoursPerYear = 6 * 9 * 52 // 2,808 hours

  return Math.round((annualSalary / hoursPerYear) * 100) / 100
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const SCALES = ['', 'Thousand', 'Million', 'Billion']

function chunkToWords(n: number): string {
  let str = ''
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `
    n %= 100
  }
  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `
    n %= 10
  }
  if (n > 0) {
    str += `${ONES[n]} `
  }
  return str.trim()
}

function integerToWords(num: number): string {
  if (num === 0) return 'Zero'
  let result = ''
  let scaleIndex = 0
  while (num > 0) {
    const chunk = num % 1000
    if (chunk > 0) {
      const chunkWords = chunkToWords(chunk) + (SCALES[scaleIndex] ? ` ${SCALES[scaleIndex]}` : '')
      result = result ? `${chunkWords} ${result}` : chunkWords
    }
    num = Math.floor(num / 1000)
    scaleIndex++
  }
  return result.trim()
}

// Spells out a currency amount for display on a payment voucher, e.g. 1800 -> "One Thousand Eight Hundred Dollars Only".
// Kept alongside the numeric figure so any tampering with the number becomes visibly inconsistent with the words.
export function amountToWords(amount: number): string {
  const dollars = Math.floor(Math.abs(amount))
  const cents = Math.round((Math.abs(amount) - dollars) * 100)

  let words = `${integerToWords(dollars)} ${dollars === 1 ? 'Dollar' : 'Dollars'}`
  if (cents > 0) {
    words += ` and ${integerToWords(cents)} ${cents === 1 ? 'Cent' : 'Cents'}`
  }
  words += ' Only'
  return words
}

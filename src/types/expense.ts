export interface Expense {
  id: string
  category: string
  categoryObject?: {
    id: string
    name: string
    emoji?: string
    color?: string
  } | null
  description: string
  amount: number
  date: string
  tags?: string | null
  notes?: string | null
  userId?: string | null
  createdAt: string
  updatedAt: string
  // Optional related transaction shapes used in different contexts
  projectPayments?: Array<{
    id: string
    paymentType: string
    notes?: string
    project?: { name?: string }
    contractor?: { name?: string }
  }>
  projectTransactions?: Array<{
    id: string
    paymentType: string
    notes?: string
    projectId?: string
    project?: { id?: string; name?: string }
    projectContractor?: {
      id?: string
      projectId?: string
      person: { name?: string; fullName?: string; phone?: string; email?: string }
    }
  }>
  loanTransactions?: Array<{
    id: string
    transactionType: string
    amount: number
    description?: string
    loan?: any
  }>
}

export default Expense

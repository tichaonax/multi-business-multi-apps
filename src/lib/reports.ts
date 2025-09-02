import { db } from './db'

export interface ReportFilter {
  startDate?: Date
  endDate?: Date
  businessId?: string
  category?: string
}

export interface ReportData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}

export async function generateRevenueReport(filters: ReportFilter): Promise<ReportData> {
  try {
    const result = await db.execute(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as revenue
      FROM transactions 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `)

    const data = result.rows as { date: Date; revenue: number }[]
    
    return {
      labels: data.map(row => row.date.toISOString().split('T')[0]),
      datasets: [{
        label: 'Revenue',
        data: data.map(row => row.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
      }]
    }
  } catch (error) {
    return {
      labels: [],
      datasets: [{
        label: 'Revenue',
        data: [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
      }]
    }
  }
}

export async function generateExpenseReport(filters: ReportFilter): Promise<ReportData> {
  try {
    const result = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM expenses 
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY category
      ORDER BY total DESC
    `)

    const data = result.rows as { category: string; total: number }[]
    
    return {
      labels: data.map(row => row.category),
      datasets: [{
        label: 'Expenses',
        data: data.map(row => row.total),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      }]
    }
  } catch (error) {
    return {
      labels: [],
      datasets: [{
        label: 'Expenses',
        data: [],
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      }]
    }
  }
}
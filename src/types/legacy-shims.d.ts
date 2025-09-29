// Lightweight legacy shims to preserve frontend expectations while we refactor server shapes
// This augments Prisma-generated types with optional legacy-friendly fields used across the app.

import '@prisma/client'

declare module '@prisma/client' {
    interface Employee {
        // Legacy aliases and convenience fields used by UI components
        contracts?: any[]
        employeeContracts?: any[]
        contractCount?: number
        businessName?: string | null
        business?: { id: string; name: string; type: string } | null
        jobTitle?: { title?: string; department?: string; level?: string } | null
        jobTitles?: { title?: string; department?: string; level?: string } | null
        compensationType?: { name?: string; type?: string; frequency?: string } | null
        compensationTypes?: { name?: string; type?: string; frequency?: string } | null
        users?: { id: string; name: string; email: string } | null
    }

    interface JobTitle {
        level?: string | null
    }

    interface EmployeeContract {
        // make some frequently accessed fields optional to avoid brittle typing during migration
        baseSalary?: any
        status?: string
        contractNumber?: string
        employeeSignedAt?: Date | null
    }
}

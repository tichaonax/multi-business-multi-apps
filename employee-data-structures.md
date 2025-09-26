# Employee Management Data Structures & Queries

## Confirmed Working Database Schema

All the following have been tested and confirmed working with real database data:

### Core Tables
1. **Employee** - Basic employee information
2. **JobTitle** - Job titles and departments  
3. **CompensationType** - Salary and compensation types
4. **Business** - Business entities
5. **User** - User accounts linked to employees

### Verified Relations
- Employee → JobTitle (many-to-one via `jobTitleId`)
- Employee → CompensationType (many-to-one via `compensationTypeId`)  
- Employee → Business (many-to-one via `businessId`)
- Employee → User (one-to-one via Employee.userId)
- Employee → Employee (many-to-one via `supervisorId` - supervisor relation)

## Working API Queries

### 1. Basic Employee List
```typescript
// Endpoint: /api/test/employees
const employees = await prisma.employee.findMany({
  take: 5,
  select: {
    id: true,
    employeeNumber: true,
    fullName: true,
    email: true,
    phone: true,
    nationalId: true,
    hireDate: true,
    employmentStatus: true,
    isActive: true,
    createdAt: true
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

### 2. Employee with Full Relations
```typescript
// Endpoint: /api/test/employee-relations
const employeesWithRelations = await prisma.employee.findMany({
  take: 2,
  include: {
    users: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    jobTitles: {
      select: {
        title: true,
        department: true,
        level: true
      }
    },
    compensationTypes: {
      select: {
        name: true,
        type: true,
        baseAmount: true
      }
    },
    business: {
      select: {
        id: true,
        name: true,
        type: true
      }
    },
    employees: { // supervisor relation
      select: {
        id: true,
        fullName: true,
        jobTitles: {
          select: {
            title: true
          }
        }
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})
```

### 3. Job Titles for Dropdown
```typescript
// Endpoint: /api/test/job-titles
const jobTitles = await prisma.jobTitle.findMany({
  take: 5,
  select: {
    id: true,
    title: true,
    description: true,
    department: true,
    level: true,
    isActive: true,
    createdAt: true
  },
  orderBy: {
    title: 'asc'
  }
})
```

### 4. Compensation Types for Dropdown
```typescript
// Endpoint: /api/test/compensation-types
const compensationTypes = await prisma.compensationType.findMany({
  take: 5,
  select: {
    id: true,
    name: true,
    type: true,
    description: true,
    baseAmount: true,
    commissionPercentage: true,
    isActive: true,
    createdAt: true
  },
  orderBy: {
    name: 'asc'
  }
})
```

### 5. Businesses for Dropdown
```typescript
// Endpoint: /api/test/businesses
const businesses = await prisma.business.findMany({
  take: 5,
  select: {
    id: true,
    name: true,
    type: true,
    description: true,
    isActive: true,
    createdBy: true,
    createdAt: true
  },
  orderBy: {
    name: 'asc'
  }
})
```

## Required Data Structures for Employee Management UI

### Employee List View
```typescript
interface EmployeeListItem {
  id: string
  employeeNumber: string
  fullName: string
  email: string | null
  phone: string
  employmentStatus: string
  isActive: boolean
  
  // Related data for display
  jobTitle?: {
    title: string
    department: string | null
  }
  business?: {
    name: string
    type: string
  }
}
```

### Employee Detail/Edit View
```typescript
interface EmployeeDetail {
  id: string
  employeeNumber: string
  fullName: string
  email: string | null
  phone: string
  nationalId: string
  hireDate: string
  employmentStatus: string
  isActive: boolean
  jobTitleId: string
  compensationTypeId: string
  businessId: string
  supervisorId: string | null
  
  // Full related objects
  jobTitles?: {
    id: string
    title: string
    department: string | null
    level: string | null
  }
  compensationTypes?: {
    id: string
    name: string
    type: string
    baseAmount: number | null
  }
  business?: {
    id: string
    name: string
    type: string
  }
  users?: {
    id: string
    name: string
    email: string
  }
  employees?: { // supervisor
    id: string
    fullName: string
    jobTitles?: {
      title: string
    }
  }
}
```

### Dropdown Options
```typescript
interface DropdownOption {
  id: string
  label: string
  value: string
}

interface JobTitleOption extends DropdownOption {
  department: string | null
  level: string | null
}

interface CompensationTypeOption extends DropdownOption {
  type: string
  baseAmount: number | null
}

interface BusinessOption extends DropdownOption {
  type: string
}
```

## Required API Endpoints for Employee Management

### GET /api/employees
- Returns employee list with basic info + job title + business
- Supports pagination, filtering, searching
- Uses the employee relations pattern from test endpoint

### GET /api/employees/[id]
- Returns full employee detail with all relations
- Uses the complete relations pattern from test endpoint

### POST /api/employees
- Creates new employee
- Validates all required fields and relations
- Returns created employee with relations

### PUT /api/employees/[id]
- Updates existing employee
- Validates all fields and relations
- Returns updated employee with relations

### DELETE /api/employees/[id]
- Soft delete (set isActive: false)
- Returns success status

### Supporting Dropdown Endpoints
- GET /api/job-titles (for dropdown)
- GET /api/compensation-types (for dropdown)  
- GET /api/businesses (for dropdown)
- GET /api/employees?role=supervisor (for supervisor dropdown)

## Critical Schema Notes

### Relation Names (camelCase for Prisma client)
- `jobTitles` (not `jobTitle` or `job_titles`)
- `compensationTypes` (not `compensationType`)
- `users` (not `user`)
- `employees` (for supervisor relation)
- `business` (singular for many-to-one)

### Field Names (camelCase for Prisma client)
- `employeeNumber`, `fullName`, `nationalId`
- `hireDate`, `employmentStatus`, `isActive`
- `jobTitleId`, `compensationTypeId`, `businessId`
- `supervisorId`, `createdAt`, `updatedAt`

### Database Mapping
- All models use `@@map("snake_case_table_name")`
- All field names in database are snake_case
- Prisma client uses camelCase for everything

## Test Status ✅

All these queries and data structures have been verified working with:
- Real database data (not mock)
- Proper camelCase relation names
- Correct field mappings
- Full relationship traversals
- Multiple table joins

The systematic test page at `/test` demonstrates all of these working correctly.
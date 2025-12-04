async function testBackup() {
  console.log('Testing backup API endpoint...\n')

  try {
    const url = 'http://localhost:8080/api/backup?type=full&includeAuditLogs=false&includeBusinessData=true&includeDemoData=false'

    console.log('Making backup request to:', url)
    console.log('This may take a while...\n')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.error('❌ Backup failed!')
      console.error('Status:', response.status)
      console.error('Error:', errorData.error || 'Unknown error')
      if (errorData.details) {
        console.error('\nDetails:')
        console.error(errorData.details)
      }
      process.exit(1)
    }

    const backup = await response.json()

    console.log('✅ Backup created successfully!\n')
    console.log('Backup statistics:')

    // Count records in backup
    const stats = {
      businesses: backup.businesses?.length || 0,
      employees: backup.employees?.length || 0,
      employeeLoans: backup.employeeLoans?.length || 0,
      employeeLoanPayments: backup.employeeLoanPayments?.length || 0,
      employeeSalaryIncreases: backup.employeeSalaryIncreases?.length || 0,
      employeeLeaveRequests: backup.employeeLeaveRequests?.length || 0,
      employeeLeaveBalance: backup.employeeLeaveBalance?.length || 0,
      employeeAttendance: backup.employeeAttendance?.length || 0,
      employeeTimeTracking: backup.employeeTimeTracking?.length || 0,
      employeeBenefits: backup.employeeBenefits?.length || 0,
      employeeAllowances: backup.employeeAllowances?.length || 0,
      employeeBonuses: backup.employeeBonuses?.length || 0,
      employeeDeductions: backup.employeeDeductions?.length || 0,
      businessProducts: backup.businessProducts?.length || 0,
      businessCategories: backup.businessCategories?.length || 0,
    }

    Object.entries(stats).forEach(([key, count]) => {
      if (count > 0) {
        console.log(`  ${key}: ${count}`)
      }
    })

    console.log('\n✅ All backup queries executed successfully!')
    console.log('\nBackup metadata:')
    console.log(`  Version: ${backup.version}`)
    console.log(`  Timestamp: ${backup.timestamp}`)
    console.log(`  Type: ${backup.type}`)

    // Calculate backup size
    const backupString = JSON.stringify(backup)
    const sizeKB = (backupString.length / 1024).toFixed(2)
    const sizeMB = (backupString.length / 1024 / 1024).toFixed(2)
    console.log(`  Size: ${sizeKB} KB (${sizeMB} MB)`)

  } catch (error) {
    console.error('\n❌ Test failed!')
    console.error('Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

testBackup()

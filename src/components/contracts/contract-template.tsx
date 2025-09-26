'use client'

import { forwardRef } from 'react'
import { formatPhoneNumberForDisplay, formatDateByCountry, getCountryByCode } from '@/lib/country-codes'

// Simple National ID formatter for common patterns
const formatNationalId = (nationalId: string): string => {
  if (!nationalId) return ''
  
  // Remove all non-alphanumeric characters for processing
  const cleanId = nationalId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  // Zimbabwe National ID format: ##-###### X ## (1-8 digits + 1 letter + 2 digits with spaces)
  if (/^\d{3,10}[A-Z]\d{2}$/.test(cleanId)) {
    const totalDigits = cleanId.length - 3; // Subtract letter and 2 final digits
    const firstTwoDigits = cleanId.slice(0, 2);
    const middleDigits = cleanId.slice(2, totalDigits);
    const letter = cleanId.slice(totalDigits, totalDigits + 1);
    const lastTwoDigits = cleanId.slice(totalDigits + 1);
    return `${firstTwoDigits}-${middleDigits} ${letter} ${lastTwoDigits}`
  }
  
  // South African ID format: ############### (13 digits)
  if (/^\d{13}$/.test(cleanId)) {
    return `${cleanId.slice(0, 6)} ${cleanId.slice(6, 10)} ${cleanId.slice(10)}`
  }
  
  // Generic format for mixed alphanumeric IDs
  if (cleanId.length >= 8) {
    return `${cleanId.slice(0, 2)}-${cleanId.slice(2, 6)}-${cleanId.slice(6)}`
  }
  
  // Return original if no pattern matches
  return nationalId
}

// Simple Driver License formatter for common patterns
const formatDriverLicense = (driverLicense: string): string => {
  if (!driverLicense) return ''
  
  // Remove all non-alphanumeric characters for processing
  const cleanLicense = driverLicense.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  // Zimbabwe Driver License format: ######## XX (up to 8 digits + 1-2 letters with space)
  if (/^\d{1,8}[A-Z]{1,2}$/.test(cleanLicense)) {
    const digits = cleanLicense.replace(/[A-Z]/g, '')
    const letters = cleanLicense.replace(/\d/g, '')
    return `${digits} ${letters}`
  }
  
  // US/Generic alphanumeric format: XXXXXXXXXX (letters and numbers)
  if (/^[A-Z0-9]{6,20}$/.test(cleanLicense)) {
    return cleanLicense
  }
  
  // Return original if no pattern matches
  return driverLicense
}

// Helper function to determine country code from employee data
const getEmployeeCountryCode = (employee: any): string => {
  // Try to get country from phone number or national ID
  // Default to Zimbabwe if not determinable
  return 'ZW' // This could be enhanced to parse from phone/ID
}

interface ContractData {
  contractNumber: string
  version: number
  employee: {
    fullName: string
    employeeNumber: string
    email: string | null
    phone: string
    address: string | null
    nationalId: string | null
    driverLicenseNumber: string | null
  }
  jobTitle: {
    title: string
    department: string | null
    description: string | null
    responsibilities: string[]
  }
  compensationType: {
    name: string
    type: string
    description: string | null
  }
  business: {
    name: string
    type: string
    address?: string
    phone?: string
    email?: string
    registrationNumber?: string
  }
  supervisor: {
    fullName: string
    jobTitle?: {
      title: string
    }
    jobTitles?: {
      title: string
    }
  } | null
  baseSalary: number
  isCommissionBased: boolean
  isSalaryBased: boolean
  startDate: string
  endDate: string | null
  probationPeriodMonths: number | null
  benefits: Array<{
    benefitType: {
      name: string
      type: string
    }
    amount: number
    isPercentage: boolean
    notes: string | null
  }>
  customResponsibilities?: string
  notes?: string | null
  businessAssignments?: Array<{
    businessId: string
    businessName: string
    businessType: string
    isPrimary: boolean
    role?: string
    startDate?: string
  }>
  umbrellaBusinessName?: string
}

interface ContractTemplateProps {
  data: ContractData
}

export const ContractTemplate = forwardRef<HTMLDivElement, ContractTemplateProps>(
  ({ data: contractData }, ref) => {
    // Early return if required data is missing
    if (!contractData || !contractData.business || !contractData.employee) {
      return (
        <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto text-black">
          <div className="text-center text-gray-500">
            <p>Contract data is loading or incomplete...</p>
          </div>
        </div>
      )
    }
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)
    }

    const countryCode = getEmployeeCountryCode(contractData.employee)
    
    const formatDate = (dateString: string) => {
      return formatDateByCountry(dateString, countryCode)
    }
    
    const currentDate = formatDateByCountry(new Date(), countryCode)

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-8">
          {contractData.umbrellaBusinessName && (
            <>
              <h1 className="text-3xl font-bold mb-2">{contractData.umbrellaBusinessName}</h1>
              <div className="flex justify-center items-center mb-4">
                <div className="flex-1 border-t border-gray-400"></div>
              </div>
            </>
          )}
          <h1 className={`${contractData.umbrellaBusinessName ? 'text-xl' : 'text-2xl'} font-bold mb-2`}>
            {contractData.business.name}
          </h1>
          <h2 className="text-xl mb-4">CONTRACT OF EMPLOYMENT</h2>
          <div className="text-sm">
            <p>Contract Number: {contractData.contractNumber}</p>
            <p>Version: {contractData.version}</p>
            <p>Date: {currentDate}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">PARTIES TO THE CONTRACT</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold mb-2">EMPLOYER:</h4>
            <p className="mb-1"><strong>{contractData.business.name}</strong></p>
            <p className="mb-1">Business Type: {contractData.business.type.charAt(0).toUpperCase() + contractData.business.type.slice(1)}</p>
            {contractData.business.address && <p className="mb-1">Address: {contractData.business.address}</p>}
            {contractData.business.phone && <p className="mb-1">Phone: {contractData.business.phone}</p>}
            {contractData.business.email && <p className="mb-1">Email: {contractData.business.email}</p>}
            {contractData.business.registrationNumber && <p>Registration Number: {contractData.business.registrationNumber}</p>}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold mb-2">EMPLOYEE:</h4>
            <p className="mb-1"><strong>{contractData.employee.fullName}</strong></p>
            <p className="mb-1">Employee Number: {contractData.employee.employeeNumber}</p>
            {contractData.employee.nationalId && <p className="mb-1">National ID: {formatNationalId(contractData.employee.nationalId)}</p>}
            {contractData.employee.driverLicenseNumber && <p className="mb-1">Driver License: {formatDriverLicense(contractData.employee.driverLicenseNumber)}</p>}
            {contractData.employee.address && <p className="mb-1">Address: {contractData.employee.address}</p>}
            <p className="mb-1">Phone: {formatPhoneNumberForDisplay(contractData.employee.phone)}</p>
            {contractData.employee.email && <p>Email: {contractData.employee.email}</p>}
          </div>
        </div>

        {/* Formal Letter Opening */}
        <div className="mb-6">
          <p className="mb-4">Dear {contractData.employee.fullName},</p>
          
          <p className="mb-4">
            <strong>Re: CONTRACT OF EMPLOYMENT</strong>
          </p>
          
          <p className="mb-4">
            We have pleasure to offer you a new role within the company. The terms and conditions are as outlined below.
          </p>
          
          <p className="mb-6">
            <strong>NOW THEREFORE IT IS HEREBY AGREED AS FOLLOWS:</strong>
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <p className="font-semibold mb-2">1. JOB TITLE</p>
              <p className="ml-4">
                Your position will be {contractData.jobTitle.title} at {contractData.business.name}. You will report to the manager or any delegated official, whom you will be under direct supervision and answerable to.
              </p>
            </div>
            
            <div>
              <p className="font-semibold mb-2">2. JOB DESCRIPTION</p>
              
              {contractData.jobTitle.description && (
                <p className="ml-4 mb-3">
                  <strong>2.1 Job Description:</strong> {contractData.jobTitle.description}
                </p>
              )}
              
              <p className="ml-4 mb-2">
                2.2 You shall perform such duties as defined in the job description and in accordance with the standards of performance set out and agreed to with your immediate supervisor. This will be signed separately.
              </p>
              <p className="ml-4 mb-3">
                2.3 Nothing contained in this clause shall preclude {contractData.business.name} from assigning you and/or transferring you from time to time to such other duties and responsibilities appropriate to your qualifications and experience without changing the essential character of this contract.
              </p>
              
              <div className="ml-4">
                <p className="font-semibold mb-2">2.4 KEY RESPONSIBILITIES</p>
                {contractData.jobTitle.responsibilities.length > 0 && (
                  <div className="mb-3">
                    <p className="font-medium mb-2">Standard Responsibilities:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      {contractData.jobTitle.responsibilities.map((responsibility, index) => (
                        <li key={index}>{responsibility}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {contractData.customResponsibilities && (
                  <div>
                    <p className="font-medium mb-2">Additional Responsibilities:</p>
                    <div className="ml-4 whitespace-pre-line">{contractData.customResponsibilities}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">2.5 EMPLOYMENT DETAILS</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p><strong>Position:</strong> {contractData.jobTitle.title}</p>
              {contractData.jobTitle.department && <p><strong>Department:</strong> {contractData.jobTitle.department}</p>}
              <p><strong>Start Date:</strong> {formatDate(contractData.startDate)}</p>
              {contractData.endDate && <p><strong>End Date:</strong> {formatDate(contractData.endDate)}</p>}
            </div>
            <div>
              <p><strong>Base Salary:</strong> {formatCurrency(contractData.baseSalary)} per month</p>
              <p><strong>Compensation Type:</strong> {contractData.compensationType.name}</p>
              {contractData.probationPeriodMonths && (
                <p><strong>Probation Period:</strong> {contractData.probationPeriodMonths} months</p>
              )}
              {contractData.supervisor && (
                <p><strong>Supervisor:</strong> {contractData.supervisor.fullName} ({contractData.supervisor.jobTitle?.title || contractData.supervisor.jobTitles?.title || 'Manager'})</p>
              )}
            </div>
          </div>

        </div>

        {/* Business Assignments */}
        {contractData.businessAssignments && contractData.businessAssignments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">2.5.1 BUSINESS ASSIGNMENTS</h3>

            {/* Primary Assignment */}
            {contractData.businessAssignments.find(b => b.isPrimary) && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Primary Assignment:</h4>
                {(() => {
                  const primary = contractData.businessAssignments.find(b => b.isPrimary);
                  return (
                    <div className="ml-4">
                      <p><strong>Business:</strong> {primary?.businessName}</p>
                      <p><strong>Type:</strong> {primary?.businessType?.charAt(0).toUpperCase() + primary?.businessType?.slice(1)}</p>
                      {primary?.role && <p><strong>Role:</strong> {primary.role}</p>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Additional Assignments */}
            {contractData.businessAssignments.filter(b => !b.isPrimary).length > 0 && (
              <div className="mb-4" style={{ pageBreakBefore: 'always' }}>
                <h4 className="font-semibold mb-2">Additional Assignments:</h4>
                <div className="ml-4">
                  {contractData.businessAssignments.filter(b => !b.isPrimary).map((assignment, index) => (
                    <div key={index} className="mb-2">
                      <p><strong>{index + 1}. {assignment.businessName}</strong></p>
                      <p className="ml-4">Type: {assignment.businessType?.charAt(0).toUpperCase() + assignment.businessType?.slice(1)}</p>
                      {assignment.role && <p className="ml-4">Role: {assignment.role}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compensation */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">2.6 COMPENSATION & BENEFITS</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold mb-2">2.6.1 Salary:</h4>
            <p className="ml-4">Base salary of {formatCurrency(contractData.baseSalary)} per month.</p>
            {contractData.isCommissionBased && (
              <p className="ml-4">This position includes commission-based compensation as outlined in the company's commission policy.</p>
            )}
          </div>

          {contractData.benefits.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">2.6.2 Benefits:</h4>
              <div className="ml-4">
                {contractData.benefits.map((benefit, index) => (
                  <div key={index} className="mb-2">
                    <p>
                      <strong>2.6.2.{index + 1} {benefit.benefitType.name}:</strong>{' '}
                      {benefit.isPercentage 
                        ? `${benefit.amount}% of base salary`
                        : formatCurrency(benefit.amount)
                      }
                      {benefit.benefitType.type !== 'allowance' && ` (${benefit.benefitType.type})`}
                    </p>
                    {benefit.notes && <p className="text-sm ml-4 text-gray-600">{benefit.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Standard Terms */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">TERMS AND CONDITIONS</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">3. DURATION OF THE CONTRACT</p>
              <p className="ml-4 mb-2">
                3.1 You shall serve {contractData.business.name} on a {contractData.endDate ? 
                  (() => {
                    const startDate = new Date(contractData.startDate);
                    const endDate = new Date(contractData.endDate);
                    const months = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    return months;
                  })() : 'indefinite'
                } months renewable contract commencing {formatDate(contractData.startDate)}
              </p>
              <p className="ml-4">
                3.2 {contractData.business.name} uses the Balanced Scorecard Performance Management System which is the basis upon which terms of employment contract are determined. However, NEC relevant to our industry rates take precedence.
              </p>
            </div>

            <div>
              <p className="font-semibold">4. OFFICE HOURS</p>
              <p className="ml-4">
                4.1 Ordinarily your working hours are 8.5 hours for 26 days in a month. However, due to the position and nature of the commercial/hospitality business, you may be expected to work beyond these times when necessary.
              </p>
            </div>

            <div>
              <p className="font-semibold">5. NSSA, ZIMRA</p>
              <p className="ml-4 mb-2">
                5.1 Membership to NSSA will be in accordance with statutory requirements.
              </p>
              <p className="ml-4">
                5.2 Applicable tax will be deducted from your salary and remitted to Zimra as per statutes.
              </p>
            </div>

            <div>
              <p className="font-semibold">6. VACATION LEAVE</p>
              <p className="ml-4">
                6.1 You accrue 2.5 days leave days per month (this includes weekends and public holidays).
              </p>
            </div>

            <div>
              <p className="font-semibold">7. DUTY OF CARE AND CONFIDENTIALITY</p>
              <p className="ml-4 mb-2">
                7.1 All work conducted by {contractData.business.name} is confidential. Under no circumstances may information be divulged to persons inside or outside the organization concerning office matters, business issues, salaries or conditions of service, or customer (guest or punter) information. Any breach of confidentiality will result in disciplinary action being taken against you.
              </p>
              <p className="ml-4 mb-2">
                7.2 You shall exercise all reasonable care and diligence in the performance of your duties in accordance with the {contractData.business.name} Human Resources procedures, policies and regulations and Code of Conduct that is, Statutory Instrument 15 of 2006 or it's any subsequent amendments thereof which l have read and understood.
              </p>
              <p className="ml-4">
                7.3 You shall not, during the term of this contract or thereafter, without consent of the {contractData.business.name}, disclose any matter concerning the {contractData.business.name} business which came to your knowledge in the course of or incidental to your being employed by the {contractData.business.name} except so far as may be necessary and proper for the conduct of {contractData.business.name} business and in accordance with the Human Resources procedures, regulations and policies Code of Conduct that is Statutory Instrument 15 of 2006 or its subsequent amendments thereof.
              </p>
            </div>

            <div>
              <p className="font-semibold">8. COMMUNICATION, TEAMWORK AND PERFORMANCE</p>
              <p className="ml-4">
                8.1 It is essential that you develop an understanding of {contractData.business.name} issues. {contractData.business.name} expects a high standard of commitment from you. Communication and teamwork are very important, and {contractData.business.name} expects you to make your contribution and play your part in ensuring the success of the organisation. It is essential for you to take ownership of assignments, to achieve quality standards and to meet deadlines. There is a formal performance management system which you are required to implement for your team.
              </p>
            </div>

            <div>
              <p className="font-semibold">9. INTEGRITY, EFFICIENCY, PASSION AND EXCELLENCE</p>
              <p className="ml-4 mb-2">
                9.1 You shall conform to the highest standards as set out in the {contractData.business.name} Human Resources regulations and procedures, Code of Conduct and Policies.
              </p>
              <p className="ml-4 mb-2">
                9.2 {contractData.business.name} expects that the conduct of its entire staff with customers (guests and punters), business contacts, and members of the public and with superiors, colleagues and subordinates, will foster its image as one that has a commitment to its core values and integrity.
              </p>
              <p className="ml-4 mb-2">
                9.3 {contractData.business.name} expects you to adhere to and uphold the organisation's core values, and you may be subjected to security vetting during the subsistence of your contract. Your contract will be terminated in the event of you failing the vetting process and {contractData.business.name} shall not be under any obligation to give reasons for your failure.
              </p>
              <p className="ml-4">
                9.4 All disciplinary and grievance issues will be dealt with in terms of the Employment Code of Conduct and Grievance Procedures that apply to every employee that is Statutory Instrument 15 of 2006 or its subsequent amendments.
              </p>
            </div>

            <div>
              <p className="font-semibold">10. CONFLICT OF INTEREST</p>
              <p className="ml-4 mb-2">
                10.1 You are required to devote your attention at work to the affairs of {contractData.business.name}. You shall not be involved, either directly or indirectly, during or outside business hours in any business interests and/or private work that is adverse to, prejudicial to or competing with the interests of {contractData.business.name}.
              </p>
              <p className="ml-4 mb-2">
                10.2 Any business interests and/or private work must be declared at commencement of this appointment, and approval for any subsequent outside business interests and/or private work must be obtained from {contractData.business.name} through your superior.
              </p>
              <p className="ml-4">
                10.3 Reasonable requests to carryout private work will not be refused, provided that there is no conflict of interest with {contractData.business.name}' work and use of {contractData.business.name} resources and facilities is not acceptable. The private work and outside interests must not have a negative effect on the {contractData.business.name}'s image and reputation and your ability to perform your duties.
              </p>
            </div>

            <div>
              <p className="font-semibold">11. CUSTOMER SERVICE</p>
              <p className="ml-4 mb-2">
                11.1 This is a significant focus for {contractData.business.name}, and it is important that all staff demonstrate commitment to customer service. This includes providing high quality service, being responsive to customer queries, requests, complaints and problems. It also includes promoting the image of {contractData.business.name}.
              </p>
              <p className="ml-4">
                11.2 It is important to ensure that you establish a culture with internal staff which is based on a commitment to performance, and which demonstrates responsiveness, willingness to help, compliance with procedures, a sense of urgency, attention to detail and maintaining effective relationships.
              </p>
            </div>

            <div>
              <p className="font-semibold">12. TERMINATION OF THE CONTRACT</p>
              <p className="ml-4 mb-2">
                12.1 {contractData.business.name} may at any time during the period of contract terminate your contract for misconduct, misbehaviour, non-performance in terms of your scorecard, inability to perform the functions of your office or any other reasonable cause determined by {contractData.business.name}.
              </p>
              <p className="ml-4">
                12.2 Either party may terminate the contract by giving one month's notice in writing or paying to either party one month's salary in lieu of notices.
              </p>
            </div>

            <div>
              <p className="font-semibold">13. CANCELLATION FOR MISREPRESENTATION/NON-DISCLOSURE</p>
              <p className="ml-4">
                13.1 {contractData.business.name} shall summarily terminate this contract for misrepresentation or non-disclosure in the event of your failure to disclose material facts which you had an obligation to disclose prior to the signing of this contract, which material facts have a bearing on the subsistence of the contract.
              </p>
            </div>

            <div>
              <p className="font-semibold">14. GENERAL CONDUCT</p>
              <p className="ml-4">
                14.1 You shall conduct yourself in a manner which is not detrimental to {contractData.business.name} and shall have an acceptable behaviour which does not tarnish the
              </p>
            </div>

          </div>
        </div>

        {/* Notes */}
        {contractData.notes && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">SPECIAL CONDITIONS</h3>
            <div className="ml-4 whitespace-pre-line">{contractData.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-6">SIGNATURES</h3>
          
          {/* Company Representative Signature */}
          <div className="mb-8">
            <div className="border-b border-black mb-2 h-16"></div>
            <p className="text-center">
              <strong>Employer Representative</strong><br/>
              {contractData.supervisor?.fullName || '_______________________'}<br/>
              {contractData.supervisor?.jobTitle?.title || contractData.supervisor?.jobTitles?.title || 'Manager'}<br/>
              Date: _______________
            </p>
          </div>

          {/* Employee Acceptance Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-4">ACCEPTANCE</h4>
            <div className="mb-6">
              <p className="mb-4">
                I, <span className="border-b border-black inline-block w-80 h-6"></span>, accept/decline the terms and conditions of employment as set out in this document.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="mb-2">Signature: <span className="border-b border-black inline-block w-48 h-6"></span></p>
                  <p className="mb-2">Date: <span className="border-b border-black inline-block w-32 h-6"></span></p>
                </div>
                <div>
                  <p className="mb-2">ID Number: {contractData.employee.nationalId ? (
                    <span className="font-medium">{formatNationalId(contractData.employee.nationalId)}</span>
                  ) : (
                    <span className="border-b border-black inline-block w-40 h-6"></span>
                  )}</p>
                  <p className="mb-2">Driver License: {contractData.employee.driverLicenseNumber ? (
                    <span className="font-medium">{formatDriverLicense(contractData.employee.driverLicenseNumber)}</span>
                  ) : (
                    <span className="border-b border-black inline-block w-40 h-6"></span>
                  )}</p>
                  <p className="mb-2">Cell Phone: {contractData.employee.phone ? (
                    <span className="font-medium">{formatPhoneNumberForDisplay(contractData.employee.phone)}</span>
                  ) : (
                    <span className="border-b border-black inline-block w-40 h-6"></span>
                  )}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-gray-600">
            <p>This contract is governed by the laws of the jurisdiction in which the business operates.</p>
            <p>Contract generated on {currentDate}</p>
          </div>
        </div>
      </div>
    )
  }
)

ContractTemplate.displayName = 'ContractTemplate'
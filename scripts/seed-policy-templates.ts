/**
 * MBM-189: Seed system-level policy templates.
 * Run: npx ts-node --env-file .env.local scripts/seed-policy-templates.ts
 * Idempotent — skips templates that already exist by title.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const TEMPLATES = [
  {
    title: 'Employee Code of Conduct',
    category: 'CODE_OF_CONDUCT',
    description: 'Sets the standard for professional behaviour expected from all employees.',
    content: `<h1>Employee Code of Conduct</h1>
<p><strong>{{BUSINESS_NAME}}</strong> is committed to maintaining a professional, respectful, and ethical work environment. This Code of Conduct applies to all employees, contractors, and representatives.</p>

<h2>1. Professional Behaviour</h2>
<p>All employees are expected to conduct themselves in a professional manner at all times, treating colleagues, customers, and suppliers with respect and courtesy.</p>

<h2>2. Honesty and Integrity</h2>
<p>Employees must act with honesty and integrity in all business dealings. Theft, fraud, or misrepresentation of any kind will result in immediate disciplinary action.</p>

<h2>3. Confidentiality</h2>
<p>Employees must maintain the confidentiality of business information, customer data, and trade secrets both during and after employment.</p>

<h2>4. Conflicts of Interest</h2>
<p>Employees must disclose any personal interests that may conflict with the interests of {{BUSINESS_NAME}} and must not use their position for personal gain.</p>

<h2>5. Use of Company Resources</h2>
<p>Company property, equipment, and time must be used responsibly and exclusively for business purposes unless otherwise authorised.</p>

<h2>6. Reporting Violations</h2>
<p>Employees who become aware of violations of this Code must report them to their manager or HR without fear of retaliation.</p>

<h2>Consequences</h2>
<p>Violations of this Code of Conduct may result in disciplinary action up to and including termination of employment.</p>`,
  },
  {
    title: 'Leave & Absence Policy',
    category: 'HR',
    description: 'Outlines annual leave, sick leave, and absence notification procedures.',
    content: `<h1>Leave & Absence Policy</h1>
<p>This policy sets out the leave entitlements and absence notification requirements for all employees of <strong>{{BUSINESS_NAME}}</strong>.</p>

<h2>1. Annual Leave</h2>
<p>All full-time employees are entitled to annual leave as stipulated in their employment contract and applicable labour law. Leave must be applied for and approved in advance.</p>

<h2>2. Sick Leave</h2>
<p>Employees who are unable to attend work due to illness must notify their manager as early as possible on the first day of absence. A medical certificate may be required for absences exceeding two consecutive days.</p>

<h2>3. Unpaid Leave</h2>
<p>Unpaid leave may be granted at the discretion of management. Requests must be submitted in writing with sufficient notice.</p>

<h2>4. Unauthorised Absence</h2>
<p>Absence without prior approval or notification will be treated as unauthorised and may result in disciplinary action.</p>

<h2>5. Public Holidays</h2>
<p>Employees are entitled to all gazetted public holidays. Where operational requirements necessitate working on a public holiday, compensation will be provided in accordance with applicable law.</p>`,
  },
  {
    title: 'Health & Safety Policy',
    category: 'SAFETY',
    description: 'Covers workplace safety responsibilities, hazard reporting, and emergency procedures.',
    content: `<h1>Health & Safety Policy</h1>
<p><strong>{{BUSINESS_NAME}}</strong> is committed to providing a safe and healthy working environment for all employees, customers, and visitors.</p>

<h2>1. Management Commitment</h2>
<p>Management will provide adequate resources to maintain safe working conditions and will ensure that health and safety is given priority in all operational decisions.</p>

<h2>2. Employee Responsibilities</h2>
<p>All employees must follow safety instructions, use personal protective equipment where required, report hazards immediately, and not engage in behaviour that endangers themselves or others.</p>

<h2>3. Hazard Reporting</h2>
<p>Any unsafe condition, near-miss, or accident must be reported to a manager immediately. Employees will not face retaliation for raising safety concerns.</p>

<h2>4. Emergency Procedures</h2>
<p>All employees must familiarise themselves with emergency exit locations, fire assembly points, and first-aid equipment. Emergency drills will be conducted periodically.</p>

<h2>5. Incident Recording</h2>
<p>All accidents and near-misses will be recorded and investigated to prevent recurrence.</p>`,
  },
  {
    title: 'IT Acceptable Use Policy',
    category: 'IT',
    description: 'Governs the acceptable use of company IT systems, internet, and devices.',
    content: `<h1>IT Acceptable Use Policy</h1>
<p>This policy governs the use of all information technology resources provided by <strong>{{BUSINESS_NAME}}</strong>, including computers, software, internet access, and mobile devices.</p>

<h2>1. Authorised Use</h2>
<p>IT resources are provided for business purposes. Limited personal use is permitted provided it does not interfere with work responsibilities or breach this policy.</p>

<h2>2. Prohibited Activities</h2>
<ul>
<li>Accessing, storing, or distributing illegal, offensive, or inappropriate content.</li>
<li>Attempting to circumvent security controls or access systems without authorisation.</li>
<li>Installing unauthorised software on company devices.</li>
<li>Sharing passwords or access credentials with others.</li>
</ul>

<h2>3. Data Security</h2>
<p>Employees must take reasonable precautions to protect company and customer data. Sensitive information must not be stored on personal devices or shared via unsecured channels.</p>

<h2>4. Monitoring</h2>
<p>{{BUSINESS_NAME}} reserves the right to monitor IT system usage. Employees should have no expectation of privacy when using company IT resources.</p>

<h2>5. Reporting Incidents</h2>
<p>Any suspected security breach, data loss, or suspicious activity must be reported to management immediately.</p>`,
  },
  {
    title: 'Anti-Harassment & Discrimination Policy',
    category: 'HR',
    description: 'Defines harassment and discrimination, prohibited conduct, and reporting procedures.',
    content: `<h1>Anti-Harassment & Discrimination Policy</h1>
<p><strong>{{BUSINESS_NAME}}</strong> is committed to a work environment free from harassment, discrimination, and bullying of any kind.</p>

<h2>1. Scope</h2>
<p>This policy applies to all employees, contractors, customers, and visitors. Harassment or discrimination based on race, gender, age, religion, disability, sexual orientation, or any other protected characteristic will not be tolerated.</p>

<h2>2. Definition of Harassment</h2>
<p>Harassment includes any unwanted conduct that violates a person's dignity or creates an intimidating, hostile, degrading, humiliating, or offensive environment.</p>

<h2>3. Reporting</h2>
<p>Employees who experience or witness harassment or discrimination must report it to their manager or HR. All reports will be treated confidentially and investigated promptly.</p>

<h2>4. Non-Retaliation</h2>
<p>Employees who make a good-faith complaint will not face retaliation. Retaliation is itself a serious violation of this policy.</p>

<h2>5. Consequences</h2>
<p>Employees found to have engaged in harassment or discrimination may face disciplinary action up to and including dismissal.</p>`,
  },
  {
    title: 'Confidentiality & Data Protection Policy',
    category: 'IT',
    description: 'Covers the handling of confidential business information and customer personal data.',
    content: `<h1>Confidentiality & Data Protection Policy</h1>
<p>All employees of <strong>{{BUSINESS_NAME}}</strong> have a duty to protect confidential business information and the personal data of customers and colleagues.</p>

<h2>1. Confidential Information</h2>
<p>Confidential information includes, but is not limited to: financial data, customer details, pricing, supplier agreements, trade secrets, and personnel records.</p>

<h2>2. Obligations During Employment</h2>
<p>Employees must not disclose confidential information to unauthorised parties and must use it solely for legitimate business purposes.</p>

<h2>3. Obligations After Employment</h2>
<p>The duty of confidentiality continues after the end of employment. Former employees must not use or disclose confidential information obtained during employment.</p>

<h2>4. Customer Data</h2>
<p>Personal data of customers must be collected, stored, and used only for the purposes for which it was collected and in accordance with applicable data protection law.</p>

<h2>5. Data Breaches</h2>
<p>Any accidental or suspected disclosure of confidential or personal data must be reported to management immediately.</p>`,
  },
  {
    title: 'Social Media Policy',
    category: 'HR',
    description: 'Sets guidelines for employees on personal and business use of social media.',
    content: `<h1>Social Media Policy</h1>
<p>This policy provides guidance to employees of <strong>{{BUSINESS_NAME}}</strong> on the appropriate use of social media, both in a personal and professional capacity.</p>

<h2>1. Business Social Media</h2>
<p>Only authorised employees may post on behalf of {{BUSINESS_NAME}}. All business social media content must be approved by management before publication.</p>

<h2>2. Personal Social Media</h2>
<p>Employees are free to use personal social media outside of work hours. However, employees must not post content that:</p>
<ul>
<li>Discloses confidential company information.</li>
<li>Brings the company into disrepute.</li>
<li>Is defamatory, harassing, or discriminatory.</li>
</ul>

<h2>3. Identification</h2>
<p>When discussing matters related to the company online, employees must make clear that their views are personal and not those of {{BUSINESS_NAME}}.</p>

<h2>4. Consequences</h2>
<p>Breaches of this policy may result in disciplinary action including dismissal, and may expose the employee to personal legal liability.</p>`,
  },
  {
    title: 'Grievance Procedure',
    category: 'HR',
    description: 'Formal process for employees to raise workplace complaints or concerns.',
    content: `<h1>Grievance Procedure</h1>
<p><strong>{{BUSINESS_NAME}}</strong> recognises that employees may from time to time have concerns or complaints about their working conditions or treatment. This procedure provides a fair and confidential process for resolving such issues.</p>

<h2>1. Informal Resolution</h2>
<p>Employees are encouraged to raise concerns informally with their direct manager in the first instance. Many issues can be resolved quickly through open discussion.</p>

<h2>2. Formal Grievance</h2>
<p>If the matter is not resolved informally, the employee may submit a written grievance to HR or senior management, setting out the nature of the complaint and the outcome sought.</p>

<h2>3. Investigation</h2>
<p>All formal grievances will be acknowledged within 5 working days and investigated promptly. The employee will be given the opportunity to present their case.</p>

<h2>4. Outcome</h2>
<p>The employee will be notified in writing of the outcome of the investigation and any action to be taken.</p>

<h2>5. Appeal</h2>
<p>If the employee is dissatisfied with the outcome, they may appeal to a more senior manager within 5 working days of receiving the written outcome.</p>`,
  },
  {
    title: 'Disciplinary Procedure',
    category: 'HR',
    description: "Sets out the steps followed when an employee's conduct or performance falls short of expectations.",
    content: `<h1>Disciplinary Procedure</h1>
<p>This procedure sets out the steps <strong>{{BUSINESS_NAME}}</strong> will follow when addressing employee conduct or performance issues.</p>

<h2>1. Informal Counselling</h2>
<p>For minor issues, the manager will counsel the employee informally and agree on improvements. This will be recorded but will not constitute a formal disciplinary action.</p>

<h2>2. Formal Disciplinary Process</h2>
<p>Where informal counselling has not resolved the issue, or where the conduct is more serious, a formal process will be initiated:</p>
<ul>
<li><strong>Written Warning:</strong> First formal step for minor misconduct.</li>
<li><strong>Final Written Warning:</strong> For repeated or more serious misconduct.</li>
<li><strong>Dismissal:</strong> For gross misconduct or failure to improve after warnings.</li>
</ul>

<h2>3. Gross Misconduct</h2>
<p>Some offences are sufficiently serious to warrant immediate dismissal without prior warnings. These include theft, fraud, violence, and serious breaches of company policy.</p>

<h2>4. Right to Representation</h2>
<p>Employees have the right to be accompanied by a colleague at any formal disciplinary meeting.</p>

<h2>5. Appeal</h2>
<p>Employees may appeal any formal disciplinary decision within 5 working days of receiving written notification.</p>`,
  },
  {
    title: 'Remote Work Policy',
    category: 'HR',
    description: 'Governs eligibility, expectations, and responsibilities for employees working remotely.',
    content: `<h1>Remote Work Policy</h1>
<p>This policy sets out the terms under which employees of <strong>{{BUSINESS_NAME}}</strong> may work remotely, whether from home or another off-site location.</p>

<h2>1. Eligibility</h2>
<p>Remote work is not a universal entitlement and is granted at management discretion based on the nature of the role, performance, and operational requirements.</p>

<h2>2. Work Hours and Availability</h2>
<p>Remote employees are expected to maintain their normal working hours and be reachable via the company's standard communication channels during those hours.</p>

<h2>3. Equipment and Security</h2>
<p>Employees working remotely must use approved equipment and secure internet connections. Company data must not be processed on unsecured networks or personal devices unless specifically authorised.</p>

<h2>4. Workspace Requirements</h2>
<p>Remote employees are responsible for maintaining a safe, professional, and productive workspace and must comply with all applicable health and safety requirements.</p>

<h2>5. Performance and Accountability</h2>
<p>Remote employees are held to the same performance standards as office-based employees. Failure to meet these standards may result in revocation of remote work privileges.</p>

<h2>6. Costs</h2>
<p>The company will not ordinarily reimburse employees for home office costs unless a specific arrangement has been agreed in writing.</p>`,
  },
  {
    title: 'Theft & Time Theft Policy',
    category: 'HR',
    description: "Defines theft in all its forms — including tardiness and time theft — and the consequences for employees.",
    content: `<h1>Theft & Time Theft Policy</h1>
<p><strong>{{BUSINESS_NAME}}</strong> has a zero-tolerance policy towards theft in all its forms. Theft is not limited to the taking of physical property — it encompasses any act by which an employee dishonestly takes something of value that belongs to the business, its customers, or colleagues.</p>

<h2>1. What Constitutes Theft</h2>
<p>The following are considered acts of theft and will be treated with the utmost seriousness:</p>
<ul>
<li><strong>Material theft:</strong> Removing, concealing, misappropriating, or damaging physical property, cash, stock, equipment, or any other asset belonging to {{BUSINESS_NAME}}, its customers, suppliers, or colleagues, without authorisation.</li>
<li><strong>Time theft:</strong> Falsifying time records, clocking in or out on behalf of another employee, being absent from duty without approval, taking extended breaks beyond those permitted, or engaging in personal activities during paid work hours.</li>
<li><strong>Tardiness as time theft:</strong> Habitual lateness without reasonable cause is a form of time theft. Employees who repeatedly arrive late deprive the business of paid-for work time and create an unfair burden on punctual colleagues. Persistent unexplained lateness will be treated as a disciplinary matter.</li>
<li><strong>Intellectual property theft:</strong> Copying, misusing, or disclosing confidential business information, customer data, or trade secrets for personal gain or to benefit a third party.</li>
<li><strong>Financial fraud:</strong> Manipulating records, invoices, expense claims, or payment systems to unlawfully obtain money or goods.</li>
</ul>

<h2>2. Time and Attendance Standards</h2>
<p>Employees are expected to:</p>
<ul>
<li>Arrive at work on time and ready to perform their duties.</li>
<li>Accurately record all hours worked through the authorised clock-in system.</li>
<li>Remain at their workstation or assigned area during working hours unless otherwise authorised.</li>
<li>Take only the approved break times and return promptly.</li>
<li>Notify their manager in advance if they expect to be late or absent.</li>
</ul>

<h2>3. Reporting Suspected Theft</h2>
<p>Any employee who suspects theft of any kind — including time theft — must report it to their manager or HR immediately. All reports will be treated confidentially and investigated. Employees will not face retaliation for making a good-faith report.</p>

<h2>4. Investigation Process</h2>
<p>Allegations of theft will be investigated promptly and fairly. The accused employee will be given an opportunity to respond before any disciplinary decision is made. The business reserves the right to suspend an employee with or without pay during an investigation where circumstances warrant.</p>

<h2>5. Consequences</h2>
<p>Theft in any form is considered gross misconduct. Employees found to have committed theft may face:</p>
<ul>
<li>Immediate suspension pending investigation.</li>
<li>Dismissal without notice.</li>
<li>Recovery of any financial loss suffered by the business.</li>
<li>Referral to law enforcement where criminal conduct is involved.</li>
</ul>
<p>{{BUSINESS_NAME}} reserves the right to pursue civil and criminal remedies against employees or former employees who engage in theft.</p>

<h2>6. Prevention</h2>
<p>{{BUSINESS_NAME}} will take reasonable steps to prevent theft, including maintaining clear records, using time-tracking systems, conducting periodic audits, and fostering a culture of honesty and accountability. All employees share responsibility for maintaining the integrity of the workplace.</p>`,
  },
]

async function main() {
  let inserted = 0
  let skipped = 0

  for (const t of TEMPLATES) {
    const existing = await prisma.policyTemplate.findFirst({ where: { title: t.title } })
    if (existing) {
      console.log(`  SKIP (exists): ${t.title}`)
      skipped++
      continue
    }
    await prisma.policyTemplate.create({ data: t })
    console.log(`  INSERT: ${t.title}`)
    inserted++
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

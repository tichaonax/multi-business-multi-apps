import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Role template data
const roleTemplates = [
  {
    title: "Food Preparation & POS Associate",
    department: "Restaurant",
    level: "junior",
    description: "Restaurant associate handling food prep and point-of-sale operations",
    businessType: "restaurant",
    isRoleTemplate: true,
    jobSummary: "The Food Preparation & POS Associate is responsible for preparing menu items to standard, operating the point-of-sale system, and delivering friendly, efficient service to every guest. The role supports both back-of-house and front-of-house operations to keep service fast, accurate, and hygienic.",
    responsibilities: [
      "Prepare food items according to recipes and portion standards.",
      "Wash, chop, and portion ingredients, and set up/stock workstations.",
      "Follow all food safety, hygiene, and cleaning procedures.",
      "Ensure kitchen, prep areas, and equipment are clean, sanitized, and organized.",
      "Accurately take customer orders and enter them into the POS system.",
      "Process cash, card, and digital payments, issue receipts, and handle cash responsibly.",
      "Check order accuracy before serving or handing over takeaway items.",
      "Answer basic questions about the menu and make suggestions when appropriate.",
      "Handle guest issues politely and escalate to a supervisor when needed.",
      "Restock front counter, condiments, packaging, and refrigerated displays as required.",
      "Follow opening, shift-change, and closing checklists.",
      "Work cooperatively with the kitchen and service team to meet speed and quality targets."
    ],
    skillsRequired: [
      "Basic food preparation and kitchen safety knowledge",
      "Familiarity with POS systems",
      "Basic math and cash-handling skills",
      "Customer service skills"
    ],
    qualifications: [
      "High school education or equivalent",
      "Food handler's certification preferred",
      "Ability to stand for long periods",
      "Available for flexible shifts including evenings/weekends"
    ],
    defaultNotes: "Temporarily assumes supervisor-on-duty responsibilities when the supervisor/manager is not present, including overseeing shift operations, supporting staff, handling escalated guest issues, and ensuring company policies, cash handling, and safety standards are followed.",
    defaultPermissionPreset: "restaurant-associate"
  },
  {
    title: "Grocery Shop Associate",
    department: "Sales",
    level: "junior",
    description: "Grocery store associate handling sales and store operations",
    businessType: "grocery",
    isRoleTemplate: true,
    jobSummary: "The Grocery Shop Associate handles customer transactions, stocks shelves, maintains store cleanliness, and sells WiFi access tokens to provide internet connectivity for shoppers. This role ensures a welcoming environment while driving sales and supporting store operations.",
    responsibilities: [
      "Greet customers, assist with product selection, and answer inquiries about groceries, pricing, and availability.",
      "Operate cash register, process payments accurately, and manage returns or exchanges.",
      "Sell WiFi tokens: Explain access plans, process token purchases (cash/card), issue codes/credentials.",
      "Stock shelves, rotate products for freshness, and organize displays to enhance product visibility.",
      "Monitor inventory levels, report low stock, and assist with receiving deliveries.",
      "Maintain cleanliness of checkout areas, aisles, and restrooms; follow health and safety protocols.",
      "Temporarily assume supervisor duties when manager is absent: Oversee shift operations, handle escalated customer issues, ensure cash handling and security standards.",
      "Promote store loyalty programs, specials, and up-sell complementary items like WiFi bundles."
    ],
    skillsRequired: [
      "Customer service experience in retail or grocery preferred",
      "Basic math and cash-handling skills",
      "Familiarity with POS systems",
      "Ability to learn WiFi token sales software quickly"
    ],
    qualifications: [
      "High school education or equivalent",
      "Physical ability to lift 10-23 kgs",
      "Able to stand for long periods and work in varied temperatures",
      "Reliable, friendly team player",
      "Available for flexible shifts including evenings/weekends"
    ],
    defaultNotes: "Temporarily assumes supervisor duties when manager is absent: Oversee shift operations, handle escalated customer issues, ensure cash handling and security standards.",
    defaultPermissionPreset: "grocery-associate"
  },
  {
    title: "Clothing Shop Associate",
    department: "Sales",
    level: "junior",
    description: "Clothing retail associate handling sales and store operations",
    businessType: "clothing",
    isRoleTemplate: true,
    jobSummary: "The Clothing Shop Associate provides exceptional customer service, manages sales floor operations, and drives clothing sales through styling advice and merchandising. This role focuses on creating a positive shopping experience to boost customer loyalty and revenue.",
    responsibilities: [
      "Engage customers with personalized service: Recommend outfits, sizes, and styles based on needs and trends.",
      "Process sales via POS system, handle payments, gift wrapping, and loyalty sign-ups.",
      "Maintain visual merchandising: Fold/stack clothes neatly, set up displays, and dress mannequins.",
      "Stock inventory from deliveries, tag items, and track sizes/styles for quick replenishment.",
      "Manage fitting rooms: Assist with try-ons, restock hangers, and ensure privacy/sanitation.",
      "Sell WiFi tokens: Explain access plans, process token purchases (cash/card), issue codes/credentials.",
      "Handle customer complaints professionally and escalate to supervisor as needed.",
      "Temporarily assume supervisor duties when manager is absent: Direct team workflow, resolve issues, enforce policies on returns/security.",
      "Stay updated on fashion trends, promotions, and inventory to support sales goals."
    ],
    skillsRequired: [
      "Retail sales experience preferred",
      "Passion for fashion/clothing",
      "Strong interpersonal skills with ability to build rapport and close sales",
      "Comfortable with POS/cash handling",
      "Basic inventory software knowledge"
    ],
    qualifications: [
      "High school education or equivalent",
      "Flexible for peak hours (evenings, weekends, holidays)",
      "Able to stand and lift 13 kgs repeatedly"
    ],
    defaultNotes: "Temporarily assumes supervisor duties when manager is absent: Direct team workflow, resolve issues, enforce policies on returns/security.",
    defaultPermissionPreset: "clothing-associate"
  }
]

async function main() {
  console.log('Seeding role templates...')

  for (const template of roleTemplates) {
    // Check if job title already exists
    const existing = await prisma.jobTitles.findUnique({
      where: { title: template.title }
    })

    if (existing) {
      // Update existing job title with role template data
      console.log(`Updating existing job title: ${template.title}`)
      await prisma.jobTitles.update({
        where: { id: existing.id },
        data: {
          ...template,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new job title
      console.log(`Creating new job title: ${template.title}`)
      await prisma.jobTitles.create({
        data: template
      })
    }
  }

  console.log('Role templates seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding role templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

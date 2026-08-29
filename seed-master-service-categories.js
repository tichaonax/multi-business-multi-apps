// Augments Payee, Supplier, and Contractor category pickers with the general
// taxonomy from "🏬 Master Business Service Categories.md". Idempotent —
// existing groups/categories are matched by exact name and left untouched;
// only genuinely new rows are inserted. Safe to re-run.
//
// The source doc's ### subheadings are folded away — the schema here is only
// two levels (Group -> Category), matching the doc's own stated goal of
// resolving a typed name to "a Domain + Service Category", not three levels.

const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// [domainName, domainEmoji, [[categoryName, categoryEmoji], ...]]
const TAXONOMY = [
  ['Food and Beverage Services', '🍽️', [
    ['Full-Service Restaurant', '🍽️'], ['Fast Food Restaurant', '🍔'], ['Takeaway Restaurant', '🥡'],
    ['Pizza Shop', '🍕'], ['Street Food Restaurant', '🌮'], ['Grill and Barbecue Restaurant', '🍗'],
    ['Pasta and Italian Restaurant', '🍝'], ['Asian Restaurant', '🍜'], ['Mexican and Latin Restaurant', '🌯'],
    ['African Restaurant', '🥘'], ['Indian Restaurant', '🍛'], ['Healthy Food Restaurant', '🥗'],
    ['Vegan and Vegetarian Restaurant', '🥙'],
    ['Food Vendor', '🍲'], ['Market Food Stall', '🛒'], ['Food Truck', '🚚'], ['Mobile Food Vendor', '🥡'],
    ['Meal Prep Service', '🍱'], ['Event Caterer', '🍽️'], ['Party Food Caterer', '🎉'],
    ['School Food Vendor', '🏫'], ['Corporate Caterer', '🏢'], ['Traditional Food Vendor', '🍛'],
    ['Snack Vendor', '🍢'], ['Roasted Snacks Vendor', '🥜'],
    ['Coffee Shop', '☕'], ['Bubble Tea Shop', '🧋'], ['Juice Bar', '🥤'], ['Smoothie Bar', '🍹'],
    ['Tea Shop', '🫖'], ['Lemonade Stand', '🍋'], ['Milkshake Shop', '🥛'], ['Beverage Vendor', '🧃'],
    ['Bar', '🍺'], ['Wine Bar', '🍷'], ['Cocktail Bar', '🍸'], ['Pub', '🍻'],
    ['Bakery', '🥖'], ['Cake Shop', '🎂'], ['Cupcake Shop', '🧁'], ['Donut Shop', '🍩'], ['Cookie Shop', '🍪'],
    ['Sweet Shop', '🍬'], ['Chocolate Shop', '🍫'], ['Ice Cream Shop', '🍦'], ['Frozen Dessert Shop', '🍨'],
    ['Pie Shop', '🥧'], ['Pastry Shop', '🥮'],
  ]],
  ['Food Retail and Markets', '🥬', [
    ['Vegetable Seller', '🥬'], ['Fruit Seller', '🍎'], ['Potato Seller', '🥔'], ['Tomato Seller', '🍅'],
    ['Onion Seller', '🧅'], ['Pepper Seller', '🌶️'], ['Herb Seller', '🌿'], ['Mushroom Seller', '🍄'],
    ['Watermelon Seller', '🍉'], ['Seasonal Fruit Seller', '🥭'], ['Plantain and Banana Seller', '🪴'],
    ['Fresh Produce Market Stall', '🧺'],
    ['Butcher', '🥩'], ['Poultry Seller', '🍗'], ['Fish Seller', '🐟'], ['Seafood Seller', '🍤'],
    ['Deli Meat Seller', '🥓'], ['Goat Meat Seller', '🐐'], ['Beef Seller', '🐄'], ['Pork Seller', '🐖'],
    ['Egg Seller', '🥚'], ['Dried Fish Seller', '🐟'],
    ['Grocery Store', '🛒'], ['Convenience Store', '🏪'], ['Mini Market', '🛍️'], ['Dry Goods Seller', '🥫'],
    ['Grain Seller', '🍚'], ['Bean Seller', '🫘'], ['Flour Seller', '🌾'], ['Spices Seller', '🧂'],
    ['Honey Seller', '🍯'], ['Dairy Seller', '🥛'], ['Frozen Food Seller', '🧊'], ['Beverage Retailer', '🥤'],
    ['Farmers Market Vendor', '🧺'], ['Grain Market Seller', '🌾'], ['Maize Seller', '🌽'],
    ['Legume Seller', '🫘'], ['Animal Feed Seller', '🪨'], ['Fertilizer Seller', '🧴'], ['Seed Seller', '🌱'],
    ['Nursery Plant Seller', '🪴'], ['Poultry Product Seller', '🥚'], ['Livestock Seller', '🐄'],
  ]],
  ['Retail and Trading', '🛍️', [
    ['Clothing Store', '👕'], ["Women's Clothing Store", '👗'], ["Men's Clothing Store", '👔'],
    ["Children's Clothing Store", '👶'], ['Shoe Store', '👟'], ['Handbag Store', '👜'], ['Jewelry Store', '💍'],
    ['Fashion Accessories Store', '🧢'], ['Underwear Store', '🩲'], ['Uniform Supplier', '🧥'],
    ['Fabric Store', '🧵'], ['Tailoring Materials Store', '✂️'],
    ['Home Goods Store', '🏠'], ['Furniture Store', '🛋️'], ['Home Décor Store', '🪑'],
    ['Kitchenware Store', '🍳'], ['Household Supplies Store', '🧺'], ['Cleaning Supplies Store', '🧹'],
    ['Bedding Store', '🛏️'], ['Curtains and Blinds Store', '🪟'], ['Candle Store', '🕯️'],
    ['Garden Supplies Store', '🪴'],
    ['Mobile Phone Store', '📱'], ['Computer Store', '💻'], ['Electronics Store', '🖥️'],
    ['Audio Equipment Store', '🎧'], ['TV and Appliance Store', '📺'], ['Gaming Store', '🕹️'],
    ['Phone Accessories Store', '🔌'], ['Printer and Office Equipment Store', '🖨️'],
    ['Battery Store', '🔋'], ['Satellite and Internet Equipment Store', '📡'],
    ['General Store', '🏬'], ['Gift Shop', '🎁'], ['Toy Store', '🧸'], ['Bookstore', '📚'],
    ['Stationery Store', '🖍️'], ['Art and Craft Store', '🎨'], ['Cosmetics Store', '🪞'],
    ['Beauty Supply Store', '🧴'], ['Pet Supply Store', '🐶'], ['Baby Store', '👶'],
    ['Discount Store', '🏷️'], ['Online Store', '🛍️'],
  ]],
  ['Construction, Hardware and Trades', '🏗️', [
    ['General Contractor', '🏗️'], ['Bricklayer', '🧱'], ['Carpenter', '🪵'], ['Home Builder', '🏠'],
    ['Commercial Builder', '🏢'], ['Renovation Contractor', '🪚'], ['Painter', '🎨'], ['Tiler', '🧱'],
    ['Drywall Installer', '🧱'], ['Roofer', '🏠'], ['Window Installer', '🪟'], ['Door Installer', '🚪'],
    ['Electrician', '⚡'], ['Plumber', '🚰'], ['HVAC Technician', '❄️'], ['Handyman', '🛠️'],
    ['Locksmith', '🔒'], ['Glass Repair Service', '🪟'], ['Fire-Safety Technician', '🧯'],
    ['Appliance Repair Service', '🛠️'], ['Furniture Repair Service', '🪑'], ['Equipment Repair Service', '🧰'],
    ['Pool Maintenance Service', '🏊'], ['Gutter Repair Service', '🪜'],
    ['Hardware Store', '🛠️'], ['Building Materials Supplier', '🧱'], ['Lumber Supplier', '🪵'],
    ['Cement and Concrete Supplier', '🧱'], ['Sand and Gravel Supplier', '🪨'], ['Paint Store', '🎨'],
    ['Plumbing Supplies Store', '🚰'], ['Electrical Supplies Store', '⚡'], ['Fastener Supplier', '🔩'],
    ['Doors and Windows Supplier', '🪟'], ['Tool Store', '🧰'], ['Safety Equipment Supplier', '🦺'],
  ]],
  ['Automotive and Transport', '🚗', [
    ['Auto Repair Shop', '🚗'], ['Oil Change Service', '🛢️'], ['Tire Repair Shop', '🛞'],
    ['Tire Sales Shop', '🛞'], ['Wheel Alignment Service', '🧭'], ['Brake Repair Service', '🛑'],
    ['Engine Repair Service', '⚙️'], ['Auto Electrical Service', '🔋'], ['Vehicle AC Repair Service', '❄️'],
    ['Exhaust Repair Service', '💨'], ['Car Wash', '🧽'], ['Vehicle Detailing Service', '✨'],
    ['Auto Parts Store', '🧰'], ['Tire and Wheel Store', '🛞'], ['Car Battery Store', '🔋'],
    ['Motor Oil and Lubricants Store', '🛢️'], ['Vehicle Accessories Store', '🚘'], ['Auto Glass Store', '🪟'],
    ['Car Audio Store', '🔊'], ['Truck Parts Store', '🛻'], ['Motorcycle Parts Store', '🏍️'],
    ['Farm Equipment Parts Store', '🚜'],
    ['Taxi Service', '🚕'], ['Ride-Hailing Driver', '🚗'], ['Delivery Service', '🚚'],
    ['Courier Service', '📦'], ['Moving Service', '🛻'], ['Freight Transport Service', '🚛'],
    ['Shuttle Service', '🚌'], ['Minibus Transport Service', '🚐'], ['Motorcycle Delivery Service', '🏍️'],
    ['Trucking Company', '🚚'], ['Equipment Haulage Service', '🚜'], ['Parking Service', '🅿️'],
    ['Car Dealership', '🚗'], ['Used Car Dealer', '🛻'], ['Motorcycle Dealer', '🏍️'], ['Truck Dealer', '🚚'],
    ['Car Rental Service', '🚗'], ['Van Rental Service', '🚐'], ['Equipment Rental Service', '🚜'],
    ['Vehicle Leasing Service', '🛻'], ['Vehicle Importer', '🚘'], ['Vehicle Brokerage Service', '🧾'],
  ]],
  ['Personal Care and Wellness', '💇', [
    ['Hair Salon', '💇'], ['Hair Braiding Salon', '🧶'], ['Barber Shop', '💈'], ['Nail Salon', '💅'],
    ['Makeup Artist', '💄'], ['Beauty Therapist', '🧴'], ['Hair Removal Service', '🪒'],
    ['Wig and Hair Extension Seller', '🪮'], ['Skincare Specialist', '🧼'], ['Beauty Supply Store', '🪞'],
    ['Beauty Content Creator', '📸'], ['Bridal Beauty Service', '👰'],
    ['Massage Therapist', '💆'], ['Spa', '🧖'], ['Yoga Instructor', '🧘'], ['Gym', '🏋️'],
    ['Personal Trainer', '🏃'], ['Fitness Instructor', '🤸'], ['Nutrition Coach', '🍏'],
    ['Wellness Coach', '🧠'], ['Holistic Therapy Service', '🌿'], ['Meditation Instructor', '🧘'],
    ['Sauna Service', '🛁'], ['Physiotherapy Service', '🩺'],
  ]],
  ['Health and Care Services', '🏥', [
    ['Medical Clinic', '🩺'], ['Doctor', '🧑‍⚕️'], ['Dentist', '🦷'], ['Optometrist', '👁️'],
    ['Pharmacy', '💊'], ['Laboratory Service', '🧪'], ['Medical Imaging Service', '🩻'],
    ['Nursing Service', '🩺'], ['Ambulance Service', '🚑'], ['Home Health Care', '🧑‍⚕️'],
    ['First Aid Service', '🩹'], ['Specialist Medical Practice', '🧬'],
    ['Daycare Center', '👶'], ['Childcare Service', '🧸'], ['Nanny Service', '👩‍🍼'],
    ['Elder Care Service', '👵'], ['Disability Support Service', '🧑‍🦽'], ['Home Care Service', '🏠'],
    ['Counseling Service', '🧠'], ['Caregiver Service', '🧑‍⚕️'], ['Family Support Service', '👨‍👩‍👧'],
    ['Foster Care Service', '🏡'],
  ]],
  ['Technology and Digital Services', '💻', [
    ['IT Support', '💻'], ['Web Developer', '🌐'], ['App Developer', '📱'], ['Software Developer', '🖥️'],
    ['Cloud Services Provider', '☁️'], ['AI Automation Specialist', '🧠'], ['Database Specialist', '🗄️'],
    ['Software Testing Service', '🧪'], ['Systems Integration Service', '🔌'], ['Computer Repair Service', '🛠️'],
    ['Digital Product Developer', '📲'], ['Game Developer', '🎮'],
    ['Cybersecurity Specialist', '🔐'], ['Data Analyst', '📊'], ['Data Entry Service', '🗃️'],
    ['Data Backup Service', '💾'], ['Digital Forensics Service', '🔍'], ['IT Security Consultant', '🛡️'],
    ['Compliance Technology Service', '🧾'], ['Network Installation Service', '📡'],
    ['Internet Service Provider', '🌐'], ['CCTV Installation Service', '📷'],
    ['Digital Marketing Agency', '📣'], ['Social Media Manager', '📱'], ['SEO Specialist', '🔎'],
    ['Email Marketing Service', '📧'], ['Graphic Designer', '🖼️'], ['Videographer', '🎥'],
    ['Photographer', '📸'], ['Podcast Producer', '🎙️'], ['Content Writer', '✍️'], ['Copywriter', '📰'],
    ['Video Editor', '📺'], ['Signage Designer', '🪧'],
  ]],
  ['Education and Training', '🧑‍🏫', [
    ['School', '🏫'], ['College', '🎓'], ['Tutoring Service', '📚'], ['Mathematics Tutor', '➗'],
    ['Reading Tutor', '📖'], ['Science Tutor', '🔬'], ['Language Tutor', '🗣️'], ['Computer Tutor', '💻'],
    ['Exam Preparation Service', '📝'], ['Homework Support Service', '📚'],
    ['Training Provider', '🧑‍🏫'], ['Business Trainer', '💼'], ['Technology Trainer', '💻'],
    ['Craft Instructor', '🧵'], ['Art Teacher', '🎨'], ['Music Teacher', '🎵'], ['Driving School', '🚗'],
    ['Trade Skills Trainer', '🧰'], ['Public Speaking Coach', '🗣️'], ['Career Coach', '🎯'],
    ['Leadership Coach', '🧠'], ['Certification Training Provider', '📜'],
  ]],
  ['Professional and Business Services', '💼', [
    ['Business Consultant', '💼'], ['Strategy Consultant', '📈'], ['Financial Consultant', '📊'],
    ['Tax Consultant', '🧾'], ['Management Consultant', '🧠'], ['Marketing Consultant', '📣'],
    ['Operations Consultant', '🏢'], ['HR Consultant', '🧑‍💼'], ['Project Management Consultant', '🏗️'],
    ['Healthcare Consultant', '🏥'], ['Retail Consultant', '🛒'], ['Real Estate Consultant', '🏠'],
    ['Accountant', '🧾'], ['Bookkeeper', '📚'], ['Payroll Service', '🧮'], ['Financial Services Provider', '💳'],
    ['Money Transfer Service', '🏦'], ['Insurance Agent', '🛡️'], ['Lawyer', '⚖️'], ['Notary Service', '📜'],
    ['Document Preparation Service', '📝'], ['Printing Service', '🖨️'], ['Postal and Mail Service', '📬'],
    ['Virtual Assistant', '🗂️'],
    ['Real Estate Agent', '🏠'], ['Property Management Service', '🏢'], ['Property Developer', '🏘️'],
    ['Rental Property Business', '🏡'], ['Short-Term Rental Host', '🏠'], ['Commercial Property Service', '🏬'],
    ['Property Valuation Service', '📐'], ['Property Brokerage Service', '🧾'],
    ['Land Development Service', '🏗️'], ['Property Maintenance Service', '🧹'],
  ]],
  ['Agriculture, Farming and Animals', '🌿', [
    ['Crop Farmer', '🌾'], ['Maize Farmer', '🌽'], ['Vegetable Farmer', '🥬'], ['Fruit Farmer', '🍎'],
    ['Herb Farmer', '🌿'], ['Flower Farmer', '🌻'], ['Mushroom Farmer', '🍄'], ['Seedling Nursery', '🌱'],
    ['Tree Nursery', '🌳'], ['Plant Nursery', '🪴'], ['Fertilizer Supplier', '🧪'], ['Farm Services Provider', '🚜'],
    ['Cattle Farmer', '🐄'], ['Goat Farmer', '🐐'], ['Sheep Farmer', '🐑'], ['Pig Farmer', '🐖'],
    ['Poultry Farmer', '🍗'], ['Fish Farmer', '🐟'], ['Beekeeper', '🐝'], ['Pet Breeder', '🐶'],
    ['Veterinary Service', '🐾'], ['Pet Grooming Service', '🐕'], ['Pet Boarding Service', '🐶'],
    ['Animal Feed Supplier', '🪨'],
  ]],
  ['Manufacturing and Production', '🏭', [
    ['Manufacturer', '🏭'], ['Brick Manufacturer', '🧱'], ['Furniture Manufacturer', '🪵'],
    ['Clothing Manufacturer', '👕'], ['Cosmetics Manufacturer', '🧴'], ['Soap Manufacturer', '🧼'],
    ['Food Processor', '🥫'], ['Beverage Producer', '🥤'], ['Bread Manufacturer', '🍞'],
    ['Metal Fabricator', '🪑'], ['Chemical Manufacturer', '🧪'], ['Textile Manufacturer', '🧵'],
    ['Tailor', '🧵'], ['Dressmaker', '👗'], ['Embroidery Service', '🪡'], ['Furniture Maker', '🪑'],
    ['Carpenter Workshop', '🪵'], ['Pottery Maker', '🧱'], ['Jewelry Maker', '💍'], ['Candle Maker', '🕯️'],
    ['Soap Maker', '🧼'], ['Basket Weaver', '🧺'], ['Artist', '🎨'], ['Craft Seller', '🖌️'],
  ]],
  ['Cleaning, Maintenance and Household Services', '🧹', [
    ['Residential Cleaning Service', '🧹'], ['Commercial Cleaning Service', '🏢'], ['Deep Cleaning Service', '🧽'],
    ['Window Cleaning Service', '🪟'], ['Laundry Service', '🧺'], ['Upholstery Cleaning Service', '🛋️'],
    ['Carpet Cleaning Service', '🧼'], ['Post-Construction Cleaning Service', '🧹'],
    ['Waste Removal Service', '🗑️'], ['Sanitization Service', '🧴'],
    ['Domestic Worker Service', '🧹'], ['Babysitting Service', '👶'], ['Home Cooking Service', '👩‍🍳'],
    ['Gardening Service', '🪴'], ['Handyman Service', '🧰'], ['House Sitting Service', '🏠'],
    ['Pet Sitting Service', '🐶'], ['Home Organization Service', '🏡'], ['Home Security Service', '🔐'],
    ['Pest Control Service', '🧯'],
  ]],
  ['Events, Entertainment and Hospitality', '🎉', [
    ['Event Planner', '🎉'], ['Birthday Event Service', '🎂'], ['Wedding Planner', '💍'],
    ['Graduation Event Service', '🎓'], ['Party Decorations Service', '🎈'], ['Event Equipment Rental', '🎪'],
    ['DJ Service', '🎤'], ['Live Music Service', '🎶'], ['Event Photography', '📸'],
    ['Event Videography', '🎥'], ['Floral Decoration Service', '🌸'], ['Event Furniture Rental', '🪑'],
    ['Gaming Center', '🎮'], ['Pool Hall', '🎱'], ['Bowling Center', '🎳'], ['Cinema', '🎬'],
    ['Art Studio', '🎨'], ['Theatre Company', '🎭'], ['Sports Club', '🏟️'], ['Football Academy', '⚽'],
    ['Swimming School', '🏊'], ['Music Studio', '🎵'], ['Amusement Service', '🎪'], ['Ticketing Service', '🎟️'],
    ['Hotel', '🏨'], ['Guest House', '🛏️'], ['Bed and Breakfast', '🏡'], ['Campsite', '🏕️'], ['Lodge', '🛎️'],
    ['Travel Agency', '✈️'], ['Tour Operator', '🧳'], ['Tour Guide', '🗺️'], ['Travel Shuttle Service', '🚐'],
    ['Visa Assistance Service', '🛂'], ['Travel Booking Service', '🧾'],
  ]],
  ['Utilities, Waste and Environmental Services', '♻️', [
    ['Electricity Provider', '⚡'], ['Water Supply Service', '💧'], ['Gas Supplier', '🔥'],
    ['Solar Installation Service', '☀️'], ['Solar Equipment Supplier', '🔋'], ['Generator Service', '⚡'],
    ['Electrical Backup Service', '🔌'], ['Borehole Service', '💧'], ['Water Tank Supplier', '🚰'],
    ['Energy Efficiency Service', '🌬️'],
    ['Waste Collection Service', '🗑️'], ['Recycling Service', '♻️'], ['Waste Haulage Service', '🚛'],
    ['Hazardous Waste Service', '🧴'], ['Landscaping Service', '🌿'], ['Tree Removal Service', '🌳'],
    ['Drainage Service', '🌧️'], ['Soil Supply Service', '🪨'], ['Environmental Consulting Service', '🧪'],
    ['Pest Control Service', '🐜'],
  ]],
  ['Community, Religious and Public Services', '🏛️', [
    ['Religious Organization', '🕌'], ['Church', '⛪'], ['Synagogue', '🕍'], ['Temple', '🛕'],
    ['Community Organization', '🧑‍🤝‍🧑'], ['Charity Organization', '❤️'], ['Nonprofit Organization', '🫶'],
    ['Community School', '🏫'], ['Community Food Service', '🍲'], ['Donation Service', '🎁'],
    ['Community Support Service', '🤝'],
    ['Government Office', '🏛️'], ['Licensing Service', '🪪'], ['Permit Service', '📄'],
    ['Security Service', '🚓'], ['Guard Service', '👮'], ['Fire Safety Service', '🧯'],
    ['Civic Organization', '🗳️'], ['Public Library', '📚'], ['Public Health Service', '🏥'],
    ['Housing Support Service', '🏘️'],
  ]],
]

// The three structurally-identical Group -> Category systems this taxonomy applies to.
const SYSTEMS = [
  { label: 'contractor', groupModel: 'contractorCategoryGroups', categoryModel: 'contractorCategories' },
  { label: 'supplier', groupModel: 'supplierCategoryGroups', categoryModel: 'supplierCategories' },
  { label: 'payee', groupModel: 'payeeCategoryGroups', categoryModel: 'payeeCategories' },
]

async function ensureGroup(groupModel, name, emoji, displayOrder) {
  const existing = await p[groupModel].findFirst({ where: { name } })
  if (existing) return existing
  try {
    return await p[groupModel].create({ data: { name, emoji, displayOrder } })
  } catch (e) {
    if (e.code === 'P2002') return p[groupModel].findFirst({ where: { name } })
    throw e
  }
}

async function ensureCategory(categoryModel, groupId, name, emoji, displayOrder) {
  try {
    await p[categoryModel].create({ data: { groupId, name, emoji, displayOrder } })
    return true
  } catch (e) {
    if (e.code === 'P2002') return false
    throw e
  }
}

async function main() {
  for (const system of SYSTEMS) {
    let groupsCreated = 0
    let categoriesCreated = 0
    let categoriesSkipped = 0

    for (const [domainIdx, [domainName, domainEmoji, categories]] of TAXONOMY.entries()) {
      const before = await p[system.groupModel].findFirst({ where: { name: domainName } })
      const group = await ensureGroup(system.groupModel, domainName, domainEmoji, 100 + domainIdx)
      if (!before) groupsCreated++

      for (const [catIdx, [catName, catEmoji]] of categories.entries()) {
        const created = await ensureCategory(system.categoryModel, group.id, catName, catEmoji, catIdx)
        if (created) categoriesCreated++
        else categoriesSkipped++
      }
    }

    console.log(`[${system.label}] groups created: ${groupsCreated}, categories created: ${categoriesCreated}, skipped: ${categoriesSkipped}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())

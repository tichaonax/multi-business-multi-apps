# 🚗 Vehicle Parts Inventory System Requirements

## 🎯 Purpose

Enhance the vehicle-service parts inventory system so every part can be consistently categorized, searched, stocked, sold, transferred, and reported on.

The system must support a large and growing parts catalog without creating duplicate or confusing product records. It should support both:

- 🛒 Parts sold directly to customers
- 🛠️ Parts used during vehicle repair and service jobs
- 📦 Parts transferred between businesses or locations
- 🔧 Workshop tools and consumables used internally

***

## 🧱 Inventory Structure

Every inventory item must follow this hierarchy:

```text
Domain → Category → Subcategory → Inventory Item
```

Example:

```text
🚗 Vehicle Service Parts Inventory
  └── 🛑 Brakes, Steering and Suspension
      └── 🛑 Brake Parts
          └── 🧩 Brake Pads
              └── Toyota Corolla Front Brake Pads
```

The hierarchy should be used for categorization and navigation. Product-specific details, such as vehicle compatibility, brand, condition, and part number, must be stored as fields on the inventory item rather than as additional categories.

***

# 🚗 Vehicle Service Parts Inventory

## 🛢️ Service Items

### 🧽 Filters
- 🛢️ Oil filters
- 🌬️ Engine air filters
- 🏠 Cabin air filters
- ⛽ Fuel filters
- 🔄 Transmission filters

### 🧴 Oils and Fluids
- 🛢️ Engine oil
- ⚙️ Gear oil
- 🔄 Transmission fluid
- 🛑 Brake fluid
- ❄️ Coolant
- 🧭 Power-steering fluid
- 🪟 Washer fluid

### 🧪 Chemicals and Additives
- 🧪 Fuel-injector cleaner
- 🧴 Brake cleaner
- 🧴 Engine degreaser
- 🧴 Grease
- 🧴 Sealants
- 🧴 Gasket maker
- 🧴 Rust remover
- 🧴 Tire sealant

***

## ⚙️ Engine and Fuel Parts

### ⚙️ Engine Parts
- 🔩 Engine mounts
- 🧱 Pistons
- ⚙️ Crankshafts
- ⚙️ Camshafts
- 🧩 Valves
- 🛢️ Oil pumps
- 🧱 Cylinder heads
- 🧩 Gaskets and seals

### ⏱️ Belts and Timing
- 🪢 Drive belts
- ⛓️ Timing chains
- 🪢 Timing belts
- ⚙️ Tensioners
- ⚙️ Timing gears
- 🧩 Timing kits

### ⛽ Fuel System
- ⛽ Fuel pumps
- 🧴 Fuel injectors
- ⛽ Fuel tanks
- 🛢️ Fuel-pressure regulators
- 🧴 Fuel hoses
- 🧩 Fuel rails
- ⛽ Fuel caps

### 🔥 Ignition and Sensors
- ⚡ Spark plugs
- ⚡ Ignition coils
- 🪢 Spark-plug wires
- 🖥️ Engine sensors
- 🧭 Throttle sensors
- 🧪 Oxygen sensors
- 🌡️ Temperature sensors
- ⚙️ Crankshaft sensors

***

## ❄️ Cooling and Climate Parts

### 🌡️ Cooling System
- ❄️ Radiators
- 💧 Water pumps
- 🌡️ Thermostats
- 🌀 Cooling fans
- 🚿 Radiator hoses
- 🧴 Coolant reservoirs
- 🧩 Radiator caps

### 🧊 Air Conditioning
- ❄️ AC compressors
- 🧊 AC condensers
- 🧊 AC evaporators
- 💨 Blower motors
- 🧩 Expansion valves
- 🧴 Refrigerant
- 🧩 AC hoses

### 🔥 Heating System
- 🔥 Heater cores
- 🌬️ Heater blowers
- 🧩 Heater hoses
- 🎛️ Climate controls
- 🌬️ Air vents
- 🧩 HVAC actuators

***

## 🔋 Electrical and Lighting

### 🔋 Starting and Charging
- 🔋 Batteries
- ⚡ Alternators
- ⚡ Starter motors
- 🔌 Voltage regulators
- 🔋 Battery terminals
- 🔋 Battery cables
- 🔌 Starter relays

### 🔌 Electrical Components
- 🔌 Wiring harnesses
- 🧷 Connectors
- 🛡️ Fuses
- 🔌 Relays
- 🎛️ Switches
- 🧩 Fuse boxes
- 🖥️ Control modules

### 💡 Lighting and Visibility
- 💡 Headlight bulbs
- 🔦 Headlight assemblies
- 🔴 Tail lights
- 🟠 Indicator lights
- 💡 Fog lights
- 🪟 Wiper blades
- ⚙️ Wiper motors
- 🪞 Mirrors

***

## 🛑 Brakes, Steering and Suspension

### 🛑 Brake Parts
- 🧩 Brake pads
- ⚙️ Brake rotors
- 🛞 Brake drums
- 🧱 Brake shoes
- 🧰 Brake calipers
- 🛢️ Master cylinders
- 🛞 Brake hoses
- 🚨 ABS sensors

### 🧭 Steering Parts
- 🧭 Steering racks
- ⚙️ Steering gearboxes
- 🧴 Power-steering pumps
- 🪢 Tie-rod ends
- 🧩 Steering couplings
- 🛞 Steering knuckles

### 🛞 Suspension Parts
- 🪜 Shock absorbers
- 🪜 Struts
- 🌀 Coil springs
- 🛞 Leaf springs
- 🧩 Control arms
- ⚙️ Ball joints
- 🔗 Stabilizer links
- 🪢 Suspension bushes

***

## 🛞 Tires, Wheels and Drivetrain

### 🛞 Tires and Wheels
- 🆕 New tires
- ♻️ Used tires
- ⚙️ Steel rims
- ✨ Alloy rims
- 🧩 Wheel covers
- 🔩 Lug nuts
- 💨 Tire valves
- ⚖️ Wheel weights

### 🩹 Tire Repair Supplies
- 🩹 Tire patches
- 🩹 Tire plugs
- 🧴 Tire sealant
- 🧰 Tire repair kits
- 💨 Tire-pressure sensors
- 🧩 Valve caps

### 🔄 Transmission and Clutch
- ⚙️ Transmission assemblies
- 🔄 Transmission filters
- 🧩 Transmission seals
- 🛞 Torque converters
- 🧩 Clutch kits
- 🧩 Clutch discs
- 🛞 Pressure plates
- ⚙️ Flywheels

### 🛻 Axles and Driveline
- 🛞 CV axles
- ⚙️ Driveshafts
- 🧩 Universal joints
- ⚙️ Differentials
- 🧩 CV boots
- ⚙️ Wheel bearings
- 🛞 Wheel hubs

***

## 💨 Exhaust, Body and Interior

### 💨 Exhaust and Emissions
- 💨 Exhaust pipes
- 🔇 Mufflers
- 🧩 Catalytic converters
- 🧩 Exhaust manifolds
- 🧴 Exhaust gaskets
- 🧩 Exhaust clamps
- 🧪 Oxygen sensors
- 🧩 EGR valves

### 🚪 Body and Exterior
- 🚘 Bumpers
- 🚪 Doors
- 🪶 Fenders
- 🧱 Hoods
- 🧩 Grilles
- 🪟 Windshields
- 🪟 Window regulators
- 🔒 Door locks

### 🪑 Interior and Accessories
- 🪑 Seat covers
- 🧭 Floor mats
- 🎛️ Dashboards
- 📻 Radios
- 🔊 Speakers
- 📹 Reverse cameras
- 📱 Phone mounts
- 🧰 Emergency kits

***

## 🧰 Workshop Inventory

### 🔧 Hand Tools
- 🔧 Wrenches
- 🪛 Screwdrivers
- 🧰 Socket sets
- 🗜️ Pliers
- 📏 Measuring tools
- 🔧 Torque wrenches

### ⚡ Workshop Equipment
- 🛞 Jacks
- 🪜 Jack stands
- 💨 Air compressors
- 🛞 Tire changers
- ⚖️ Wheel balancers
- 🔍 Diagnostic scanners
- 🔋 Battery chargers

### 🧤 Workshop Consumables
- 🧤 Mechanic gloves
- 🧻 Shop towels
- 🧽 Cleaning rags
- 🧴 Hand cleaner
- 🔩 Fasteners
- 🧷 Cable ties
- 🗑️ Waste containers

***

# 🏷️ Required Inventory Item Fields

Each inventory item must support the following fields.

| Field | Purpose | Example |
|---|---|---|
| 🏷️ Item name | Clear name shown to users | Toyota Corolla Front Brake Pads |
| 🧾 SKU / Part number | Unique product identifier | BP-TC-2014-FR |
| 🗂️ Domain | Top-level inventory classification | 🛑 Brakes, Steering and Suspension |
| 📁 Category | Main group within the domain | 🛑 Brake Parts |
| 🧩 Subcategory | Specific part type | 🧩 Brake Pads |
| 🚗 Vehicle make | Vehicle manufacturer | Toyota |
| 🚙 Vehicle model | Vehicle model | Corolla |
| 📅 Compatible year range | Start and end compatibility years | 2010–2014 |
| ⚙️ Engine specification | Engine size, fuel type, or engine code | 1.8L Petrol |
| 🔄 Transmission type | Vehicle transmission compatibility | Automatic |
| 🏭 Brand | Manufacturer or supplier brand | Bosch |
| 🏷️ Part type | Original or replacement classification | OEM / Aftermarket |
| ♻️ Condition | Current item condition | New / Used / Refurbished |
| 📍 Storage location | Physical stock location | Shelf A, Bin 04 |
| 🔢 Quantity in stock | Current quantity available | 12 |
| 🚨 Reorder level | Quantity that triggers a low-stock alert | 3 |
| 💵 Cost price | Purchase cost per unit | $25.00 |
| 🏷️ Selling price | Default sale price per unit | $40.00 |
| 🤝 Supplier | Supplier or vendor | ABC Auto Parts |
| 📅 Purchase date | Date the item was received | 2026-08-16 |
| 🧾 Notes | Internal fitting, compatibility, or sales notes | Front axle only |

***

# 🔍 Search and Filtering Requirements

The inventory search must support searching by:

- 🏷️ Item name
- 🧾 SKU or manufacturer part number
- 🚗 Vehicle make
- 🚙 Vehicle model
- 📅 Compatible year
- ⚙️ Engine size or engine code
- 🏭 Brand
- 🗂️ Domain
- 📁 Category
- 🧩 Subcategory
- 📍 Storage location
- 🤝 Supplier
- ♻️ Condition

The user must also be able to filter inventory by:

- 📦 In stock
- 🚨 Low stock
- ❌ Out of stock
- 🆕 New
- ♻️ Used
- 🔄 Refurbished
- 🏷️ OEM
- 🛠️ Aftermarket
- 🏬 Store/location
- 💵 Price range

***

# 📦 Inventory Movement Requirements

Every stock movement must be recorded against the inventory item.

| Movement | Description |
|---|---|
| ➕ Stock received | New stock added from a supplier or purchase order |
| 🛒 Direct sale | Part sold directly to a customer |
| 🛠️ Used in service | Part assigned and consumed on a repair job |
| ↩️ Customer return | Part returned by a customer |
| ↩️ Supplier return | Part returned to a supplier |
| 🔁 Stock transfer | Part moved to another business, branch, or location |
| 🧾 Stock adjustment | Manager/admin correction of quantity |
| 💥 Damage or loss | Item damaged, lost, stolen, or written off |
| 🧰 Internal use | Item used by the workshop but not charged to a customer |

Each movement record should store:

- 📅 Date and time
- 🧾 Reference number
- 👤 User who performed the action
- 🔢 Quantity moved
- 💵 Unit cost and/or sale price
- 🏬 Source location
- 🏬 Destination location, where applicable
- 📝 Reason or notes
- 🚗 Related vehicle or repair job, where applicable
- 👤 Customer, where applicable

***

# 🛠️ Repair Job Integration

When a part is used for a repair job:

1. The staff member selects the part from inventory.
2. The system confirms that enough stock is available.
3. The quantity is deducted from available inventory.
4. The part is added to the customer’s repair invoice.
5. The system records the part’s cost and sale price.
6. The system calculates the profit made on that part.
7. The inventory movement is recorded as **🛠️ Used in service**.
8. The repair job, customer, vehicle, and technician/contractor are linked to the movement.

Example:

```text
Repair Job: Toyota Corolla Brake Service
Part Used: Front Brake Pads
Quantity Used: 1
Cost Price: $25.00
Selling Price: $40.00
Gross Profit: $15.00
Inventory Status: Deducted from Shelf A, Bin 04
```

***

# 📊 Reports and Insights

The system should provide reports for each individual inventory item, category, and domain.

## 📦 Stock Reports

- 📦 Current quantity in stock
- 🚨 Low-stock items
- ❌ Out-of-stock items
- 🐌 Slow-moving items
- 🔥 Fast-moving items
- 💥 Damaged, missing, or written-off items
- 🔁 Items transferred between locations
- 📍 Stock by shelf, bin, branch, or business

## 💰 Sales and Profit Reports

- 🛒 Quantity sold directly
- 🛠️ Quantity used in service jobs
- 💵 Sales revenue
- 💰 Cost of stock sold or used
- 📈 Gross profit
- 📊 Profit margin
- 🏆 Best-selling items
- 📉 Low-performing items
- 🧾 Profit by part category
- 🚗 Profit by vehicle make or model

## 📅 Date Filters

Reports must support:

- 📆 Today
- 📆 Yesterday
- 📅 Last 7 days
- 🗓️ Last 30 days
- 📅 This month
- 📅 Last month
- 🗓️ Custom date range

## 🖨️ Printing and Export

Reports should support:

- 🖨️ Compact A4 printing
- 📄 Print preview
- 📊 CSV export
- 📑 PDF export
- 📧 Optional email sharing

***

# 🔐 Permissions and Controls

## 👤 Staff Users

Staff users may:

- 🔍 Search and view parts
- 🛒 Sell parts
- 🛠️ Use parts on repair jobs
- ➕ Add stock through approved receiving workflows
- ↩️ Process customer returns, subject to permissions

## 👨‍🔧 Technicians and Contractors

Technicians or contractors may:

- 🔍 View available parts
- 🛠️ Request parts for a repair job
- 🧾 Record parts used on assigned jobs

Technicians or contractors should not be allowed to:

- 💵 Change cost prices
- 🏷️ Change selling prices
- 🧾 Adjust stock balances
- 🔁 Transfer stock
- 💥 Write off stock

## 🧑‍💼 Managers and Administrators

Managers and administrators may:

- ➕ Create, edit, deactivate, or merge inventory items
- 🧾 Adjust inventory quantities
- 🔁 Transfer parts between businesses or locations
- 💵 Set and update cost and selling prices
- 💥 Write off damaged or missing inventory
- 📊 View reports and profitability
- 🔐 Manage user permissions

***

# ✅ Duplicate Prevention

To reduce duplicate inventory items, the system should check for potential matches before allowing a new part to be created.

Check possible duplicates using:

- 🏷️ Item name
- 🧾 SKU or part number
- 🏭 Brand
- 🚗 Vehicle make and model
- 📅 Vehicle year range
- ⚙️ Engine specification
- 🧩 Subcategory

If a likely match exists, show a prompt:

```text
A similar inventory item already exists.

Existing item:
Bosch Oil Filter — Toyota Corolla 2010–2014
Current stock: 12

Would you like to:
[➕ Add stock to existing item]
[👁️ View existing item]
[🆕 Create new item anyway]
```

Only managers and administrators should be able to override the duplicate warning and create a potentially duplicate item.

***

# 📌 Implementation Notes

- Keep **categories** stable and reusable.
- Do not create a separate category for every vehicle brand, model, or year.
- Store vehicle compatibility as structured item fields.
- Require a unique SKU or part number where possible.
- Maintain a full movement history for every stock item.
- Do not allow inventory quantities to change without an auditable movement record.
- Show the correct emoji beside every domain, category, and subcategory in inventory navigation and item detail views.
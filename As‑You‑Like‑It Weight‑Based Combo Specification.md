## As‑You‑Like‑It Weight‑Based Combo Specification (V1.2)

### 1. Concept overview

The **As‑You‑Like‑It Combo** allows customers to build a meal in a single, pre‑marked container, sold by weight, with multiple food items inside. The POS must:

- Treat the combo as **one physical container**.
- Track each participating item by **weight deltas** as the container is filled.
- Support **size‑based base prices** (Small / Medium / Large).
- Support **size‑based price‑per‑kg** for each item, so larger sizes can have discounted per‑kg rates.[^1][^2]

Size cannot be changed once the cashier starts adding items.

***

### 2. Configuration (back office)

#### 2.1 Combo definition

For each As‑You‑Like‑It Combo:

- **Combo name**
    - Example: “Build‑Your‑Own Bowl”.
- **Allowed items list**
    - Predefined list of items that can be sold in this combo (e.g., Chicken, Beef, Veggies, Rice).
    - Each item is a separate “sell by weight” item with its own per‑kg prices per size.[^3][^1]
- **Sizes**
    - Sizes: Small, Medium, Large.
    - Each size has:
        - Fixed **base price**.
        - References to the **per‑kg price tier** for each allowed item (see 2.2).

Example:


| Combo name | Size | Base price |
| :-- | :-- | --: |
| Build‑Your‑Own Bowl | Small | 1.00 |
| Build‑Your‑Own Bowl | Medium | 1.50 |
| Build‑Your‑Own Bowl | Large | 2.00 |

#### 2.2 Item price tiers per combo size

Each item that can participate in a combo must have **three price‑per‑kg tiers**, one per size, so large combos can have a slight discount.[^2][^4]

For every item X (e.g., Chicken):

- `price_per_kg_small`
- `price_per_kg_medium`
- `price_per_kg_large`

Example:


| Item | Small (per kg) | Medium (per kg) | Large (per kg) |
| :-- | --: | --: | --: |
| Chicken | 10.00 | 9.50 | 9.00 |
| Beef | 12.00 | 11.50 | 11.00 |
| Veggies | 8.00 | 7.50 | 7.00 |

When a combo is started in a given size, **all items in that combo use that size’s per‑kg rate** for the entire transaction.

***

### 3. POS behavior

#### 3.1 Starting a combo

1. Cashier selects the As‑You‑Like‑It combo menu item.
2. System prompts for **size**: Small / Medium / Large.
3. Cashier selects a size.
4. System:
    - Creates a **parent combo line** in the cart with the chosen size and its **fixed base price**.
    - Locks the size; **size cannot be changed after this point**.
    - Prompts the cashier to place the **empty combo container** on the scale and tare it (auto or manual).[^5][^6]
    - Net weight starts at 0.000 kg.

#### 3.2 Adding items by weight (delta logic)

For each portion:

1. Cashier selects one of the **allowed items** for this combo (e.g., Chicken).
2. Customer adds that item into the container.
3. System waits for a **stable weight**.
4. System reads the **new total net weight**.
5. System calculates **delta weight**:

$$
\text{delta} = \text{new total net weight} - \text{previous total net weight}
$$

6. System assigns this delta weight to the selected item:
    - Looks up the **per‑kg price for this item and this combo size** (Small/Medium/Large).
    - Calculates line price:

$$
\text{line price} = \text{delta weight} \times \text{item price per kg for combo size}
$$

7. If this is the first time this item appears in the combo, create a new child line under the parent.
If the item already exists in this combo, **add the delta weight** to the existing line and update its total weight and price (no duplicate line).

The parent combo behaves as a container with child lines.

#### 3.3 Adding more of an existing item

If a customer later wants more of an item already in the combo:

1. Cashier selects that same item again under this combo.
2. Customer adds more to the container.
3. When the scale stabilizes:
    - Compute new delta:
new total net weight − previous total net weight.
    - Add this delta to the existing line’s weight.
    - Recompute that line’s price using the **same per‑kg rate for the current combo size**.

Size remains fixed; only weights and per‑kg charges for that size are used.

#### 3.4 Size lock

- Once the first item is added (i.e., after the first delta is captured), **size cannot be changed**.
- If the cashier attempts to change size after items have been added, the system should:
    - Show an error or warning: “Cannot change size after items are added to this combo.”
    - Keep the original size and all associated pricing.

***

### 4. Price and weight integrity rules

- **Combo size determines base price and per‑kg level** for all items in that combo.
    - All child items use the same size level (Small/Medium/Large) for pricing.
- **Size cannot be changed** once any delta weight has been recorded.
- At all times:
    - Sum of all child line weights = current **net container weight**.
    - Total combo price = **base price for chosen size** + sum of all child line prices.
- Optional rounding can be applied at the **final total** according to business rules.

***

### 5. Example: Medium vs Large with size‑based per‑kg pricing

Assume:

- Combo: Build‑Your‑Own Bowl
- Base prices:
    - Small: 1.00
    - Medium: 1.50
    - Large: 2.00
- Per‑kg prices:

| Item | Small | Medium | Large |
| :-- | --: | --: | --: |
| Chicken | 10.00 | 9.50 | 9.00 |
| Beef | 12.00 | 11.50 | 11.00 |
| Veggies | 8.00 | 7.50 | 7.00 |

Empty container is tared to 0.000 kg.

#### Medium combo

- Cashier chooses: Build‑Your‑Own Bowl – **Medium**.
- Base price = 1.50.
- Steps and weights:
    - Add Chicken: 0.000 → 0.200 kg
    - Add Beef: 0.200 → 0.350 kg
    - Add Veggies: 0.350 → 0.500 kg

Prices using **Medium** per‑kg:

- Chicken: 0.200 × 9.50 = 1.90
- Beef: 0.150 × 11.50 = 1.725 → 1.73 (depending on rounding)
- Veggies: 0.150 × 7.50 = 1.125 → 1.13

Variable subtotal ≈ 1.90 + 1.73 + 1.13 = 4.76
Final total ≈ 1.50 (base) + 4.76 = 6.26

#### Large combo (same weights)

- Cashier chooses: Build‑Your‑Own Bowl – **Large**.
- Base price = 2.00.
- Same weights, but **Large** per‑kg prices apply:
- Chicken: 0.200 × 9.00 = 1.80
- Beef: 0.150 × 11.00 = 1.65
- Veggies: 0.150 × 7.00 = 1.05

Variable subtotal = 1.80 + 1.65 + 1.05 = 4.50
Final total = 2.00 (base) + 4.50 = 6.50

Here, the Large combo has:

- Higher base price, but
- Slightly cheaper per‑kg, giving a “buy more, save per kg” effect.

***

If you were handing this spec to a dev, is there any other behavior you’d want locked down (for example, limits on how many different items can be in a single combo, or a max net weight per size)?

Restriction: 
The total weight cannot exceed 8KG
Maximum distinct items in a combo is 7.
 

<div align="center">⁂</div>

[^1]: https://learn.impos.com.au/hc/en-us/articles/115006243107-Items-Sold-by-Weight

[^2]: https://www.marktpos.com/blog/how-to-calculate-price-by-weight

[^3]: https://support.toasttab.com/en/article/Items-Priced-by-the-Pound-or-Unit

[^4]: https://help.swiftpos.com.au/bo-how-to-examples-combo-burger-meal-deal

[^5]: https://www.jackcooper.com/tare-weight-meaning-explained-formula-examples-uses/

[^6]: https://www.inscale-scales.co.uk/blogs/weighing-scales-blog/how-to-use-tare-on-your-weighing-scale


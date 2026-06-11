# Staff Quick Guide — Restaurant Salesperson

> **Role:** Restaurant Salesperson
> **Access:** Restaurant POS, customer management, receipt printing, salesperson EOD report
> **For full documentation:** See `docs/user-guide.md`

---

## Your Day at a Glance

```
Clock In → Open POS → Take Orders → Process Payment → Print Receipt → Submit EOD → Clock Out
```

---

## 1. Clock In

**Fastest method — scan card:**
1. Point your employee barcode card at the scanner at any time.
2. A clock-in popup appears (it will not interrupt someone else's sale).
3. Look briefly at the camera — your photo is taken automatically.
4. Confirm **Clock In**.

**Without a card:**
Go to **Employees → Clock-In**, find your name, and click **Clock In**.

> If you forget to clock in, tell your manager immediately with your actual arrival time so they can correct the record.

---

## 2. Open the Restaurant POS

In the left sidebar, click **Restaurant → POS**.

The screen has two panels:
- **Left** — the menu grid (products and categories)
- **Right** — the cart (items selected for the current order)

---

## 3. Taking an Order — Adding Items

**By category:** Click a category tab (e.g., *Mains*, *Beverages*) to filter the menu grid. Tap a product card to add it to the cart.

**By search:** Type the item name in the search box at the top. Click the result to add it.

**By barcode:** Scan the product barcode — it is added to the cart automatically.

**Adjusting quantity:** Use the **+** and **−** buttons on a cart item, or remove it with the bin icon.

### Today's Special

If a Today's Special is running, the item appears in the grid with an amber **⭐ TODAY'S SPECIAL** badge and a discounted price. Add it to the cart the same way as any other item — the special price applies automatically.

---

## 4. AYLI Combo (Weight-Based Combo)

AYLI combos have a green **⚖️ AYLI** badge and are sold by weight. When a customer orders one:

1. **Tap the combo card** (e.g., *Mama's Choice*). The AYLI modal opens full-screen.
2. **Place the empty container** on the scale — it auto-tares after 2 seconds. Or tap **Skip**.
3. **Select the size** — Small, Medium, or Large. Size cannot be changed after this step.
4. **Fill each ingredient:**
   - Tap the ingredient card (e.g., *Chicken*).
   - Have the customer add the food to the container.
   - Wait 2 seconds. The scale readout shows the weight being added and its cost.
   - Check the line at the bottom: **New total: $X.XX  ·  +$Y.YY to reach $Z.00** — this tells you how far you are from the next round-dollar amount.
   - Tap the green **✓ Capture** button to lock it in.
   - Repeat for other ingredients.

5. **Removing food:** If the customer wants less of something already captured, physically remove food from the container, tap that ingredient card again, wait for the red **✕ Remove** button to appear, then tap it.

6. **Choose your rounding option** (appears at the bottom once ingredients are added):

   | Button | What it means |
   |--------|--------------|
   | **↑ $X.XX (+$Y.YY)** (green) | Round the price up. The small difference is spread across ingredient prices. The customer pays the higher round number. |
   | **↓ $X.XX (−$Y.YY)** (orange) | Round the price down. The exact weighed price stays on the combo. A separate "Cash Rounding −$Y.YY" discount line is added to the cart — the customer gets a small courtesy discount. |
   | **Keep $X.XX** (grey) | No rounding. Use the exact calculated price. |

   > **Tip:** During filling, watch the rounding gap shown under the scale readout. If you are $0.04 away from a round number, a tiny bit more food can bring you to zero rounding needed.

7. After tapping a rounding option (or Keep), the combo is added to the cart automatically.

---

## 5. Link a Customer (Recommended)

Click **Select Customer** above the cart.
- Type their name or phone number and click their name in the results, or
- Scan their loyalty card barcode — they are selected instantly.

If they are new:
1. Type their name → click **+ Add New Customer**.
2. Enter name and phone number → **Save**.
3. A loyalty card button appears — print and hand it to them.

If they don't want to share details, leave it blank. The sale records as a Walk-In.

---

## 6. Process Payment

Click **Charge** or **Pay Now**.

| Method | How to use |
|--------|-----------|
| **Cash** | Select Cash. Enter the amount the customer hands you — change is calculated automatically. |
| **EcoCash** | Select EcoCash. Enter the amount sent. Record the EcoCash transaction code when prompted. |
| **Split** | Click both methods and enter the amount for each. |

### Cash Rounding (non-AYLI orders)

If the total doesn't land on a round number (e.g., $2.62) and you didn't handle rounding in the AYLI modal, an amber panel appears:
- **Apply Rounding** — round up to the next boundary (e.g., $3.00).
- **Round down** — give the customer the lower amount (e.g., $2.50).
- **Keep** — charge the exact amount.

Small gaps (e.g., $0.03) round automatically without you needing to tap anything.

Click **Complete Sale** when ready.

---

## 7. Print the Receipt

A receipt preview appears. Choose your print method from the dropdown:
- **QZ Tray Printer** — prints directly to the till printer (fastest).
- **Browser Print** — opens a print dialog.

Click **Print Receipt**. If the customer doesn't need a receipt, click **Skip**.

---

## 8. End-of-Day Report (if required)

If your manager has enabled salesperson EOD:

1. Go to **Sidebar → EOD → Submit Daily Report**.
2. Select today's date.
3. Enter your **Cash Total** — all cash you physically collected today.
4. The **EcoCash Total** fills in automatically from system records — verify it looks right.
5. Click **Submit Report**.

Submit before your manager's deadline (your manager will tell you the time). Once submitted you cannot edit it — if you made a mistake, ask your manager to correct it.

---

## 9. Clock Out

Scan your card at the scanner and confirm **Clock Out** on the popup.

---

## Quick Fixes

| Problem | What to do |
|---------|-----------|
| Item not showing in menu | Search by name. If it genuinely isn't there, ask a manager to add it. |
| AYLI scale not reading | Check the scale is connected (green dot in the scale panel). Try tapping **Tare** to reset. |
| Customer loyalty card not scanning | Try typing their name or phone number manually. |
| Wrong item in cart | Tap the bin icon to remove it. |
| Payment screen shows wrong total | Check the cart for duplicate items and remove as needed. |
| Can't find Submit Daily Report | Ask your manager — they may need to enable the feature in Business Settings. |

---

*Questions? Ask your manager or refer to the full guide at `docs/user-guide.md` — Section 2 (POS) and Section 54 (AYLI).*

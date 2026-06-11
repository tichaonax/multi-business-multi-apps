# Staff Quick Guide — Grocery Associate

> **Role:** Grocery Associate
> **Access:** Grocery POS (scan and desk mode), customer management, receipt printing, stock receiving, salesperson EOD report
> **For full documentation:** See `docs/user-guide.md`

---

## Your Day at a Glance

```
Clock In → Open POS → Serve Customers → Receive Stock (if delivery arrives) → Submit EOD → Clock Out
```

---

## 1. Clock In

**Fastest method — scan card:**
1. Point your employee barcode card at the scanner at any time.
2. A clock-in popup appears (it does not interrupt anyone else's work on screen).
3. Look briefly at the camera — your photo is taken automatically.
4. Confirm **Clock In**.

**Without a card:**
Go to **Employees → Clock-In**, find your name, and click **Clock In**.

> Forgot to clock in? Tell your manager right away with your actual arrival time.

---

## 2. Open the Grocery POS

In the left sidebar, click **Grocery → POS**.

The POS has two modes — you switch between them using the **🖥️ Desk Mode** button in the top bar.

| Mode | How items are added | When to use |
|------|---------------------|-------------|
| **Scan Mode** (default) | Scan barcode or type PLU code | When you have a physical barcode scanner |
| **Desk Mode** | Tap product cards on screen | Counter service, or when the scanner is not available |

---

## 3. Serving a Customer — Adding Items

### Scan Mode

1. Point the scanner at the product barcode.
2. The item is added to the cart automatically.
3. If a barcode is not found, you will be prompted. Ask a manager — the item may need to be stocked first.

### Desk Mode

1. Click a category tab on the left to filter products.
2. Tap a product card to add one unit. A **blue badge** appears on the card showing how many are in the cart.
3. Tap again to add more units.

**Stock badges in Desk Mode** — each card shows a count in the corner:
- Grey "42 left" — normal stock
- Orange "3 left" — low stock, flag to manager
- Red "Out of stock" — cannot sell; skip or substitute

### Sell by Weight

For items sold loose (e.g., rice, flour):
1. Make sure the **⚖️ Scale** panel is visible (click the scale button in the top bar if not).
2. Tap the product card — a **Weigh Item** modal opens.
3. Place the item on the scale. When the weight stabilises, tap **Add to Cart**.

---

## 4. Adjusting the Cart

- **Change quantity:** Use **+** or **−** buttons on the item in the cart.
- **Remove an item:** Click the bin icon.
- **Apply a discount:** Click the item price and choose a percentage or fixed amount.

---

## 5. Link a Customer (Recommended)

Click **Select Customer** above the cart.
- Type their name or phone number and select from the results, or
- Scan their loyalty card barcode — they are selected instantly.

If they are new:
1. Type their name → **+ Add New Customer**.
2. Enter name and phone number → **Save**.
3. Print their loyalty card and hand it to them before they leave.

Walk-ins with no customer? Leave it blank and proceed — the sale is still complete.

---

## 6. Process Payment

Click **Charge** or **Pay Now**.

| Method | How to use |
|--------|-----------|
| **Cash** | Select Cash. Enter the amount given — change is calculated automatically. |
| **EcoCash** | Select EcoCash. Enter the amount sent and record the transaction code when prompted. |
| **Split** | Click both methods and enter the amount for each part. |

### Cash Rounding

If the total doesn't land on a round number (e.g., $1.74 with a $0.50 step), an amber panel appears:
- **Apply Rounding** — round up to the next boundary (e.g., $2.00).
- **Round down** — customer pays the lower round amount (e.g., $1.50).
- **Keep** — charge the exact total.

Very small gaps (e.g., $0.03) apply automatically.

Click **Complete Sale**.

---

## 7. Print the Receipt

A receipt preview appears. Choose:
- **QZ Tray Printer** — prints directly to the till printer (fastest).
- **Browser Print** — opens a print dialog.

Click **Print Receipt**. If the customer doesn't need one, click **Skip**.

---

## 8. Receiving a Delivery (Bulk Stock)

When stock arrives and you need to update inventory without closing the POS:

1. Click **📦 Bulk Stock** in the top bar of the POS.
2. Scan or search for the product.
3. Enter the quantity received and the cost per unit.
4. Click **Save**.

Stock levels update immediately. Labels can be printed from **Grocery → Inventory → Print Labels**.

> You need the **Can Receive Stock** permission to do this. If you don't see the Bulk Stock button, ask your manager.

---

## 9. End-of-Day Report (if required)

If your manager has enabled salesperson EOD:

1. Go to **Sidebar → EOD → Submit Daily Report**.
2. Select today's date.
3. Enter your **Cash Total** — all cash you physically collected today.
4. The **EcoCash Total** fills in automatically — check it looks correct.
5. Click **Submit Report**.

Submit before the deadline your manager gives you. If you made a mistake after submitting, ask your manager to correct it with an override.

---

## 10. Clock Out

Scan your card at the scanner and confirm **Clock Out** on the popup.

---

## Quick Fixes

| Problem | What to do |
|---------|-----------|
| Barcode not found | Try typing the product name in the search box. If still not found, tell a manager — the item needs to be stocked. |
| Product shows "Out of stock" | You cannot sell it. Advise the customer and flag it to your manager for restocking. |
| Wrong item in cart | Click the bin icon to remove it. |
| Scale not reading | Check the green dot is showing in the scale panel (connected). Click **Tare** to reset the scale, then try again. |
| Can't find Submit Daily Report | Ask your manager to enable Salesperson EOD in Business Settings. |
| Customer loyalty card not scanning | Type their name or phone number manually. |

---

*Questions? Ask your manager or refer to the full guide at `docs/user-guide.md` — Section 2 (POS), Section 21 (Grocery Desk Mode), and Section 30 (Salesperson EOD).*

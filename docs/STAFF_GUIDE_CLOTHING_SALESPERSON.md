# Staff Quick Guide — Clothing Salesperson

> **Role:** Clothing Salesperson
> **Access:** Clothing POS, customer management, layby creation, receipt printing, salesperson EOD report
> **For full documentation:** See `docs/user-guide.md`

---

## Your Day at a Glance

```
Clock In → Open POS → Serve Customers → Process Payment → Print Receipt → Submit EOD → Clock Out
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

## 2. Open the Clothing POS

In the left sidebar, click **Clothing → POS**.

The POS has a product browse panel with three tabs:

| Tab | What it contains |
|-----|-----------------|
| **Bales** | Second-hand clothing bales — each bale contains individual items sold at a set unit price |
| **Quick Add** | Regular clothing products (new items, accessories, footwear) |
| **R710 WiFi** | WiFi access token packages (if your store sells these) |

---

## 3. Reading the Sales Activity Indicators

Each product card and bale shows live sales data so you always know what is selling:

- **Green badge "X sold"** — units sold today from this product or bale. *(Only visible if your manager gave you the View POS Sold Count permission.)*
- **Progress bar** below the item:
  - Green "Good" — selling as well or better than yesterday
  - Amber "Fair" — slightly behind yesterday
  - Red "Low" — well behind yesterday

Use these as a quick guide. If something is moving fast, make sure stock is displayed prominently.

---

## 4. Serving a Customer — Adding Items

### Bales Tab

1. Click the **Bales** tab.
2. Find the bale the customer is buying from (e.g., *Ladies Tops HXI-042 — 14 items left*).
3. Click **Add** on that bale card. One item is added to the cart at the bale's unit price.
4. Click **Add** again if buying multiple pieces from the same bale.

### Quick Add Tab (Regular Products)

1. Click the **Quick Add** tab.
2. Find the product (e.g., *Men's Jeans*). Each product shows its variants (size, colour) as separate rows.
3. Click **Add** on the specific variant the customer wants.
4. Repeat for each item.

### Scanning a Barcode

At any time, scan a product barcode — the item is found and added to the cart automatically, regardless of which tab is active.

### Adjusting the Cart

- **Change quantity:** Use **+** or **−** on the cart item.
- **Remove an item:** Click the bin icon.
- **Apply a discount:** Click the item price and choose a percentage or fixed-amount discount.

---

## 5. Link a Customer (Recommended)

Click **Select Customer** above the cart.
- Type their name or phone number and select from the results, or
- Scan their loyalty card barcode — they are selected instantly.

If they are new:
1. Type their name → **+ Add New Customer**.
2. Enter name and phone number → **Save**.
3. Print their loyalty card and hand it to them.

A customer must be linked to create a layby (see below).

---

## 6. Layby (Customer Pays in Instalments)

If a customer cannot pay in full today and wants to put items on layby:

1. **Select the customer first** — a customer must be linked to create a layby.
2. Add items to the cart as normal.
3. Go to **Laybys → New Layby** (or click the Layby button in the payment screen if available).
4. Set the deposit amount and any agreed instalment schedule.
5. Process the deposit payment.
6. Print the layby receipt and give the customer their copy. The goods are held until fully paid.

**Recording a future layby payment:**
1. Go to **Laybys**, search for the customer's layby.
2. Click **Record Payment**, enter the amount, and confirm.

> You need the **Can Create Layby** permission. If you don't see the option, ask your manager.

---

## 7. Process Payment

Click **Charge** or **Pay Now**.

| Method | How to use |
|--------|-----------|
| **Cash** | Select Cash. Enter the amount given — change is calculated automatically. |
| **EcoCash** | Select EcoCash. Enter the amount sent and record the transaction code when prompted. |
| **Split** | Click both methods and enter the amount for each part. |

### Cash Rounding

If the total doesn't land on a round number (e.g., $4.73 with a $0.50 step), an amber panel appears:
- **Apply Rounding** — round up to the next boundary (e.g., $5.00).
- **Round down** — customer pays the lower amount (e.g., $4.50).
- **Keep** — charge the exact total.

Very small gaps (e.g., $0.03) round automatically.

Click **Complete Sale**.

---

## 8. Print the Receipt

A receipt preview appears. Choose:
- **QZ Tray Printer** — prints directly to the till printer (fastest).
- **Browser Print** — opens a print dialog.

Click **Print Receipt**. If the customer doesn't need one, click **Skip**.

---

## 9. WiFi Tokens (R710 WiFi Tab)

If a customer wants to buy WiFi access:

1. Click the **R710 WiFi** tab.
2. Select the package (e.g., *1 Hour*, *24 Hours*, *Weekly*).
3. Check the **available tokens** count on the card — if it shows fewer than 5, click **Request More** to alert your manager.
4. Click **Add** to add the token to the cart.
5. Process payment as normal. The token username and password print on the receipt automatically.

---

## 10. End-of-Day Report (if required)

If your manager has enabled salesperson EOD:

1. Go to **Sidebar → EOD → Submit Daily Report**.
2. Select today's date.
3. Enter your **Cash Total** — all cash you physically collected today.
4. The **EcoCash Total** fills in automatically — check it looks correct.
5. Click **Submit Report**.

Submit before your manager's deadline. If you made a mistake after submitting, ask your manager to correct it.

---

## 11. Clock Out

Scan your card at the scanner and confirm **Clock Out** on the popup.

---

## Quick Fixes

| Problem | What to do |
|---------|-----------|
| Bale not showing in list | Check the **Bales** tab. If it is not there, the bale may be sold out or disabled — ask a manager. |
| Item shows "Out" in red | That variant is out of stock. Offer an alternative size or colour if available. |
| Barcode not found | Type the product name in the search box. If still missing, tell a manager. |
| Customer loyalty card not scanning | Type their name or phone number manually. |
| Layby option not visible | You need the **Can Create Layby** permission. Ask your manager to grant it. |
| WiFi token count is low | Click **Request More** on the package card — this notifies your manager to generate more tokens. |
| Can't find Submit Daily Report | Ask your manager to enable Salesperson EOD in Business Settings. |
| Wrong item in cart | Click the bin icon to remove it. |

---

*Questions? Ask your manager or refer to the full guide at `docs/user-guide.md` — Section 2 (POS), Section 45 (Clothing Live Sales Activity), Section 9 (Laybys), and Section 30 (Salesperson EOD).*

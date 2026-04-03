Objective
Our goal is to streamline the process of adding inventory to the system and simplify stock management during item registration, delivery intake, and point-of-sale (POS) operations. The following scenarios outline the intended workflows.
1. Registering a Bale
When a user registers a new bale, they should be able to access all necessary product information and use either an existing or a new template to complete details such as price, cost, quantity, and the number of barcodes to print. With a single click, the system should automatically generate and print barcodes while adding the corresponding inventory to stock.
2. Receiving New Deliveries Without Barcodes
For new products that arrive without barcodes (for example, a delivery of 30 identical pairs of jeans), users should have the ability to create a new barcode—either from an existing template or by building one from scratch. Once all required fields are filled, a single action should add the items to the inventory and print the appropriate labels.
3. Adding to Existing Inventory or POS via Global Scan
The system should support a global barcode scan capable of identifying product matches whether the scan occurs within a POS session or a general inventory management context.


If the scan is performed within a POS for a business and a matching product is found, the system should automatically add that item to the cart for sale.


If no match is found, the system should trigger a workflow that allows the user to create or link the scanned barcode to a product record. In this workflow, the user can add the product to inventory and simultaneously add it to the cart if a sale is in progress.


This logic covers cases where the scanned barcode represents items that are not yet stocked. For example, if a single barcode represents 30 units of a new product and a customer wants to purchase one before stock entry, scanning the barcode should automatically create the stock entry (for 30 units), then decrement it by one to complete the sale transaction.


4. Printing Options
Across all scenarios, the system should support flexible label printing options, including printing to receipt printers, standard printers, or exporting the labels to PDF format.
Please use the above as the basis for an expanded and detailed requirements document describing the user experience, workflows, and backend logic needed to support these scenarios. After that create a detailed project plan with tasks so that I can approve before we proceed.
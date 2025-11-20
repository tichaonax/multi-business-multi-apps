const testPayload = {
  barcode: "TEST" + Date.now(),
  businessId: "e5bc7e64-a140-4990-870c-59398594cbb2",
  inventoryType: "clothing",
  productData: {
    name: "Test Scanned Product",
    description: "Testing inventory add API",
    price: 29.99
  }
};

console.log("Testing inventory-add API...\n");
console.log("Payload:", JSON.stringify(testPayload, null, 2));

fetch("http://localhost:8080/api/global/inventory-add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(testPayload)
})
  .then(res => res.json())
  .then(data => {
    console.log("\n✅ Response:", JSON.stringify(data, null, 2));
    if (data.success) {
      console.log("\n🎉 SUCCESS! Product created:");
      console.log("  Product ID:", data.productId);
      console.log("  Barcode ID:", data.barcodeId);
      console.log("  Variant ID:", data.variantId);
      console.log("  Redirect URL:", data.redirectUrl);
    } else {
      console.log("\n❌ FAILED:", data.error);
    }
  })
  .catch(err => {
    console.error("\n❌ ERROR:", err.message);
  });

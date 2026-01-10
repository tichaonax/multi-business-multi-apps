/**
 * Test Customer Display
 *
 * Opens a customer display and sends test cart messages via BroadcastChannel
 * to verify the synchronization and UI work correctly.
 *
 * Usage:
 *   node scripts/test-customer-display.js
 *
 * Then open your browser console on the POS page and run:
 *   testDisplay.addItem()
 *   testDisplay.clearCart()
 */

console.log('🧪 Customer Display Test Utility\n')
console.log('This script helps you test the customer display feature.\n')
console.log('Instructions:')
console.log('1. Start the dev server: npm run dev')
console.log('2. Open http://localhost:8080/customer-display?businessId=test-biz&terminalId=terminal-1')
console.log('3. Open your browser console and paste the code below:\n')

console.log('─'.repeat(80))
console.log(`
// Copy and paste this code into your browser console:

const testDisplay = {
  businessId: 'test-biz',
  terminalId: 'terminal-1',
  channel: null,

  init() {
    this.channel = new BroadcastChannel(\`customer-display-\${this.businessId}-\${this.terminalId}\`)
    console.log('✅ Test channel initialized')
    console.log('Available commands:')
    console.log('  testDisplay.addItem() - Add a sample item to cart')
    console.log('  testDisplay.addMultiple() - Add 3 items to cart')
    console.log('  testDisplay.removeItem() - Remove first item')
    console.log('  testDisplay.clearCart() - Clear entire cart')
    console.log('  testDisplay.fullCart() - Send full cart state with 5 items')
  },

  send(message) {
    this.channel.postMessage(message)
    console.log('📤 Sent:', message.type)
  },

  addItem() {
    const item = {
      id: \`item-\${Date.now()}\`,
      name: 'Sample Product',
      quantity: 1,
      price: 19.99,
      variant: 'Medium / Blue'
    }

    this.send({
      type: 'ADD_ITEM',
      payload: {
        item,
        subtotal: 19.99,
        tax: 1.60,
        total: 21.59
      },
      timestamp: Date.now(),
      businessId: this.businessId,
      terminalId: this.terminalId
    })
  },

  addMultiple() {
    const items = [
      { id: 'item-1', name: 'Wireless Mouse', quantity: 2, price: 24.99 },
      { id: 'item-2', name: 'USB Cable', quantity: 3, price: 9.99 },
      { id: 'item-3', name: 'Keyboard', quantity: 1, price: 49.99 }
    ]

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = subtotal * 0.08
    const total = subtotal + tax

    items.forEach(item => {
      this.send({
        type: 'ADD_ITEM',
        payload: {
          item,
          subtotal,
          tax,
          total
        },
        timestamp: Date.now(),
        businessId: this.businessId,
        terminalId: this.terminalId
      })
    })
  },

  removeItem() {
    this.send({
      type: 'REMOVE_ITEM',
      payload: {
        itemId: 'item-1',
        subtotal: 29.97,
        tax: 2.40,
        total: 32.37
      },
      timestamp: Date.now(),
      businessId: this.businessId,
      terminalId: this.terminalId
    })
  },

  clearCart() {
    this.send({
      type: 'CLEAR_CART',
      payload: {
        subtotal: 0,
        tax: 0,
        total: 0
      },
      timestamp: Date.now(),
      businessId: this.businessId,
      terminalId: this.terminalId
    })
  },

  fullCart() {
    const items = [
      { id: 'item-1', name: 'Gaming Laptop', quantity: 1, price: 1299.99, imageUrl: null },
      { id: 'item-2', name: 'Wireless Headset', quantity: 2, price: 89.99, variant: 'Black' },
      { id: 'item-3', name: 'USB-C Hub', quantity: 1, price: 49.99 },
      { id: 'item-4', name: 'Mouse Pad', quantity: 3, price: 14.99, variant: 'Large' },
      { id: 'item-5', name: 'HDMI Cable 6ft', quantity: 2, price: 12.99 }
    ]

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = subtotal * 0.08
    const total = subtotal + tax

    this.send({
      type: 'CART_STATE',
      payload: {
        items,
        subtotal,
        tax,
        total
      },
      timestamp: Date.now(),
      businessId: this.businessId,
      terminalId: this.terminalId
    })
  }
}

// Auto-initialize
testDisplay.init()
`)
console.log('─'.repeat(80))
console.log('\n✅ Ready to test! Follow the instructions above.\n')

/**
 * Debug script to add to both POS and Customer Display pages
 * This will help us see what channels are being created and what messages are being sent/received
 */

console.log(`
========================================
CUSTOMER DISPLAY DEBUG SCRIPT
========================================

Add this to your browser console on BOTH windows:

1. On POS page:
window.debugCustomerDisplay = {
  businessId: localStorage.getItem('selected-business-id'),
  terminalId: localStorage.getItem('pos-terminal-id'),
  getCurrentChannel: () => {
    // This will be set by the sync manager
    return window._customerDisplayChannel?.name || 'NOT CONNECTED'
  }
}

console.log('POS Debug Info:', window.debugCustomerDisplay)

2. On Customer Display page:
const params = new URLSearchParams(window.location.search)
window.debugCustomerDisplay = {
  businessId: params.get('businessId'),
  terminalId: params.get('terminalId'),
  expectedChannel: 'customer-display-' + params.get('businessId') + '-' + params.get('terminalId'),
  getCurrentChannel: () => {
    return window._customerDisplayChannel?.name || 'NOT CONNECTED'
  }
}

console.log('Customer Display Debug Info:', window.debugCustomerDisplay)

Then compare:
- Are the businessId values the same?
- Are the terminalId values the same?
- Are the channel names the same?

`);

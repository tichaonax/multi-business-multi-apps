# Customer Display Debugging Guide

## Changes Made
I've added comprehensive debugging logs to help us identify the issue. The code now logs every step of the message flow.

## What to Do Next

### 1. Restart Your Dev Server
```bash
npm run dev
```

### 2. Open BOTH Windows Side by Side
- **Main Window**: Restaurant POS (`http://localhost:8080/restaurant/pos`)
- **Secondary Window**: Customer Display (should auto-open, or manually open the URL shown)

### 3. Check Console Logs on BOTH Windows

#### On the **POS Window**, look for:
```
🔍 [DEBUG] Channel created: {
  channelName: "customer-display-...",
  businessId: "...",
  terminalId: "..."
}
```
**Copy the channelName, businessId, and terminalId values**

#### On the **Customer Display Window**, look for:
```
🔍 [DEBUG] Channel created: {
  channelName: "customer-display-...",
  businessId: "...",
  terminalId: "..."
}
```
**Compare these values with the POS window**

### 4. Add an Item to Cart

On the POS, add any item to the cart. You should see:

#### On POS Console:
```
[POS] Broadcasting cart state, items: 1
[POS] Sending CART_STATE: {...}
📤 [DEBUG] Sending message: {
  type: "CART_STATE",
  businessId: "...",
  terminalId: "...",
  channelName: "customer-display-..."
}
✅ [DEBUG] Message posted to BroadcastChannel
```

#### On Customer Display Console:
```
🔍 [DEBUG] Message received on channel: {
  messageType: "CART_STATE",
  messageBusinessId: "...",
  messageTerminalId: "...",
  expectedBusinessId: "...",
  expectedTerminalId: "...",
  willAccept: true/false
}
```

## What Each Log Means

### ✅ If you see these logs on BOTH windows:
- `🔍 [DEBUG] Channel created` - Channels are being created
- `📤 [DEBUG] Sending message` - POS is sending messages
- `🔍 [DEBUG] Message received` - Customer display is receiving messages
- `willAccept: true` - Message will be accepted
- `✅ [DEBUG] Message accepted` - Message was accepted
- `📨 [CustomerDisplay] Received message` - Message reached the React component

**This means everything is working!**

### ❌ If you see issues:

1. **Different channelName values** = They're on different channels
   - Check that businessId and terminalId match

2. **No "Message received" on Customer Display** = Messages not reaching the channel
   - Different browser tabs?
   - Check if both are on localhost

3. **`willAccept: false`** = Message is being filtered out
   - businessId or terminalId mismatch
   - Copy the exact values from both consoles and send them to me

4. **Message received but not showing on UI** = React state issue
   - Check if `📨 [CustomerDisplay] Received message` appears
   - If yes, it's a UI rendering issue
   - If no, the callback isn't being called

## Callback Chain Debug Logs

After adding an item to cart, you should see this sequence on the **Customer Display console**:

1. `🔍 [DEBUG] Message received on channel` - BroadcastChannel got the message
2. `willAccept: true` - Message passed validation
3. `✅ [DEBUG] Message accepted and forwarding to onMessage callback` - About to call callback
4. `🔔 [SyncManager] onMessage callback invoked in SyncManager` - Reached SyncManager
5. `🔔 [SyncManager] Forwarded to this.options.onMessage` - SyncManager forwarded it
6. `🔔 [useCustomerDisplaySync] onMessage callback invoked` - Reached the hook
7. `🔔 [useCustomerDisplaySync] Calling onMessageRef.current` - About to call React callback
8. `🔔 [useCustomerDisplaySync] Called onMessageRef.current` - Called React callback
9. `📨 [CustomerDisplay] Received message` - Reached React component

**If any of these logs are missing, that's where the callback chain breaks!**

Also check:
- `isMounted` should be `true`
- `hasOnMessageRef` should be `true`

## Send Me These Values

On the **Customer Display console**, after adding an item to cart, copy ALL the logs you see and tell me:
1. Which of the 9 callback chain logs appear?
2. Where does the chain stop?
3. What are the values of `isMounted` and `hasOnMessageRef`?

/**
 * Simple USB Device Test
 * Tests USB device detection without Express server
 */

const USB = require('@node-escpos/usb-adapter');

console.log('🔍 Testing USB device detection...');

try {
  // Try specific Epson device first
  console.log('Trying Epson TM-T20III (0x04b8, 0x0202)...');
  const epsonDevice = new USB(0x04b8, 0x0202);
  console.log('✅ Epson TM-T20III device created successfully');

  // Try to open it
  epsonDevice.open((err) => {
    if (err) {
      console.log('❌ Failed to open Epson device:', err.message);

      // Try auto-detection
      console.log('Trying auto-detection...');
      try {
        const autoDevice = new USB();
        console.log('✅ Auto-detected device created');

        autoDevice.open((autoErr) => {
          if (autoErr) {
            console.log('❌ Failed to open auto-detected device:', autoErr.message);
          } else {
            console.log('✅ Auto-detected device opened successfully');
            autoDevice.close();
          }
        });
      } catch (autoError) {
        console.log('❌ Auto-detection failed:', autoError.message);
      }
    } else {
      console.log('✅ Epson device opened successfully');
      epsonDevice.close();
    }
  });

} catch (error) {
  console.log('❌ Device creation failed:', error.message);

  // Try auto-detection as fallback
  try {
    console.log('Trying auto-detection as fallback...');
    const autoDevice = new USB();
    console.log('✅ Auto-detected device created');

    autoDevice.open((autoErr) => {
      if (autoErr) {
        console.log('❌ Failed to open auto-detected device:', autoErr.message);
      } else {
        console.log('✅ Auto-detected device opened successfully');
        autoDevice.close();
      }
    });
  } catch (autoError) {
    console.log('❌ All USB detection methods failed:', autoError.message);
  }
}
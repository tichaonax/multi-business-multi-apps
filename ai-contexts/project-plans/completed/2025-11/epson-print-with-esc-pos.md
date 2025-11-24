To set up a complete direct ESC/POS print service for an Epson TM-T20III USB thermal printer on Windows using Next.js and Node.js, the recommended approach is to run a Node.js background service on the machine attached to the printer. This service exposes an HTTP API for receiving job requests from other servers. The service then uses a Node.js ESC/POS USB library to send raw commands directly to the printer without invoking browser dialogs or standard Windows print prompts.

Below is the code and structure for such a solution, with additional notes for communicating from other servers.

Requirements
Node.js and npm/yarn installed on the Windows printer host server.

Epson TM-T20III printer driver installed on Windows.

Install the following Node.js libraries:

@node-escpos/core (ESC/POS API)

@node-escpos/usb-adapter (USB communication)

express (HTTP server for print jobs)

Install libraries in your service folder:
npm install express @node-escpos/core @node-escpos/usb-adapter

const express = require('express');
const { Printer } = require('@node-escpos/core');
const USB = require('@node-escpos/usb-adapter');
const app = express();

app.use(express.json());

// Utility: Returns first found USB device (can be customized with VendorID/ProductID if needed)
function getUSBDevice() {
  // If you know your model's USB IDs use e.g. new USB(0x04b8, 0x0202) per [web:11]
  return new USB();
}

app.post('/print', async (req, res) => {
  const { escposData } = req.body;
  if (!escposData) {
    return res.status(400).json({ error: 'escposData is required.' });
  }

  try {
    const device = getUSBDevice();
    // Open USB device
    device.open(async (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to open USB printer: ' + err.message });
      }
      const printer = new Printer(device);

      // Send raw ESC/POS buffer
      printer.raw(Buffer.from(escposData, 'binary'));
      printer.cut(); // Optionally cut paper after print

      printer.close(); // Close device
      res.json({ status: 'Printed successfully.' });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listen on any port you like (e.g., 3001)
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`ESC/POS print service listening on port ${PORT}`);
});

Remote Submission (from Next.js or other servers)
Your Next.js backend or any service can submit a print job using a POST request with the ESC/POS command data:

// Example: Submit print job from remote server (Next.js API)
import axios from 'axios';

export default async function handler(req, res) {
  // ESC/POS data—this could be built programmatically as needed
  const escposData = '\x1B@Hello world!\n\x1Bc'; // ESC @ (init), print, cut

  try {
    const response = await axios.post('http://<PRINTER_HOST_IP>:3001/print', { escposData });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

Always format ESC/POS commands correctly (e.g., \x1B for ESC, not just "ESC"). Use binary or hex properly.

Additional Notes
You may need to adjust device selection if multiple printers are connected or if the TM-T20III does not auto-detect. Use its USB VendorID/ProductID (see Windows Device Manager).

This solution keeps all print logic off the browser; jobs are submitted over HTTP to the service running on the Windows host.

For security, restrict access to /print endpoint or require authentication if it will be exposed across networks.

This architecture enables direct, reliable ESC/POS printing from any backend server to a Windows host server connected to your Epson printer, solving both the browser dialog and job handling issues for USB devices.​

Let me know if you need code to build specific ESC/POS receipts programmatically or want to add job queueing, logging, or error notifications for this service.

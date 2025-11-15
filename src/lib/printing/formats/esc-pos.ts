/**
 * ESC/POS Format Converter
 * Converts receipt text to ESC/POS commands for thermal printers
 * ESC/POS is the standard command set for thermal receipt printers
 */

import type { ESCPOSOptions, ESCPOSCommand } from '@/types/printing';

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CR = '\x0D';

/**
 * Convert plain text receipt to ESC/POS commands
 */
export function convertToESCPOS(text: string, options: ESCPOSOptions = {}): Buffer {
  const { encoding = 'utf8', width = 48 } = options;

  let commands: Buffer[] = [];

  // Initialize printer
  commands.push(Buffer.from(ESC + '@')); // Initialize/reset printer

  // Set character set (optional)
  if (encoding === 'utf8') {
    commands.push(Buffer.from(ESC + 't' + '\x10')); // UTF-8 character set
  }

  // Process text line by line
  const lines = text.split('\n');

  for (const line of lines) {
    // Check for special formatting markers
    if (line.includes('***') || line.includes('TOTAL')) {
      // Bold text
      commands.push(Buffer.from(ESC + 'E' + '\x01')); // Bold ON
      commands.push(Buffer.from(line + LF, encoding));
      commands.push(Buffer.from(ESC + 'E' + '\x00')); // Bold OFF
    } else if (line.match(/^\s*[=\-_]+\s*$/)) {
      // Separator line - no special formatting needed
      commands.push(Buffer.from(line + LF, encoding));
    } else {
      // Regular text
      commands.push(Buffer.from(line + LF, encoding));
    }
  }

  // Feed paper and cut
  commands.push(Buffer.from(LF + LF + LF)); // Feed 3 lines
  commands.push(Buffer.from(GS + 'V' + '\x41' + '\x03')); // Partial cut

  // Combine all commands into single buffer
  return Buffer.concat(commands);
}

/**
 * Execute ESC/POS commands
 */
export function executeESCPOSCommands(commands: ESCPOSCommand[]): Buffer {
  let buffers: Buffer[] = [];

  commands.forEach(cmd => {
    switch (cmd.type) {
      case 'text':
        buffers.push(Buffer.from(cmd.data + LF, 'utf8'));
        break;

      case 'bold':
        const boldState = cmd.data ? '\x01' : '\x00';
        buffers.push(Buffer.from(ESC + 'E' + boldState));
        break;

      case 'align':
        let alignCode = '\x00'; // Left
        if (cmd.data === 'center') alignCode = '\x01';
        if (cmd.data === 'right') alignCode = '\x02';
        buffers.push(Buffer.from(ESC + 'a' + alignCode));
        break;

      case 'feed':
        const feedLines = cmd.data || 1;
        buffers.push(Buffer.from(LF.repeat(feedLines)));
        break;

      case 'cut':
        buffers.push(Buffer.from(GS + 'V' + '\x41' + '\x03')); // Partial cut
        break;

      case 'barcode':
        buffers.push(generateBarcodeCommand(cmd.data));
        break;

      case 'qr':
        buffers.push(generateQRCommand(cmd.data));
        break;
    }
  });

  return Buffer.concat(buffers);
}

/**
 * Generate barcode command
 */
function generateBarcodeCommand(data: { text: string; format?: string }): Buffer {
  const { text, format = 'code128' } = data;

  let barcodeType = '\x49'; // CODE128 default

  switch (format.toLowerCase()) {
    case 'code39':
      barcodeType = '\x04';
      break;
    case 'ean13':
      barcodeType = '\x02';
      break;
    case 'upca':
      barcodeType = '\x00';
      break;
  }

  // GS k m n d1...dn (barcode command)
  const cmd = GS + 'k' + barcodeType;
  const length = String.fromCharCode(text.length);

  return Buffer.from(cmd + length + text);
}

/**
 * Generate QR code command
 */
function generateQRCommand(data: string): Buffer {
  // ESC/POS QR code commands (Model 2)
  // This is a simplified version - full implementation would include
  // size, error correction level, etc.

  const commands = [
    // Select the model (Model 2)
    Buffer.from(GS + '(k\x04\x00\x31\x41\x32\x00'),

    // Set size (Module size)
    Buffer.from(GS + '(k\x03\x00\x31\x43\x03'),

    // Set error correction level (Level M)
    Buffer.from(GS + '(k\x03\x00\x31\x45\x31'),

    // Store the data
    Buffer.from(GS + `(k${String.fromCharCode(data.length + 3, 0)}\x31\x50\x30${data}`),

    // Print the QR code
    Buffer.from(GS + '(k\x03\x00\x31\x51\x30'),
  ];

  return Buffer.concat(commands);
}

/**
 * Set text size
 */
export function setTextSize(width: number, height: number): Buffer {
  // GS ! n (character size command)
  // n = (width-1) << 4 | (height-1)
  const sizeValue = ((width - 1) << 4) | (height - 1);
  return Buffer.from(GS + '!' + String.fromCharCode(sizeValue));
}

/**
 * Set alignment
 */
export function setAlignment(align: 'left' | 'center' | 'right'): Buffer {
  let code = '\x00';
  if (align === 'center') code = '\x01';
  if (align === 'right') code = '\x02';

  return Buffer.from(ESC + 'a' + code);
}

/**
 * Set bold
 */
export function setBold(enabled: boolean): Buffer {
  const state = enabled ? '\x01' : '\x00';
  return Buffer.from(ESC + 'E' + state);
}

/**
 * Feed paper
 */
export function feedPaper(lines: number = 1): Buffer {
  return Buffer.from(LF.repeat(lines));
}

/**
 * Cut paper (partial)
 */
export function cutPaper(): Buffer {
  return Buffer.from(GS + 'V' + '\x41' + '\x03');
}

/**
 * Full cut paper
 */
export function cutPaperFull(): Buffer {
  return Buffer.from(GS + 'V' + '\x00');
}

/**
 * Initialize/reset printer
 */
export function initializePrinter(): Buffer {
  return Buffer.from(ESC + '@');
}

/**
 * Open cash drawer (if connected)
 */
export function openCashDrawer(): Buffer {
  // ESC p m t1 t2 (kick drawer command)
  return Buffer.from(ESC + 'p\x00\x32\x32');
}

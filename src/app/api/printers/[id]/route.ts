/**
 * Individual Printer API Route
 * PUT: Update a specific printer
 * DELETE: Delete a specific printer
 */

import { NextRequest, NextResponse } from 'next/server';


import {
  updatePrinter,
  deletePrinter,
  type PrinterFormData,
} from '@/lib/printing/printer-service';
import { canManageNetworkPrinters } from '@/lib/permission-utils';
import type { PrinterType } from '@/types/printing';
import { getServerUser } from '@/lib/get-server-user'

/**
 * PUT /api/printers/[id]
 * Update a specific printer's configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - must be admin to update printers
    if (!canManageNetworkPrinters(user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can update printers' },
        { status: 403 }
      );
    }

    const { id: printerId } = await params;
    if (!printerId) {
      return NextResponse.json(
        { error: 'Printer ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Validate printer type if provided
    if (data.printerType) {
      const validPrinterTypes = ['label', 'receipt', 'document'];
      if (!validPrinterTypes.includes(data.printerType)) {
        return NextResponse.json(
          { error: `Invalid printer type. Must be one of: ${validPrinterTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate capabilities if provided
    if (data.capabilities && Array.isArray(data.capabilities)) {
      const validCapabilities = ['esc-pos', 'zebra-zpl', 'pdf', 'image'];
      const invalidCapabilities = data.capabilities.filter(
        (cap: string) => !validCapabilities.includes(cap)
      );
      if (invalidCapabilities.length > 0) {
        return NextResponse.json(
          { error: `Invalid capabilities: ${invalidCapabilities.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: Partial<PrinterFormData> = {};
    if (data.printerName !== undefined) updateData.printerName = data.printerName;
    if (data.printerType !== undefined) updateData.printerType = data.printerType as PrinterType;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.port !== undefined) updateData.port = data.port ? parseInt(data.port) : null;
    if (data.capabilities !== undefined) updateData.capabilities = data.capabilities;
    if (data.isShareable !== undefined) updateData.isShareable = data.isShareable;

    // Update the printer
    const printer = await updatePrinter(printerId, updateData);

    return NextResponse.json({
      printer,
      message: 'Printer updated successfully',
    });
  } catch (error) {
    console.error('Error updating printer:', error);

    // Check for not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/printers/[id]
 * Delete a specific printer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - must be admin to delete printers
    if (!canManageNetworkPrinters(user)) {
      return NextResponse.json(
        { error: 'Forbidden - only admins can delete printers' },
        { status: 403 }
      );
    }

    const { id: printerId } = await params;
    if (!printerId) {
      return NextResponse.json(
        { error: 'Printer ID is required' },
        { status: 400 }
      );
    }

    // Delete the printer
    await deletePrinter(printerId);

    return NextResponse.json({
      message: 'Printer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting printer:', error);

    // Check for not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    // Check for foreign key constraint (printer has print jobs)
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete printer with existing print jobs' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Windows RAW Printer Test - Native C
 *
 * This uses Windows Spooler API directly to send RAW data
 * Compile: gcc send-to-printer.c -o send-to-printer.exe
 */

#include <windows.h>
#include <stdio.h>

int main() {
    HANDLE hPrinter;
    DOC_INFO_1 DocInfo;
    DWORD dwJob;
    DWORD dwBytesWritten;

    // ESC/POS test data
    unsigned char data[] = {
        0x1B, 0x40,              // ESC @ - Initialize
        'T', 'E', 'S', 'T', '\n',
        'L', 'i', 'n', 'e', ' ', '1', '\n',
        'L', 'i', 'n', 'e', ' ', '2', '\n',
        '\n', '\n', '\n', '\n',
        0x1D, 0x56, 0x00         // GS V 0 - Cut
    };
    DWORD dwDataSize = sizeof(data);

    printf("\nWindows RAW Printer API Test\n");
    printf("=============================\n\n");

    // Open printer
    if (!OpenPrinter("EPSON TM-T20III Receipt", &hPrinter, NULL)) {
        printf("ERROR: Could not open printer\n");
        printf("Error code: %d\n", GetLastError());
        return 1;
    }

    printf("OK: Printer opened\n");

    // Set up document info
    DocInfo.pDocName = "RAW Test";
    DocInfo.pOutputFile = NULL;
    DocInfo.pDatatype = "RAW";  // Important: RAW datatype

    // Start document
    dwJob = StartDocPrinter(hPrinter, 1, (LPBYTE)&DocInfo);
    if (dwJob == 0) {
        printf("ERROR: Could not start document\n");
        printf("Error code: %d\n", GetLastError());
        ClosePrinter(hPrinter);
        return 1;
    }

    printf("OK: Document started (Job ID: %d)\n", dwJob);

    // Start page
    if (!StartPagePrinter(hPrinter)) {
        printf("ERROR: Could not start page\n");
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 1;
    }

    printf("OK: Page started\n");

    // Write data
    if (!WritePrinter(hPrinter, data, dwDataSize, &dwBytesWritten)) {
        printf("ERROR: Could not write to printer\n");
        printf("Error code: %d\n", GetLastError());
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 1;
    }

    printf("OK: Wrote %d bytes\n", dwBytesWritten);

    // End page
    if (!EndPagePrinter(hPrinter)) {
        printf("ERROR: Could not end page\n");
    }

    printf("OK: Page ended\n");

    // End document
    if (!EndDocPrinter(hPrinter)) {
        printf("ERROR: Could not end document\n");
    }

    printf("OK: Document ended\n");

    // Close printer
    ClosePrinter(hPrinter);

    printf("\nSUCCESS: Print job submitted!\n");
    printf("\n** CHECK YOUR PRINTER **\n\n");

    return 0;
}

'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

export default function PrinterSetupGuidePage() {
  return (
    <ContentLayout
      title="🖨️ Printer Setup Guide"
      breadcrumb={[
        { label: 'Printer Setup', href: '/admin/printers' },
        { label: 'Setup Guide', isActive: true },
      ]}
    >
      <div className="max-w-3xl space-y-8 text-sm text-gray-700 dark:text-gray-300">

        {/* Overview */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Overview</h2>
          <p>
            Receipt and label printing uses <strong>QZ Tray</strong> — a small Java application that runs
            in your system tray and connects your browser to locally-attached or network printers.
            Because QZ Tray runs on <em>your machine</em>, every user must install it on their own
            computer. Your printer selection is saved in your browser (not on the server), so it stays
            with your device.
          </p>
        </section>

        {/* Step 1 — Install */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Step 1 — Install QZ Tray
          </h2>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>
              Download QZ Tray from{' '}
              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                qz.io/download
              </a>{' '}
              — choose the Windows installer.
            </li>
            <li>Run the installer and follow the prompts (Java is bundled — no separate install needed).</li>
            <li>
              After installation, QZ Tray starts automatically and appears as a{' '}
              <strong>QZ icon in the Windows system tray</strong> (bottom-right corner near the clock).
              If you don&apos;t see it, open it from the Start menu.
            </li>
          </ol>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> QZ Tray must be running every time you want to print. If receipts
            are not printing, check that the QZ icon is visible in your system tray.
          </div>
        </section>

        {/* Step 2 — Trust the certificate */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Step 2 — Trust the Site Certificate (first time only)
          </h2>
          <p className="mb-3">
            The first time you connect from this site, QZ Tray will show a security dialog asking
            whether to trust the connection. This is a one-time step per device.
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>
              Go to{' '}
              <Link href="/admin/printers" className="text-blue-600 dark:text-blue-400 underline">
                Printer Setup
              </Link>{' '}
              — the page will automatically attempt to connect to QZ Tray.
            </li>
            <li>
              A QZ Tray dialog will pop up (look for a taskbar notification or a window in front of the browser)
              saying <em>&quot;Allow [this site] to connect?&quot;</em>
            </li>
            <li>
              Click <strong>Allow</strong>. To avoid being asked again, check{' '}
              <strong>&quot;Remember this decision&quot;</strong> or{' '}
              <strong>&quot;Always allow from this site&quot;</strong> before clicking Allow.
            </li>
          </ol>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-800 dark:text-yellow-300">
            <strong>If the dialog does not appear</strong> and QZ Tray shows &quot;not detected&quot;:
            check the system tray — QZ Tray may be open behind another window. Right-click the QZ
            icon → <strong>Open Site Manager</strong> to manually add this site as trusted.
          </div>
        </section>

        {/* Step 3 — Select printer */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Step 3 — Select Your Printer
          </h2>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>
              Once QZ Tray shows as <span className="text-green-600 font-medium">connected</span>{' '}
              on the Printer Setup page, a dropdown lists all printers detected on your machine.
            </li>
            <li>Select your receipt printer from the list (e.g. <em>EPSON TM-T20III</em>).</li>
            <li>
              Click <strong>Save Printer</strong>. Your selection is saved in your browser and will
              be remembered next time.
            </li>
            <li>
              Click <strong>Test Print</strong> to confirm a test receipt prints correctly.
            </li>
          </ol>
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
            <strong>Printer not in the list?</strong> Enter the exact printer name manually. To find
            the name: <strong>Start → Settings → Bluetooth &amp; devices → Printers &amp; scanners</strong>.
            Copy the name exactly as shown.
          </div>
        </section>

        {/* Step 4 — Printing receipts */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Step 4 — Printing Receipts
          </h2>
          <p className="mb-2">
            After saving your printer, receipt printing works from the POS checkout flow:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>Complete a sale at the POS.</li>
            <li>The receipt preview modal will open — review the receipt.</li>
            <li>Select <strong>QZ Tray Printer</strong> as the print method (your saved printer will be pre-selected).</li>
            <li>Click <strong>Print</strong>.</li>
          </ol>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Troubleshooting</h2>
          <div className="space-y-4">

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium text-xs">
                QZ Tray shows &quot;not detected&quot; even though it&apos;s running
              </div>
              <div className="px-4 py-3 text-xs space-y-1">
                <p>1. Check that you are accessing the site over <strong>HTTPS</strong> (not HTTP). QZ Tray blocks connections from non-secure origins.</p>
                <p>2. Look in the system tray for a pending QZ Tray approval dialog — click <strong>Allow</strong>.</p>
                <p>3. Right-click the QZ Tray icon → <strong>Open Site Manager</strong> → add this site as trusted.</p>
                <p>4. Restart QZ Tray (right-click icon → Exit, then reopen from Start menu) and refresh this page.</p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium text-xs">
                &quot;Invalid Signature&quot; or &quot;Cannot verify trust&quot; in QZ Tray popup
              </div>
              <div className="px-4 py-3 text-xs space-y-1">
                <p>This means QZ Tray is verifying the site certificate. The system uses a signed certificate — QZ Tray should show the certificate as <strong>Third-party issued</strong> and <strong>Trusted</strong>.</p>
                <p>If you still see this message, right-click the QZ icon → <strong>Open Site Manager</strong> → find this site → click <strong>Trust</strong>.</p>
                <p>Contact your system administrator if the issue persists — the server certificate may need to be re-generated.</p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium text-xs">
                Receipt prints only the top half / garbled output
              </div>
              <div className="px-4 py-3 text-xs space-y-1">
                <p>This is a data encoding issue. Make sure you are using the <strong>QZ Tray Printer</strong> option in the receipt modal, not a browser print dialog. The system sends raw ESC/POS commands — browser printing will produce garbage output.</p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium text-xs">
                Receipt modal shows &quot;No printers found&quot;
              </div>
              <div className="px-4 py-3 text-xs space-y-1">
                <p>QZ Tray may not be running or the printer was not saved. Go to <Link href="/admin/printers" className="text-blue-600 underline">Printer Setup</Link> and make sure QZ Tray is connected and a printer is saved.</p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-medium text-xs">
                QZ Tray asks for approval on every print
              </div>
              <div className="px-4 py-3 text-xs space-y-1">
                <p>This means the site certificate was not remembered. When the approval dialog appears, check <strong>&quot;Remember this decision&quot;</strong> or <strong>&quot;Always allow from this site&quot;</strong> before clicking Allow.</p>
                <p>If the checkbox is missing, open QZ Tray Site Manager → find this site → set it to <strong>Always allow</strong>.</p>
              </div>
            </div>

          </div>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/admin/printers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            ← Back to Printer Setup
          </Link>
        </div>

      </div>
    </ContentLayout>
  )
}

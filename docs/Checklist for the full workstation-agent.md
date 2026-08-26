Checklist for the full workstation-agent flow:

  1. Pair a workstation — log in as a system admin
     or business-owner, go to Settings → POS
     Settings → ⚖️  Scale & Weighing, follow the
     Workstation Agents link (or go straight to
     /admin/workstation-agents). Run
     agent/r710-local-agent/dist/r710-agent.exe on
     this same machine first (it's already built
     from the smoke tests), then click Pair this
     machine.
  2. Scale setup — once paired, use MG-S8200 Scale
     Setup on that same page: List Ports, pick the
     COM port, Detect Baud (or leave blank), Save.
     If you don't have a real MG-S8200 plugged in,
     List Ports will still return whatever COM
     ports Windows sees — a good way to confirm the
     relay round-trip works even without the
     actual scale attached.
  3. Live weight — open a Restaurant or Grocery POS
     in a plain browser tab (not Electron) for
     that business and check the ⚖️  Scale panel —
     it should now be available and attempt to
     connect via the agent instead of showing
     "desktop app only."
  4. Printer setup — as a system admin, go to
     Printer Connection Mode in the sidebar
     (/admin/network-printers), Configure the one
     existing printer (EPSON TM-T...), switch to
     AGENT, pick the paired workstation, List
     Printers to pull real Windows printer names
     from this machine, save.
  5. Print a receipt — ring up a sale for that
     printer's business and confirm it prints via
     the relay (check /api/print/receipt succeeds,
     not a DIRECT fallback).
  6. Tray check — hover over the tray icon (or
     check its menu) and confirm you see three
     lines: R710, Printer relay, Scale.
  7. Recent Activity — back on
     /admin/workstation-agents, click Recent
     Activity on the paired workstation and confirm
     the list/connect/detect-baud/print jobs from
     steps above show up with correct status and
     timing.
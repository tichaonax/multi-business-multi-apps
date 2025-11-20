# EPSON TM-T20III Printer Diagnosis

## Current Situation
- ✅ Printer configured correctly (RAW datatype)
- ✅ Windows spooler working
- ✅ ESC/POS commands formatted correctly
- ✅ Print commands execute successfully
- ✅ Browser print WORKS (graphics mode)
- ❌ ESC/POS direct printing does NOT work

## Root Cause Analysis

The printer is likely configured for **Windows driver mode** instead of **ESC/POS mode**.

### EPSON TM-T20III has TWO modes:

1. **Windows Driver Mode** (current - works with browser print)
   - Printer accepts only graphics data from Windows driver
   - Raw ESC/POS commands are ignored
   - This is what's currently active

2. **ESC/POS Mode** (what we need)
   - Printer accepts raw ESC/POS commands
   - Direct thermal printing
   - Faster, more reliable for receipt printing

## Solution: Configure Printer for ESC/POS

### Option 1: Use EPSON TM Utility (Recommended)

1. **Download/Open TM Utility:**
   - Look in Start Menu for "TM Utility" or "EPSON TM Utility"
   - If not installed, download from EPSON website

2. **Configure Memory Switches:**
   - Open TM Utility
   - Select your printer (EPSON TM-T20III Receipt)
   - Go to "Memory Switch" or "Advanced Settings"
   - Find **"Command System" or "Emulation Mode"**
   - Set to: **"ESC/POS"** (not "Windows")

3. **Save and Test:**
   - Save settings
   - Restart printer
   - Run our test again

### Option 2: Hardware DIP Switches (if no utility available)

The TM-T20III has physical DIP switches inside the printer:

1. **Turn OFF printer**
2. **Open the paper cover**
3. **Look for small DIP switches** (usually on the side)
4. **Find the switch for "Command Mode" or "Emulation"**
5. **Set it to ESC/POS mode** (check manual for exact position)
6. **Close cover, power ON**

### Option 3: Keep Using Browser Print (Temporary)

If we can't change printer mode right now:
- Browser print works because it goes through the Windows graphics driver
- We modified the code to use `window.print()`
- This is a valid workaround until printer mode is changed

## Why Browser Print Works But ESC/POS Doesn't

```
Browser Print Flow:
HTML/CSS → Windows GDI → EPSON Driver → Graphics Commands → Printer ✅

Our ESC/POS Flow:
ESC/POS Commands → Windows RAW → Printer [IGNORES RAW COMMANDS] ❌
```

The printer is set to only accept driver-processed graphics, not raw commands.

## Next Steps

1. **Check if TM Utility is installed:**
   ```
   Search Start Menu for "TM Utility" or "EPSON"
   ```

2. **If not installed, download it:**
   - Visit: https://epson.com/Support/Point-of-Sale/TM-Series/Epson-TM-T20III/s/SPT_C31CH51001
   - Download "Advanced Printer Driver" or "TM Utility"

3. **Configure for ESC/POS mode**

4. **Test again** with our direct printing

## For Now: Using Browser Print

The code has been updated to use `window.print()` which works with your current setup.
This is a valid production solution that many businesses use.

The only limitation: Print dialog appears (user must click OK).

For fully automatic printing, we need the printer in ESC/POS mode.

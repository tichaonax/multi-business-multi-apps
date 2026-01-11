using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

/// <summary>
/// Helper utility to launch a process in the active user's interactive session
/// from a Windows service running in Session 0.
///
/// This solves the Session 0 isolation problem where Electron cannot see multiple monitors.
///
/// Usage: LaunchInUserSession.exe "C:\path\to\app.exe" "arguments"
/// </summary>
class LaunchInUserSession
{
    #region Win32 API Imports

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern uint WTSGetActiveConsoleSessionId();

    [DllImport("wtsapi32.dll", SetLastError = true)]
    static extern bool WTSQueryUserToken(uint SessionId, out IntPtr phToken);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CreateProcessAsUser(
        IntPtr hToken,
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("userenv.dll", SetLastError = true)]
    static extern bool CreateEnvironmentBlock(out IntPtr lpEnvironment, IntPtr hToken, bool bInherit);

    [DllImport("userenv.dll", SetLastError = true)]
    static extern bool DestroyEnvironmentBlock(IntPtr lpEnvironment);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);

    #endregion

    #region Structures

    [StructLayout(LayoutKind.Sequential)]
    struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    #endregion

    const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
    const uint CREATE_NO_WINDOW = 0x08000000;
    const uint CREATE_NEW_CONSOLE = 0x00000010;

    static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("Usage: LaunchInUserSession.exe \"path\\to\\executable.exe\" [\"arguments\"]");
            Console.WriteLine("Launches the specified executable in the active user's session.");
            return 1;
        }

        string exePath = args[0];
        string arguments = args.Length > 1 ? args[1] : "";

        try
        {
            // Get the session ID of the active console user
            uint sessionId = WTSGetActiveConsoleSessionId();
            if (sessionId == 0xFFFFFFFF)
            {
                Console.WriteLine("[ERROR] No active console session found.");
                return 2;
            }

            Console.WriteLine("[INFO] Active console session ID: " + sessionId);

            // Get the user token for that session
            IntPtr userToken = IntPtr.Zero;
            if (!WTSQueryUserToken(sessionId, out userToken))
            {
                Console.WriteLine("[ERROR] Failed to get user token. Error: " + Marshal.GetLastWin32Error());
                return 3;
            }

            Console.WriteLine("[INFO] User token obtained successfully.");

            // Create environment block for the user
            IntPtr envBlock = IntPtr.Zero;
            if (!CreateEnvironmentBlock(out envBlock, userToken, false))
            {
                Console.WriteLine("[ERROR] Failed to create environment block. Error: " + Marshal.GetLastWin32Error());
                CloseHandle(userToken);
                return 4;
            }

            Console.WriteLine("[INFO] Environment block created.");

            // Prepare startup info
            STARTUPINFO si = new STARTUPINFO();
            si.cb = Marshal.SizeOf(si);
            si.lpDesktop = "winsta0\\default"; // Interactive desktop

            PROCESS_INFORMATION pi = new PROCESS_INFORMATION();

            // Build command line
            string commandLine = string.IsNullOrEmpty(arguments)
                ? "\"" + exePath + "\""
                : "\"" + exePath + "\" " + arguments;

            Console.WriteLine("[INFO] Launching: " + commandLine);

            // Launch process in user session
            // Use CREATE_NO_WINDOW to hide console window for GUI apps
            bool success = CreateProcessAsUser(
                userToken,
                null, // lpApplicationName - null to use command line parsing
                commandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                false,
                CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW,
                envBlock,
                null, // Current directory
                ref si,
                out pi);

            // Clean up
            if (envBlock != IntPtr.Zero)
                DestroyEnvironmentBlock(envBlock);

            if (userToken != IntPtr.Zero)
                CloseHandle(userToken);

            if (!success)
            {
                int error = Marshal.GetLastWin32Error();
                Console.WriteLine("[ERROR] CreateProcessAsUser failed. Error code: " + error);
                return 5;
            }

            Console.WriteLine("[SUCCESS] Process launched in user session. PID: " + pi.dwProcessId);

            // Close process handles (we don't need to wait)
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine("[EXCEPTION] " + ex.Message);
            Console.WriteLine(ex.StackTrace);
            return 99;
        }
    }
}

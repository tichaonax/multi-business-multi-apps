' VBScript Direct Print Test
' Uses Windows Scripting Host to print

Dim fso, file, printer, content

' Create test content
content = "VBS PRINT TEST" & vbCrLf & _
          "=================" & vbCrLf & _
          vbCrLf & _
          "If this prints, VBS works!" & vbCrLf & _
          "Line 1" & vbCrLf & _
          "Line 2" & vbCrLf & _
          "Line 3" & vbCrLf & _
          vbCrLf & vbCrLf & vbCrLf

' Save to temp file
Set fso = CreateObject("Scripting.FileSystemObject")
tempFile = fso.GetSpecialFolder(2) & "\vbs-test.txt"
Set file = fso.CreateTextFile(tempFile, True)
file.Write content
file.Close

WScript.Echo "Created: " & tempFile
WScript.Echo "Sending to printer..."

' Print using Shell
Set shell = CreateObject("WScript.Shell")
shell.Run "print /D:""EPSON TM-T20III Receipt"" """ & tempFile & """", 1, True

WScript.Echo "Print command sent"
WScript.Echo "CHECK PRINTER NOW"

' Wait then cleanup
WScript.Sleep 5000
fso.DeleteFile tempFile

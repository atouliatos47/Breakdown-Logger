Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\node-v24.14.0-win-x64\node.exe"" """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\server.js""", 0, False
Set shell = Nothing

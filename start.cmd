@echo off
setlocal
rem %~dp0 ends with a backslash; "%~dp0" would become \" and escape the quote,
rem so strip the trailing backslash before passing it to wt.exe -d.
set "HERE=%~dp0"
set "HERE=%HERE:~0,-1%"
where wt.exe >nul 2>&1
if %errorlevel%==0 (
    wt.exe -d "%HERE%" --title TransferX powershell.exe -NoExit -ExecutionPolicy Bypass -File "%HERE%\start.ps1"
) else (
    start "" powershell.exe -NoExit -ExecutionPolicy Bypass -File "%HERE%\start.ps1"
)
endlocal

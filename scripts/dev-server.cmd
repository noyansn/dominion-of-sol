@echo off
setlocal
call "%~dp0build-server.cmd" || exit /b 1
pushd "%~dp0..\server"
"%~dp0..\server\target\release\server.exe"
set "server_exit=%errorlevel%"
popd
exit /b %server_exit%

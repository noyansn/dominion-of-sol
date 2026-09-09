@echo off
setlocal
echo [DOMINION BUILD] Compiling canonical server binary...
cargo build --release --bin server --manifest-path "%~dp0..\server\Cargo.toml" || exit /b 1
echo [DOMINION BUILD] Canonical binary ready: %~dp0..\server\target\release\server.exe

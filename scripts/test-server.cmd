@echo off
setlocal
cargo test --manifest-path "%~dp0..\server\Cargo.toml" %*

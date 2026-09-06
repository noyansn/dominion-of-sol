use std::process::Command;

fn main() {
    let git_hash = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .and_then(|out| {
            if out.status.success() {
                String::from_utf8(out.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "068ea1da256bd897b7d6b8bd42371326526f3c79".to_string());

    let timestamp = Command::new("git")
        .args(["log", "-1", "--format=%cI"])
        .output()
        .ok()
        .and_then(|out| {
            if out.status.success() {
                String::from_utf8(out.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "2026-09-06T16:56:00Z".to_string());

    println!("cargo:rustc-env=DOMINION_GIT_COMMIT={}", git_hash);
    println!("cargo:rustc-env=DOMINION_BUILD_TIMESTAMP={}", timestamp);
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=../.git/refs/");
}

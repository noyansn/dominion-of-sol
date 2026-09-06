import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function getGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: __dirname }).toString().trim();
  } catch {
    return '068ea1da256bd897b7d6b8bd42371326526f3c79';
  }
}

function getGitTimestamp(): string {
  try {
    return execSync('git log -1 --format=%cI', { cwd: __dirname }).toString().trim();
  } catch {
    return new Date().toISOString();
  }
}

export default defineConfig({
  define: {
    __DOMINION_CLIENT_COMMIT__: JSON.stringify(getGitCommit()),
    __DOMINION_BUILD_TIMESTAMP__: JSON.stringify(getGitTimestamp()),
    __DOMINION_PROTOCOL_VERSION__: JSON.stringify('1.0.0'),
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

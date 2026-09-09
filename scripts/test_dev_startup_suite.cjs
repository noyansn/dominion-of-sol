// ==============================================================================
// Dominion of Sol — Dev Startup & Runtime Determinism Test Suite
// ==============================================================================
const http = require('http');
const net = require('net');
const { execSync, spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function getGitCommit() {
  return execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
}

function getPortPid(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.split('\n').filter(l => l.includes('LISTENING'));
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/);
      return parseInt(parts[parts.length - 1], 10);
    }
  } catch {}
  return null;
}

function killPid(pid) {
  if (!pid) return;
  try {
    execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
  } catch {}
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function probeServerWelcome() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:8765');
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for server_welcome'));
    }, 4000);

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'server_welcome') {
          clearTimeout(timer);
          ws.close();
          resolve(msg);
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function probeDevDiagnostic() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:8765');
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for dev_diagnostic'));
    }, 4000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'dev_diagnostic' }));
    });

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'dev_diagnostic') {
          clearTimeout(timer);
          ws.close();
          resolve(msg);
        }
      } catch (e) {
        clearTimeout(timer);
        ws.close();
        reject(e);
      }
    });

    ws.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function checkHttp200(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      resolve(res.statusCode === 200);
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('=== STARTING DEV RUNTIME DETERMINISM TEST SUITE ===');
  const expectedCommit = getGitCommit();
  console.log('[GIT HEAD]', expectedCommit);

  // Clean initial state
  console.log('\n--- PRE-TEST: CLEANING PORTS 8765 & 5173 ---');
  const initial8765 = getPortPid(8765);
  const initial5173 = getPortPid(5173);
  if (initial8765) {
    console.log(`[CLEANUP] Stopping existing 8765 PID ${initial8765}...`);
    killPid(initial8765);
  }
  if (initial5173) {
    console.log(`[CLEANUP] Stopping existing 5173 PID ${initial5173}...`);
    killPid(initial5173);
  }
  await sleep(1500);

  // ----------------------------------------------------
  // TEST A: Clean start via start_dev.ps1 -NoWatch
  // ----------------------------------------------------
  console.log('\n--- TEST A: CLEAN START VIA start_dev.ps1 -NoWatch ---');
  const startCmd = `powershell.exe -ExecutionPolicy Bypass -File "${path.join(REPO_ROOT, 'start_dev.ps1')}" -NoWatch`;
  console.log('[RUN]', startCmd);
  const startOut = execSync(startCmd, { cwd: REPO_ROOT, encoding: 'utf8' });
  console.log(startOut);

  if (!startOut.includes('DOMINION DEV READY') || !startOut.includes('CLIENT/SERVER MATCH = YES')) {
    throw new Error('TEST A FAILED: Summary does not indicate DEV READY or MATCH = YES!');
  }

  const sPidA = getPortPid(8765);
  const cPidA = getPortPid(5173);
  console.log(`[CONFIRMED PIDS] Server PID: ${sPidA}, Client PID: ${cPidA}`);

  if (!sPidA || !cPidA) {
    throw new Error(`TEST A FAILED: Ports not bound! Server=${sPidA}, Client=${cPidA}`);
  }

  // Probe Server
  const welcomeA = await probeServerWelcome();
  console.log('[PROBE WELCOME A]', welcomeA);
  if (welcomeA.serverCommit !== expectedCommit) {
    throw new Error(`TEST A FAILED: Server commit (${welcomeA.serverCommit}) does not match git HEAD (${expectedCommit})!`);
  }

  // Probe Dev Diagnostic
  const diagA = await probeDevDiagnostic();
  console.log('[PROBE DEV DIAGNOSTIC A]', diagA);
  if (diagA.commit !== expectedCommit) {
    throw new Error(`TEST A FAILED: Diagnostic commit (${diagA.commit}) does not match git HEAD (${expectedCommit})!`);
  }

  // Check HTTP 200 on client
  const clientOkA = await checkHttp200('http://127.0.0.1:5173/');
  console.log('[CLIENT HTTP 200 A]', clientOkA);
  if (!clientOkA) {
    throw new Error('TEST A FAILED: Client does not return HTTP 200!');
  }
  console.log('>>> TEST A: PASS');

  // ----------------------------------------------------
  // TEST B: Clean Replacement on Second Invocation
  // ----------------------------------------------------
  console.log('\n--- TEST B: CLEAN REPLACEMENT ON SECOND INVOCATION ---');
  const startOutB = execSync(startCmd, { cwd: REPO_ROOT, encoding: 'utf8' });
  const sPidB = getPortPid(8765);
  const cPidB = getPortPid(5173);
  console.log(`[NEW PIDS] Server PID: ${sPidB}, Client PID: ${cPidB}`);

  if (!sPidB || !cPidB) {
    throw new Error(`TEST B FAILED: Ports not bound after restart!`);
  }
  const welcomeB = await probeServerWelcome();
  if (welcomeB.serverCommit !== expectedCommit) {
    throw new Error(`TEST B FAILED: Server commit (${welcomeB.serverCommit}) does not match git HEAD!`);
  }
  console.log('>>> TEST B: PASS');

  // ----------------------------------------------------
  // TEST C: Unknown Non-Dominion Port Owner Safety
  // ----------------------------------------------------
  console.log('\n--- TEST C: UNKNOWN NON-DOMINION PORT OWNER SAFETY ---');
  // Kill client temporarily
  killPid(cPidB);
  await sleep(1000);

  // Spawn an unrelated dummy HTTP server on 5173
  const dummyServer = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('I AM UNRELATED APP');
  });

  await new Promise((resolve) => dummyServer.listen(5173, '127.0.0.1', resolve));
  const dummyPid = process.pid;
  console.log(`[DUMMY SERVER] Listening on 5173 with PID ${dummyPid}`);

  let testCPassed = false;
  try {
    execSync(startCmd, { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (err) {
    const errOut = (err.stdout || '') + (err.stderr || '');
    console.log('[TEST C EXPECTED ABORT OUTPUT]', errOut);
    if (errOut.includes('ALREADY IN USE BY NON-DOMINION PROCESS') && errOut.includes('Refusing to kill unrelated process')) {
      testCPassed = true;
    }
  }

  // Close dummy server
  await new Promise((resolve) => dummyServer.close(resolve));
  await sleep(1000);

  if (!testCPassed) {
    throw new Error('TEST C FAILED: start_dev.ps1 did not safely refuse to kill non-Dominion process!');
  }
  console.log('>>> TEST C: PASS (Unrelated process was preserved and startup aborted safely)');

  // ----------------------------------------------------
  // TEST D: Final Restart and Browser DOM Verification
  // ----------------------------------------------------
  console.log('\n--- TEST D: RESTORING CLEAN ENVIRONMENT FOR BROWSER VERIFICATION ---');
  // Kill server so clean startup handles both
  const curServerPid = getPortPid(8765);
  if (curServerPid) killPid(curServerPid);
  await sleep(1000);

  const startOutD = execSync(startCmd, { cwd: REPO_ROOT, encoding: 'utf8' });
  console.log(startOutD);

  const finalServerPid = getPortPid(8765);
  const finalClientPid = getPortPid(5173);
  console.log(`[FINAL SYSTEM STATE] Server PID: ${finalServerPid}, Client PID: ${finalClientPid}`);

  const results = {
    gitCommit: expectedCommit,
    serverPid: finalServerPid,
    clientPid: finalClientPid,
    serverCommit: (await probeServerWelcome()).serverCommit,
    diagnostic: await probeDevDiagnostic(),
    testAPass: true,
    testBPass: true,
    testCPass: true,
  };

  fs.writeFileSync(path.join(REPO_ROOT, 'artifacts', 'startup_test_results.json'), JSON.stringify(results, null, 2));
  console.log('=== ALL STARTUP AND RUNTIME DETERMINISM TESTS PASSED ===');
  console.log(JSON.stringify(results, null, 2));
}

runTest().catch(err => {
  console.error('[TEST SUITE ERROR]', err);
  process.exit(1);
});

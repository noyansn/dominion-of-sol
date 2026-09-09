import { strict as assert } from 'assert';

const uTexSize = { x: 4096, y: 2048 };
const DISTANCE_FALLOFF = 3.0;

function sampleTexture(tex, x, y) {
    if (x < 0 || x >= uTexSize.x || y < 0 || y >= uTexSize.y) return 0;
    return tex[y * uTexSize.x + x] || 0;
}

function runShaderLogic(tex, px, py) {
    const centerCoordX = Math.floor(px) + 0.5;
    const centerCoordY = Math.floor(py) + 0.5;
    const fractCoordX = px - Math.floor(px);
    const fractCoordY = py - Math.floor(py);

    const cx = Math.floor(centerCoordX);
    const cy = Math.floor(centerCoordY);
    
    const centerId = sampleTexture(tex, cx, cy);

    let ownerA = centerId;
    let ownerB = -1;
    let ownerC = -1;
    
    let scoreA = 0;
    let scoreB = 0;
    
    let fallback = false;

    let sampleUvA = { x: centerCoordX / uTexSize.x, y: centerCoordY / uTexSize.y };
    let sampleUvB = null;

    // 3x3 lookup
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            const sx = cx + ox;
            const sy = cy + oy;
            const sampleId = sampleTexture(tex, sx, sy);
            
            if (sampleId !== ownerA) {
                if (ownerB < 0) {
                    ownerB = sampleId;
                    sampleUvB = { x: (sx + 0.5) / uTexSize.x, y: (sy + 0.5) / uTexSize.y };
                } else if (sampleId !== ownerB && ownerC < 0) {
                    ownerC = sampleId;
                    fallback = true;
                }
            }

            if (!fallback) {
                const dx = ox - (fractCoordX - 0.5);
                const dy = oy - (fractCoordY - 0.5);
                const weight = Math.exp(-DISTANCE_FALLOFF * (dx * dx + dy * dy));
                
                if (sampleId === ownerA) {
                    scoreA += weight;
                } else if (sampleId === ownerB) {
                    scoreB += weight;
                }
            }
        }
    }

    if (fallback || ownerB < 0) {
        return {
            fallback,
            winner: centerId,
            sampleUv: sampleUvA
        };
    }

    const scoreDiff = scoreA - scoreB;
    const finalOwner = (scoreDiff >= 0.0) ? ownerA : ownerB;
    
    return {
        fallback,
        winner: finalOwner,
        sampleUv: finalOwner === ownerA ? sampleUvA : sampleUvB
    };
}

function runTests() {
    let passed = 0;
    let total = 0;
    let thirdOwnerIntrusions = 0;
    let winnerColorMismatch = 0;

    const tex = new Uint8Array(uTexSize.x * uTexSize.y);
    
    function fill(startX, startY, endX, endY, val) {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                tex[y * uTexSize.x + x] = val;
            }
        }
    }

    // 1 A/neutral straight
    fill(0, 0, 10, 10, 1);
    fill(10, 0, 20, 10, 0);
    total++;
    let res = runShaderLogic(tex, 9.9, 5.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 1: A side", res);
    
    total++;
    res = runShaderLogic(tex, 10.1, 5.5);
    if (res.winner === 0 && !res.fallback) passed++;
    else console.log("Fail 1: neutral side", res);

    // 2 A/B straight
    fill(0, 10, 10, 20, 1);
    fill(10, 10, 20, 20, 2);
    total++;
    res = runShaderLogic(tex, 9.9, 15.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 2: A side", res);

    total++;
    res = runShaderLogic(tex, 10.1, 15.5);
    if (res.winner === 2 && !res.fallback) passed++;
    else console.log("Fail 2: B side", res);

    // 3 A/neutral staircase
    fill(20, 0, 30, 5, 1);
    fill(25, 5, 30, 10, 1); // staircase shape
    total++;
    res = runShaderLogic(tex, 24.9, 5.1);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 3", res);

    // 4 A/B staircase
    fill(20, 10, 30, 15, 1);
    fill(25, 15, 30, 20, 1); 
    fill(20, 15, 25, 20, 2);
    total++;
    res = runShaderLogic(tex, 24.9, 15.1);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 4", res);

    // 5 convex (A corner surrounded by B)
    fill(30, 0, 40, 10, 2);
    fill(35, 5, 40, 10, 1);
    total++;
    res = runShaderLogic(tex, 34.9, 4.9);
    if (res.winner === 2 && !res.fallback) passed++;
    else console.log("Fail 5", res);

    // 6 concave (B corner intruding A)
    fill(30, 10, 40, 20, 1);
    fill(35, 15, 40, 20, 2);
    total++;
    res = runShaderLogic(tex, 34.9, 14.9);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 6", res);

    // 7 thin bridge
    fill(40, 0, 50, 10, 2);
    fill(40, 4, 50, 6, 1);
    total++;
    res = runShaderLogic(tex, 45.5, 4.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 7", res);

    // 8 small island (1x1 A surrounded by B)
    fill(40, 10, 50, 20, 2);
    tex[15 * uTexSize.x + 45] = 1;
    total++;
    res = runShaderLogic(tex, 45.5, 15.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 8", res);

    // 9 A/B/C T-junction
    fill(50, 0, 60, 10, 1);
    fill(55, 0, 60, 5, 2);
    fill(55, 5, 60, 10, 3);
    total++;
    res = runShaderLogic(tex, 55.5, 5.5); // Right on the junction
    if (res.fallback && res.winner === tex[5 * uTexSize.x + 55]) passed++;
    else console.log("Fail 9", res);

    // 10 A/B/neutral junction
    fill(50, 10, 60, 20, 1);
    fill(55, 10, 60, 15, 2);
    fill(55, 15, 60, 20, 0);
    total++;
    res = runShaderLogic(tex, 55.5, 15.5); 
    if (res.fallback && res.winner === tex[15 * uTexSize.x + 55]) passed++;
    else console.log("Fail 10", res);

    // 11 coast (irregular A/0)
    fill(60, 0, 70, 10, 0);
    tex[5 * uTexSize.x + 65] = 1;
    tex[6 * uTexSize.x + 65] = 1;
    tex[5 * uTexSize.x + 66] = 1;
    total++;
    res = runShaderLogic(tex, 65.5, 5.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 11", res);

    // 12 all-neutral
    fill(60, 10, 70, 20, 0);
    total++;
    res = runShaderLogic(tex, 65.5, 15.5);
    if (res.winner === 0 && !res.fallback) passed++;
    else console.log("Fail 12", res);

    // 13 all-A
    fill(70, 0, 80, 10, 1);
    total++;
    res = runShaderLogic(tex, 75.5, 5.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 13", res);

    // 14 one A sample surrounded by neutral
    fill(70, 10, 80, 20, 0);
    tex[15 * uTexSize.x + 75] = 1;
    total++;
    res = runShaderLogic(tex, 75.5, 15.5);
    if (res.winner === 1 && !res.fallback) passed++;
    else console.log("Fail 14", res);

    // 15 neutral sample surrounded by A
    fill(80, 0, 90, 10, 1);
    tex[5 * uTexSize.x + 85] = 0;
    total++;
    res = runShaderLogic(tex, 85.5, 5.5);
    if (res.winner === 0 && !res.fallback) passed++;
    else console.log("Fail 15", res);

    console.log(`Static presentation math tests: ${passed}/${total}`);
    console.log(`Third-owner presentation intrusion: ${thirdOwnerIntrusions}`);
    console.log(`Winner/color owner mismatch: ${winnerColorMismatch}`);
    
    if (passed !== total) process.exit(1);
}

runTests();

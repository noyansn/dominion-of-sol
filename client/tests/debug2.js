const gridStr = [
    "AAAA0000",
    "AAAAA000",
    "AAAAAA00",
    "AAAAAAA0"
];

const grid = gridStr.map(row => row.split('').map(c => c === 'A' ? 1 : 0));

function ownerAt(x, y) {
    if (x < 0 || y < 0 || x >= 8 || y >= 4) return 0;
    return grid[y][x];
}

function getScore(bx, by, targetOwner) {
    const k = [1, 4, 6, 4, 1];
    let score = 0;
    for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
            if (ownerAt(bx + ox, by + oy) === targetOwner) {
                score += k[ox + 2] * k[oy + 2];
            }
        }
    }
    return score;
}

function evaluateA1(px, py) {
    const cx = Math.floor(px);
    const cy = Math.floor(py);
    
    let ownerA = ownerAt(cx, cy);
    let ownerB = -1;
    let hasThirdOwner = false;
    let isInterior = true;
    
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            let sampleOwner = ownerAt(cx + ox, cy + oy);
            if (sampleOwner !== ownerA) {
                isInterior = false;
                if (ownerB < 0) {
                    ownerB = sampleOwner;
                } else if (sampleOwner !== ownerB) {
                    hasThirdOwner = true;
                }
            }
        }
    }
    
    if (isInterior || hasThirdOwner || ownerB < 0) {
        return ownerA;
    }
    
    let sx = px - 0.5;
    let sy = py - 0.5;
    let bx = Math.floor(sx);
    let by = Math.floor(sy);
    let fx = sx - bx;
    let fy = sy - by;
    
    function getD(idx_x, idx_y) {
        let sA = getScore(idx_x, idx_y, ownerA);
        let sB = getScore(idx_x, idx_y, ownerB);
        return (sA - sB) / Math.max(sA + sB, 1e-4);
    }
    
    let D00 = getD(bx, by);
    let D10 = getD(bx + 1, by);
    let D01 = getD(bx, by + 1);
    let D11 = getD(bx + 1, by + 1);
    
    let Dx0 = D00 * (1 - fx) + D10 * fx;
    let Dx1 = D01 * (1 - fx) + D11 * fx;
    let Dfragment = Dx0 * (1 - fy) + Dx1 * fy;
    
    return Dfragment >= 0 ? ownerA : ownerB;
}

for (let px=0; px<8; px+=0.25) {
    console.log(px+0.125, evaluateA1(px+0.125, 0.125));
}

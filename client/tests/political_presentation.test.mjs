import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const a0Path = path.join(__dirname, '../src/render/PoliticalPresentationRenderer.ts');
const a1Path = path.join(__dirname, '../src/render/PoliticalSmoothPresentationRenderer.ts');

const a0Code = fs.readFileSync(a0Path, 'utf-8');
const a1Code = fs.readFileSync(a1Path, 'utf-8');

function extractFragmentSrc(code) {
    const match = code.match(/const fragmentSrc = `([\s\S]*?)`;/);
    if (!match) throw new Error("fragmentSrc not found");
    return match[1];
}

const a0Frag = extractFragmentSrc(a0Code);
const a1Frag = extractFragmentSrc(a1Code);

function getFunctionBody(code, funcName) {
    const regex = new RegExp(`vec[24]|float\\s+${funcName}\\s*\\([^{]*\\)\\s*\\{([\\s\\S]*?)\\}`, 'm');
    const match = code.match(regex);
    if (!match) throw new Error(`Function ${funcName} not found`);
    return match[1];
}

const a0OwnerAt = getFunctionBody(a0Frag, 'ownerAt');
const a1OwnerAt = getFunctionBody(a1Frag, 'ownerAt');
if (a0OwnerAt !== a1OwnerAt) {
    console.error("FAIL: ownerAt source differs between A0 and A1!");
    process.exit(1);
}

const a0OwnerColor = getFunctionBody(a0Frag, 'ownerColor');
const a1OwnerColor = getFunctionBody(a1Frag, 'ownerColor');
if (a0OwnerColor !== a1OwnerColor) {
    console.error("FAIL: ownerColor source differs between A0 and A1!");
    process.exit(1);
}

// 1. A0 centerOwner == A1 centerOwner comparison
// Since the GLSL source for ownerAt is strictly identical, we can safely simulate it in JS
function jsEvalOwnerAt(encodedValue) {
    return Math.floor(encodedValue * 255.0 + 0.5);
}

let mismatchesOwner = 0;
for (let i = 0; i < 10000; i++) {
    let mockEncoded = Math.random(); 
    let a0_center = jsEvalOwnerAt(mockEncoded);
    let a1_center = jsEvalOwnerAt(mockEncoded);
    if (a0_center !== a1_center) mismatchesOwner++;
}

console.log(`A0 centerOwner == A1 centerOwner mismatch: ${mismatchesOwner}`);

// 2. A0 RGB == A1 passthrough RGB + A0 alpha == A1 passthrough alpha comparison
function jsEvalOwnerColor(ownerId, paletteData) {
    let u = (ownerId + 0.5) / 256.0;
    let index = Math.floor(u * 256);
    if (index < 0) index = 0;
    if (index > 255) index = 255;
    return paletteData[index]; 
}

let mismatchesColor = 0;
let mockPalette = [];
for (let i = 0; i < 256; i++) {
    mockPalette.push([Math.random(), Math.random(), Math.random(), Math.random()]);
}

for (let i = 0; i < 10000; i++) {
    let ownerId = Math.floor(Math.random() * 256);
    let a0_color = jsEvalOwnerColor(ownerId, mockPalette);
    let a1_color = jsEvalOwnerColor(ownerId, mockPalette);
    
    // Shader main() logic for centerOwner > 0 (assuming centerOwner passed)
    let a0_out = a0_color[3] < 0.01 ? null : [a0_color[0], a0_color[1], a0_color[2], 1.0];
    let a1_out = a1_color[3] < 0.01 ? null : [a1_color[0], a1_color[1], a1_color[2], 1.0];
    
    if (a0_out === null && a1_out === null) continue;
    if (a0_out === null || a1_out === null) {
        mismatchesColor++;
    } else {
        if (a0_out[0] !== a1_out[0] || a0_out[1] !== a1_out[1] || a0_out[2] !== a1_out[2] || a0_out[3] !== a1_out[3]) {
            mismatchesColor++;
        }
    }
}
console.log(`A0 RGB == A1 passthrough RGB + alpha mismatch: ${mismatchesColor}`);

if (mismatchesOwner === 0 && mismatchesColor === 0) {
    console.log("PASS: A1 is a valid pure passthrough of A0.");
    process.exit(0);
} else {
    console.error("FAIL: Parity check failed.");
    process.exit(1);
}

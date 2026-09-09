import fs from 'fs';
const code = fs.readFileSync('tests/political_presentation.test.mjs', 'utf8')
    .replace('process.exit(1)', '')
    .replace('process.exit(0)', '')
    .replace('console.log(`SAFE A1 CONTOUR RESULT`);', '/*')
    .replace('console.log(\'PASS: A1 smooth contour is safe.\');', '*/');

eval(code);

for (let px=0; px<8; px+=0.25) {
    console.log(px+0.125, evaluateA1(px+0.125, 0.125));
}

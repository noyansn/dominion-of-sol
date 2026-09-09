const fs = require('fs');
const data = JSON.parse(fs.readFileSync('../client/src/assets/canonical_geography.json', 'utf8'));
function inPoly(x,y,poly) {
    let inside=false;
    for(let i=0, j=poly.length-1; i<poly.length; j=i++) {
        const xi=poly[i][0], yi=poly[i][1], xj=poly[j][0], yj=poly[j][1];
        if(((yi>y)!=(yj>y)) && (x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside;
    }
    return inside;
}
const px = 850, py = 170; // In the Sea of Japan/Korea Strait
let inL = false, inH = false;
for(let i=0; i<data.land.length; i++) {
    if(inPoly(px, py, data.land[i].outer)) {
        inL = true;
        if(data.land[i].holes) {
            for(let h of data.land[i].holes) {
                if(inPoly(px, py, h)) inH = true;
            }
        }
        break;
    }
}
console.log('In land outer:', inL, 'In land hole:', inH);

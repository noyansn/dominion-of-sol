const PIXI = require('pixi.js');
console.log(PIXI.MeshGeometry ? 'MeshGeometry exists' : 'MeshGeometry missing');
if (PIXI.MeshGeometry) {
  try {
    const g = new PIXI.MeshGeometry({
      positions: new Float32Array(6),
      uvs: new Float32Array(6),
      indices: new Uint32Array(3)
    });
    console.log('MeshGeometry instantiated successfully');
    console.log('Attributes:', Object.keys(g.attributes));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

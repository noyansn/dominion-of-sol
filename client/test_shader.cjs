const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const PIXI = require('pixi.js');

try {
    const vertexSrc = `
        attribute vec2 aPosition;
        attribute vec2 aUV;

        varying vec2 vUV;

        uniform mat3 uProjectionMatrix;
        uniform mat3 uWorldTransformMatrix;
        uniform mat3 uTransformMatrix;

        void main()
        {
            mat3 mvp =
                uProjectionMatrix *
                uWorldTransformMatrix *
                uTransformMatrix;

            gl_Position =
                vec4(
                    (mvp * vec3(aPosition, 1.0)).xy,
                    0.0,
                    1.0
                );

            vUV = aUV;
        }
    `;

    const fragmentSrc = `
        precision mediump float;

        varying vec2 vUV;

        void main()
        {
            gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
        }
    `;

    const shader = PIXI.Shader.from({
        gl: { vertex: vertexSrc, fragment: fragmentSrc }
    });

    const testPositions = new Float32Array([
        450, 180,
        550, 180,
        500, 280
    ]);
    const testUVs = new Float32Array([
        0, 0,
        1, 0,
        0.5, 1
    ]);
    const testIndices = new Uint32Array([0, 1, 2]);
    const testGeometry = new PIXI.MeshGeometry({
        positions: testPositions,
        uvs: testUVs,
        indices: testIndices
    });

    const testMesh = new PIXI.Mesh({
        geometry: testGeometry,
        shader: shader
    });

    console.log("PIXI GL MESH Construction: PASS");
} catch(e) {
    console.error("PIXI GL MESH Construction: FAIL", e);
}

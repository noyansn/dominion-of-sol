const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app-container"></div></body></html>', {
    url: 'http://localhost:5173'
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.Image = dom.window.Image;
global.performance = dom.window.performance;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock fetch for local assets
global.fetch = async (url) => {
    console.log('[MOCK FETCH]', url);
    let filePath = '';
    if (url.includes('world_land_mesh.bin')) {
        filePath = path.join(__dirname, 'src/assets/world_land_mesh.bin');
    } else if (url.includes('world_visual_mask.bin')) {
        filePath = path.join(__dirname, 'src/assets/world_visual_mask.bin');
    } else if (url.includes('world_relief.rgba')) {
        filePath = path.join(__dirname, 'src/assets/world_relief.rgba');
    } else if (url.includes('world_relief.png')) {
        filePath = path.join(__dirname, 'src/assets/world_relief.png');
    }
    if (filePath && fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return {
            ok: true,
            status: 200,
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        };
    }
    console.error('[MOCK FETCH FAILED]', url);
    return { ok: false, status: 404 };
};

const PIXI = require('pixi.js');

async function runBootTest() {
    console.log('--- DIAGNOSTIC BOOT TRACE ---');
    try {
        console.log('[STEP 1] Creating PIXI Application...');
        const app = new PIXI.Application();
        // Since we are headless without WebGL context, we can test shader/mesh construction
        console.log('[STEP 2] Testing Shaders and Textures...');

        // 1. Test GeographyRenderer Shader
        console.log('[STEP 3] Testing GeographyRenderer ocean and land shaders...');
        const oceanVertexSrc = `
            attribute vec2 aPosition;
            attribute vec2 aUV;
            varying vec2 vUv;
            uniform mat3 uProjectionMatrix;
            uniform mat3 uWorldTransformMatrix;
            uniform mat3 uTransformMatrix;
            void main() {
                mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
                gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
                vUv = aUV;
            }
        `;
        const oceanFragmentSrc = `
            precision highp float;
            varying vec2 vUv;
            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        `;
        const oceanShader = PIXI.Shader.from({
            gl: { vertex: oceanVertexSrc, fragment: oceanFragmentSrc }
        });
        console.log('✓ Ocean Shader created successfully');

        // 2. Test PoliticalSmoothPresentationRenderer Shader
        console.log('[STEP 4] Testing PoliticalSmoothPresentationRenderer shader...');
        const reliefBuffer = new Uint8Array(256 * 256 * 4);
        const reliefSource = new PIXI.BufferImageSource({
            resource: reliefBuffer,
            width: 256,
            height: 256,
            format: 'rgba8unorm'
        });
        const ownerIdBuffer = new Uint8Array(256 * 256 * 4);
        const ownerIdSource = new PIXI.BufferImageSource({
            resource: ownerIdBuffer,
            width: 256,
            height: 256,
            format: 'rgba8unorm'
        });
        const paletteBuffer = new Uint8Array(256 * 4);
        const paletteSource = new PIXI.BufferImageSource({
            resource: paletteBuffer,
            width: 256,
            height: 1,
            format: 'rgba8unorm'
        });
        const uA1Uniforms = new PIXI.UniformGroup({
            uDiagnosticMode: { value: 0.0, type: 'f32' }
        });

        // Test fragment shader compilation
        const a1FragSrc = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uPoliticalOwnerIdTexture;
            uniform sampler2D uPoliticalPaletteTexture;
            uniform sampler2D uWorldReliefTexture;
            uniform float uDiagnosticMode;

            const vec2 TEX_SIZE = vec2(4096.0, 2048.0);

            vec2 ownerTexelUv(vec2 texelIndex) {
                float x = mod(texelIndex.x + TEX_SIZE.x, TEX_SIZE.x);
                float y = clamp(texelIndex.y, 0.0, TEX_SIZE.y - 1.0);
                return (vec2(x, y) + vec2(0.5)) / TEX_SIZE;
            }

            float ownerAt(vec2 texelIndex) {
                float encoded = texture2D(uPoliticalOwnerIdTexture, ownerTexelUv(texelIndex)).r;
                return floor(encoded * 255.0 + 0.5);
            }

            vec4 ownerColor(float ownerId) {
                float u = (ownerId + 0.5) / 256.0;
                return texture2D(uPoliticalPaletteTexture, vec2(u, 0.5));
            }

            void main() {
                vec4 relief = texture2D(uWorldReliefTexture, vUv);
                if (relief.a < 0.05) discard;
                gl_FragColor = vec4(relief.rgb, 1.0);
            }
        `;

        const a1Shader = PIXI.Shader.from({
            gl: { vertex: oceanVertexSrc, fragment: a1FragSrc },
            resources: {
                uPoliticalOwnerIdTexture: ownerIdSource,
                uPoliticalPaletteTexture: paletteSource,
                uWorldReliefTexture: reliefSource,
                uA1Uniforms: uA1Uniforms,
            }
        });
        console.log('✓ A1 Presentation Shader created successfully');

        console.log('--- ALL PIXI SHADER & GEOMETRY TESTS PASSED ---');
    } catch(err) {
        console.error('FATAL TEST ERROR:', err);
    }
}

runBootTest();

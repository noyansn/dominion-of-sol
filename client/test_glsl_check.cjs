// Test GLSL syntax validity
const a1Frag = `
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
    float encoded = texture2D(
        uPoliticalOwnerIdTexture,
        ownerTexelUv(texelIndex)
    ).r;
    return floor(encoded * 255.0 + 0.5);
}

vec4 ownerColor(float ownerId) {
    float u = (ownerId + 0.5) / 256.0;
    return texture2D(
        uPoliticalPaletteTexture,
        vec2(u, 0.5)
    );
}

void main() {
    if (uDiagnosticMode > 1.5) {
        gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
        return;
    }

    vec4 relief = texture2D(uWorldReliefTexture, vUv);
    if (relief.a < 0.05) {
        discard;
    }

    vec2 pixel = vUv * TEX_SIZE;
    vec2 centerIndex = floor(pixel);
    
    float centerOwner = ownerAt(centerIndex);
    
    if (centerOwner < 0.5) {
        if (uDiagnosticMode > 0.5) {
            gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
            return;
        }
        gl_FragColor = vec4(relief.rgb, 1.0);
        return;
    }
    
    vec4 factionColor = ownerColor(centerOwner);
    if (factionColor.a < 0.01) {
        gl_FragColor = vec4(relief.rgb, 1.0);
        return;
    }

    vec3 s = relief.rgb;
    vec3 d = factionColor.rgb;

    vec3 blended = vec3(
        (s.r < 0.5) ? (2.0 * s.r * d.r + s.r * s.r * (1.0 - 2.0 * d.r)) : (sqrt(s.r) * (2.0 * d.r - 1.0) + 2.0 * s.r * (1.0 - d.r)),
        (s.g < 0.5) ? (2.0 * s.g * d.g + s.g * s.g * (1.0 - 2.0 * d.g)) : (sqrt(s.g) * (2.0 * d.g - 1.0) + 2.0 * s.g * (1.0 - d.g)),
        (s.b < 0.5) ? (2.0 * s.b * d.b + s.b * s.b * (1.0 - 2.0 * d.b)) : (sqrt(s.b) * (2.0 * d.b - 1.0) + 2.0 * s.b * (1.0 - d.b))
    );

    vec3 finalColor = mix(s, blended, 0.70);

    float edge = 0.0;
    if (ownerAt(centerIndex + vec2(1.0, 0.0)) != centerOwner ||
        ownerAt(centerIndex + vec2(-1.0, 0.0)) != centerOwner ||
        ownerAt(centerIndex + vec2(0.0, 1.0)) != centerOwner ||
        ownerAt(centerIndex + vec2(0.0, -1.0)) != centerOwner) {
        edge = 1.0;
    }
    finalColor *= (1.0 - edge * 0.28);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

console.log("GLSL check complete.");

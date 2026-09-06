import * as PIXI from 'pixi.js';
import { EventType, gameState } from '../game/GameState';
import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { worldLandMeshResource } from './WorldLandMeshResource';
import { PoliticalColorTexture } from './PoliticalColorTexture';

export class OwnershipRenderer {
  public container: PIXI.Container;
  private mesh!: PIXI.Mesh<PIXI.MeshGeometry, PIXI.Shader>;
  private colorTexture!: PoliticalColorTexture;
  private surface!: PoliticalSurfaceCache;

  constructor() {
    this.container = new PIXI.Container();
  }

  public async init(surface: PoliticalSurfaceCache, colorTexture: PoliticalColorTexture) {
    this.surface = surface;
    this.colorTexture = colorTexture;

    if (!worldLandMeshResource.geometry) {
        throw new Error("worldLandMeshResource not initialized before OwnershipRenderer.init()");
    }

    const vertexSrc = `
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

    const fragmentSrc = `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D uPoliticalColorTexture;
        
        void main() {
            vec4 c = texture2D(uPoliticalColorTexture, vUv);
            if (c.a < 0.01) {
                discard;
            }
            gl_FragColor = c;
        }
    `;

    // Sync is handled by DominionRenderer now

    const shader = PIXI.Shader.from({
        gl: { vertex: vertexSrc, fragment: fragmentSrc },
        resources: {
            uPoliticalColorTexture: this.colorTexture.source
        }
    });

    this.mesh = new PIXI.Mesh({
        geometry: worldLandMeshResource.geometry,
        shader: shader
    });

    this.mesh.blendMode = 'normal';
    this.container.addChild(this.mesh);
  }

  // Event update is handled by DominionRenderer now
}

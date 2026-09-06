import * as PIXI from 'pixi.js';

class WorldLandMeshResource {
    public geometry: PIXI.MeshGeometry | null = null;
    public vertexCount: number = 0;
    private initialized = false;

    public init(meshBuffer: ArrayBuffer) {
        if (this.initialized) return;

        const headerView = new DataView(meshBuffer);
        const magic = headerView.getUint32(0, true);
        if (magic !== 0x4D455348) {
            console.error('[WorldLandMeshResource] Invalid magic number for mesh. Expected 0x4D455348');
            return;
        }

        const version = headerView.getUint32(4, true);
        const vertexCount = headerView.getUint32(8, true);
        this.vertexCount = vertexCount;
        
        const vertexView = new Float32Array(meshBuffer, 16);
        const positions = new Float32Array(vertexCount * 2);
        const uvs = new Float32Array(vertexCount * 2);

        for (let i = 0; i < vertexCount; i++) {
            positions[i*2] = vertexView[i*4];
            positions[i*2+1] = vertexView[i*4+1];
            uvs[i*2] = vertexView[i*4+2];
            uvs[i*2+1] = vertexView[i*4+3];
        }

        const indices = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) indices[i] = i;

        this.geometry = new PIXI.MeshGeometry({
            positions,
            uvs,
            indices
        });
        
        this.initialized = true;
        console.log(`[WorldLandMeshResource] Initialized shared land mesh with ${vertexCount} vertices`);
    }
}

export const worldLandMeshResource = new WorldLandMeshResource();

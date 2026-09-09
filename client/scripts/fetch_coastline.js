import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import topojson from 'topojson-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';
const OUTPUT_PATH = path.join(__dirname, '../src/assets/coastline.json');

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 512;

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function projectPoint(lon, lat) {
  // Equirectangular projection mapping to 1024x512
  const x = ((lon + 180) / 360) * WORLD_WIDTH;
  const y = ((90 - lat) / 180) * WORLD_HEIGHT;
  return [parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2))];
}

function processPolygon(ring) {
  return ring.map(p => projectPoint(p[0], p[1]));
}

async function run() {
  console.log(`Downloading TopoJSON from ${URL}...`);
  const topology = await download(URL);
  
  console.log('Extracting land features...');
  // We use the countries feature collection. We can just merge them all into a single 'land' feature
  // but for Pixi it's easier to just extract all country polygons as separate polygons to render
  const geojson = topojson.feature(topology, topology.objects.countries);

  const polygons = [];

  for (const feature of geojson.features) {
    if (feature.geometry.type === 'Polygon') {
      const outerRing = feature.geometry.coordinates[0];
      polygons.push(processPolygon(outerRing));
    } else if (feature.geometry.type === 'MultiPolygon') {
      for (const poly of feature.geometry.coordinates) {
        const outerRing = poly[0];
        polygons.push(processPolygon(outerRing));
      }
    }
  }

  // Ensure the assets directory exists
  const assetsDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(polygons));
  console.log(`Successfully wrote ${polygons.length} polygons to ${OUTPUT_PATH}`);
}

run().catch(console.error);

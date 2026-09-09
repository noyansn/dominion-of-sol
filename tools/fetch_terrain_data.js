const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const SOURCES = {
    'ETOPO_2022': {
        url: 'https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc',
        file: 'ETOPO_2022_v1_60s_N90W180_surface.nc',
    },
    'ESA_CCI_2020': {
        url: 'https://dap.ceda.ac.uk/neodc/esacci/land_cover/data/land_cover_maps/v2.1.1/2020/ESACCI-LC-L4-LCCS-Map-300m-P1Y-2020-v2.1.1.nc',
        file: 'ESACCI-LC-L4-LCCS-Map-300m-P1Y-2020-v2.1.1.nc',
    }
};

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        let downloadedBytes = 0;
        let totalBytes = 0;

        if (fs.existsSync(dest)) {
            downloadedBytes = fs.statSync(dest).size;
        }

        const options = {};
        if (downloadedBytes > 0) {
            options.headers = { 'Range': `bytes=${downloadedBytes}-` };
        }

        const req = https.get(url, options, (res) => {
            if (res.statusCode === 416) {
                // Requested range not satisfiable -> likely already fully downloaded
                return resolve(dest);
            }
            if (res.statusCode === 302 || res.statusCode === 301) {
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200 && res.statusCode !== 206) {
                return reject(new Error(`Failed to download ${url} (HTTP ${res.statusCode})`));
            }

            totalBytes = downloadedBytes + parseInt(res.headers['content-length'] || '0', 10);
            
            const file = fs.createWriteStream(dest, { flags: downloadedBytes > 0 ? 'a' : 'w' });
            
            res.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                process.stdout.write(`\rDownloading ${path.basename(dest)}: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB / ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
            });

            res.pipe(file);

            file.on('finish', () => {
                console.log(); // newline
                file.close(resolve);
            });
        });

        req.on('error', (err) => {
            reject(err);
        });
    });
}

function computeHash(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(file);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function main() {
    console.log('--- FETCHING REAL TERRAIN DATA ---');
    let hasError = false;
    
    for (const [key, source] of Object.entries(SOURCES)) {
        const dest = path.join(dataDir, source.file);
        try {
            console.log(`Checking ${key}...`);
            await downloadFile(source.url, dest);
            
            console.log(`Computing SHA-256 for ${source.file}...`);
            const hash = await computeHash(dest);
            console.log(`Hash: ${hash}`);
            
            const metaPath = dest + '.meta.json';
            fs.writeFileSync(metaPath, JSON.stringify({
                source: key,
                url: source.url,
                file: source.file,
                size: fs.statSync(dest).size,
                sha256: hash,
                downloadedAt: new Date().toISOString()
            }, null, 2));
            
        } catch (e) {
            console.error(`\nError downloading ${key}: ${e.message}`);
            hasError = true;
        }
    }

    if (hasError) {
        console.error('\nREAL TERRAIN SOURCE UNAVAILABLE');
        process.exit(1);
    }
    
    console.log('\nAll real terrain sources downloaded successfully.');
}

main();

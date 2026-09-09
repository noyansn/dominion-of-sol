const WebSocket = require('ws');

console.log("Connecting...");
const ws = new WebSocket('ws://127.0.0.1:8765');

ws.on('open', () => {
    console.log("Connected. Sending player_join...");
    ws.send(JSON.stringify({
        type: "player_join",
        protocolVersion: "1.0.0",
        playerName: "Dominion Commander",
        token: "temp_token",
        flagId: "flag_sol"
    }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log("Received message type:", msg.type);
    if (msg.type === "world_snapshot") {
        let tick = msg.tick;
        let factions = msg.factions.length;
        let totalOwned = 0;
        let humanOwned = 0;
        let uniqueOwners = new Set();
        
        for (let cell of msg.cells) {
            let owner = cell.owner_id || cell.ownerId; // JS might parse it based on JSON keys
            if (owner !== 0 && owner !== undefined) {
                totalOwned++;
                uniqueOwners.add(owner);
                if (owner === msg.your_faction_id || owner === msg.yourFactionId) {
                    humanOwned++;
                }
            }
        }
        
        console.log(`First raw WS snapshot tick: ${tick}`);
        console.log(`First raw WS totalOwned: ${totalOwned}`);
        console.log(`First raw WS uniqueOwners: ${uniqueOwners.size}`);
        console.log(`First raw WS humanOwned: ${humanOwned}`);
        console.log(`First raw WS factions: ${factions}`);
        
        ws.close();
        process.exit(0);
    }
});

ws.on('error', console.error);
ws.on('close', () => console.log('closed'));

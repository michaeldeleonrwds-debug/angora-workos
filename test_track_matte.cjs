const { spawn } = require('child_process');

const CLI_PATH = 'C:\\Program Files\\EffectCraft\\effectcraft-cli.exe';
const cp = spawn(CLI_PATH, ['mcp', '--bridge', '9877']);

let reqId = 1;
const pending = new Map();
let buffer = '';

cp.stdout.on('data', data => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const msg = JSON.parse(line);
            if (msg.id && pending.has(msg.id)) {
                const resolver = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) resolver.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                else resolver.resolve(msg.result);
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    }
});

function call(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
        cp.stdin.write(payload);
    });
}

function tool(name, args = {}) {
    return call('tools/call', { name, arguments: args }).then(res => {
        if (res.isError) {
            const text = (res.content && res.content[0] && res.content[0].text) || 'Unknown tool error';
            throw new Error(text);
        }
        if (res.content && res.content[0] && res.content[0].text) {
            try { return JSON.parse(res.content[0].text); } catch { return res.content[0].text; }
        }
        return res;
    });
}

async function testTrackMatte() {
    console.log("Testing Track Matte in EffectCraft...");
    const layer1 = await tool('execute_command', {
        id: 'layer.newSolid',
        params: { name: 'TargetSolid', color: '#B0FF2A', width: 200, height: 200 }
    });
    const layer2 = await tool('execute_command', {
        id: 'layer.newSolid',
        params: { name: 'MatteSolid', color: '#FFFFFF', width: 200, height: 200 }
    });

    console.log("Target:", layer1, "Matte:", layer2);
    const tmRes = await tool('execute_command', {
        id: 'layer.setTrackMatte',
        params: { layer: layer1.layer, matte: layer2.layer, kind: 'alpha' }
    });
    console.log("Track matte result:", tmRes);

    await tool('execute_command', { id: 'edit.clear', params: { layers: [layer1.layer, layer2.layer] } });
    console.log("Cleaned up.");
    process.exit(0);
}

testTrackMatte().catch(err => {
    console.error(err);
    process.exit(1);
});

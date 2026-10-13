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

async function testMask() {
    const comp = await tool('get_comp');
    const compData = typeof comp === 'string' ? JSON.parse(comp) : comp;
    const layer = compData.layers.find(l => l.name.includes('angora_sym_tight'));

    console.log("Testing mask on layer:", layer.id);
    const maskRes = await tool('execute_command', {
        id: 'layer.addMask',
        params: { layer: layer.id, shape: 'rect', rect: [0, 0, 300, 490] }
    });
    console.log("Mask result:", maskRes);

    const layerInfo = await tool('get_layer', { layer: layer.id });
    console.log("Layer info with mask:", JSON.stringify(layerInfo, null, 2));

    process.exit(0);
}

testMask().catch(err => {
    console.error(err);
    process.exit(1);
});

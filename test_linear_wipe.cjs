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

async function testWipe() {
    console.log("Testing Linear Wipe in EffectCraft...");
    const comp = await tool('get_comp');
    console.log("Current comp:", comp.name);
    
    // Test creating a solid and applying linear wipe
    const solidRes = await tool('execute_command', {
        id: 'layer.newSolid',
        params: { name: 'TestWipeSolid', color: '#B0FF2A', width: 400, height: 400 }
    });
    console.log("Solid created:", solidRes);
    const layerId = solidRes.layer || solidRes.id;
    
    // Apply linear wipe
    const effectRes = await tool('execute_command', {
        id: 'effect.apply',
        params: { effect: 'Linear Wipe', layers: [layerId] }
    });
    console.log("Effect applied:", effectRes);

    const layerInfo = await tool('get_layer', { layer: layerId });
    console.log("Layer properties:");
    const effectProps = [];
    function scan(node) {
        if (node.path && node.path.includes('effects')) effectProps.push({ path: node.path, name: node.name, value: node.value });
        if (node.children) node.children.forEach(scan);
    }
    scan(layerInfo);
    console.log(JSON.stringify(effectProps, null, 2));

    // Remove test solid
    await tool('execute_command', { id: 'edit.clear', params: { layers: [layerId] } });
    console.log("Test solid cleaned up.");
    process.exit(0);
}

testWipe().catch(err => {
    console.error(err);
    process.exit(1);
});

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

async function testShape() {
    console.log("Testing Shape Layer and Trim Paths...");
    // 1. Create shape layer
    const shapeRes = await tool('execute_command', {
        id: 'layer.newShape',
        params: { kind: 'none', name: 'TestStroke' }
    });
    console.log("Shape layer created:", shapeRes);
    const layerId = shapeRes.layer || shapeRes.id;

    // 2. Add path item
    const pathItem = await tool('execute_command', {
        id: 'layer.addShapeItem',
        params: { layer: layerId, kind: 'path' }
    });
    console.log("Path item:", pathItem);

    // 3. Add stroke item
    const strokeItem = await tool('execute_command', {
        id: 'layer.addShapeItem',
        params: { layer: layerId, kind: 'stroke' }
    });
    console.log("Stroke item:", strokeItem);

    // 4. Add trim item
    const trimItem = await tool('execute_command', {
        id: 'layer.addShapeItem',
        params: { layer: layerId, kind: 'trim' }
    });
    console.log("Trim item:", trimItem);

    // Clean up
    await tool('execute_command', { id: 'edit.clear', params: { layers: [layerId] } });
    console.log("Cleaned up.");
    process.exit(0);
}

testShape().catch(err => {
    console.error(err);
    process.exit(1);
});

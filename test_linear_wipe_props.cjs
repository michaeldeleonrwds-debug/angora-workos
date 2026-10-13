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

async function testProps() {
    const solidRes = await tool('execute_command', {
        id: 'layer.newSolid',
        params: { name: 'TestWipeSolid', color: '#B0FF2A', width: 400, height: 400 }
    });
    const layerId = solidRes.layer || solidRes.id;
    await tool('execute_command', {
        id: 'effect.apply',
        params: { effect: 'Linear Wipe', layers: [layerId] }
    });

    const completionProp = await tool('get_property', { layer: layerId, path: 'effects/#1/completion' });
    console.log("completion prop:", completionProp);

    const angleProp = await tool('get_property', { layer: layerId, path: 'effects/#1/angle' });
    console.log("angle prop:", angleProp);

    const featherProp = await tool('get_property', { layer: layerId, path: 'effects/#1/feather' });
    console.log("feather prop:", featherProp);

    await tool('execute_command', { id: 'edit.clear', params: { layers: [layerId] } });
    process.exit(0);
}

testProps().catch(err => {
    console.error(err);
    process.exit(1);
});

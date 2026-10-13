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

async function testWipeAngle() {
    // Create new test comp
    const compRes = await tool('execute_command', {
        id: 'comp.new',
        params: {
            name: 'WipeTestComp',
            width: 1920,
            height: 1080,
            frameRate: 30,
            duration: 5.0,
            background: '#041209'
        }
    });
    console.log("Comp created:", compRes);

    // Import tight symbol
    const impRes = await tool('execute_command', {
        id: 'file.import',
        params: {
            paths: ['C:\\Users\\REYMARK\\Documents\\Sites\\angora\\angora_sym_tight.png'],
            addToComp: true
        }
    });
    console.log("Imported:", impRes);

    // Get layer
    const comp = await tool('get_comp');
    console.log("Comp layers count:", comp.layers ? comp.layers.length : 0);
    const layer = comp.layers[0];
    console.log("Logo layer ID:", layer.id);

    // Apply Linear Wipe
    const effRes = await tool('execute_command', {
        id: 'effect.apply',
        params: { effect: 'Linear Wipe', layers: [layer.id] }
    });
    console.log("Effect applied:", effRes);

    // Set completion to 50, feather to 20, angle to 90
    await tool('set_property', { layer: layer.id, path: 'effects/#1/completion', value: 50 });
    await tool('set_property', { layer: layer.id, path: 'effects/#1/feather', value: 20 });
    await tool('set_property', { layer: layer.id, path: 'effects/#1/angle', value: 90 });

    const preview = await tool('render_preview', { time: 0 });
    console.log("Preview rendered at angle 90:", preview);

    process.exit(0);
}

testWipeAngle().catch(err => {
    console.error(err);
    process.exit(1);
});

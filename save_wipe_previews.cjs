const fs = require('fs');
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
        return res;
    });
}

async function savePreview(angle, filename) {
    const comp = await tool('get_comp');
    const compData = JSON.parse(comp.content[0].text);
    const layer = compData.layers.find(l => l.name.includes('angora_sym_tight'));
    
    await tool('set_property', { layer: layer.id, path: 'effects/#1/angle', value: angle });
    await tool('set_property', { layer: layer.id, path: 'effects/#1/completion', value: 50 });
    await tool('set_property', { layer: layer.id, path: 'effects/#1/feather', value: 10 });
    
    const preview = await tool('render_preview', { time: 0 });
    for (const c of preview.content) {
        if (c.data && c.mimeType === 'image/png') {
            fs.writeFileSync(filename, Buffer.from(c.data, 'base64'));
            console.log(`Saved ${filename}`);
            break;
        }
    }
}

async function run() {
    await savePreview(90, 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\wipe_90.png');
    await savePreview(0, 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\wipe_0.png');
    await savePreview(45, 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\wipe_45.png');
    await savePreview(135, 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\wipe_135.png');
    await savePreview(270, 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\wipe_270.png');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

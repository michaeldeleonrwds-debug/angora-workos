const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
                if (msg.error) {
                    resolver.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                } else {
                    resolver.resolve(msg.result);
                }
            }
        } catch (e) {
            console.error('Parse error:', e, line);
        }
    }
});

cp.stderr.on('data', d => console.error('[CLI stderr]:', d.toString()));

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
            try {
                return JSON.parse(res.content[0].text);
            } catch {
                return res.content[0].text;
            }
        }
        return res;
    });
}

function cmd(id, params = {}) {
    return tool('command_run', { id, params });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    console.log('--- Initializing MCP Client ---');
    await call('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'motion-builder', version: '1.0' }
    });
    console.log('MCP Initialized.');

    console.log('--- Starting New Project ---');
    await tool('open_project', { new: true });

    console.log('--- Creating Composition: 1920x1080 @ 30 FPS, 10s, #0B1120 ---');
    const compRes = await cmd('comp.new', {
        name: 'Modern Motion Graphics',
        width: 1920,
        height: 1080,
        frameRate: 30,
        duration: 10.0,
        background: '#0B1120'
    });
    const compId = compRes.comp || 1;
    console.log('Created Comp ID:', compId);

    await cmd('comp.open', { comp: compId });
    await cmd('comp.setSwitch', { switch: 'motionBlur', value: true });

    console.log('--- Creating Background Solid ---');
    await cmd('layer.newSolid', {
        name: 'BG - Dark Navy #0B1120',
        color: '#0B1120',
        width: 1920,
        height: 1080
    });

    // Helper for adding and easing keys
    async function addKey(layer, path, time, value, easeIn = 75, easeOut = 75) {
        await cmd('prop.addKey', { layer, path, time, value });
        if (easeIn !== null) {
            await cmd('keys.setEase', { layer, path, time, side: 'in', influence: easeIn }).catch(() => {});
        }
        if (easeOut !== null) {
            await cmd('keys.setEase', { layer, path, time, side: 'out', influence: easeOut }).catch(() => {});
        }
    }

    console.log('--- Creating Geometric Accent Ring (0–4s) ---');
    const ring = await cmd('layer.newShape', {
        kind: 'ellipse',
        name: 'Accent Ring - Orbit',
        size: [240, 240],
        stroke: '#FF7C00',
        strokeWidth: 2,
        fill: false,
        position: [960, 340]
    });
    const ringId = ring.layer;
    await cmd('layer.setSwitch', { layers: [ringId], switch: 'motionBlur', value: true });

    // Ring Keyframes
    await addKey(ringId, 'transform/scale', 2.0, [40, 40, 100], 70, 70);
    await addKey(ringId, 'transform/scale', 3.6, [100, 100, 100], 70, 70);
    await addKey(ringId, 'transform/scale', 8.6, [100, 100, 100], 70, 70);
    await addKey(ringId, 'transform/scale', 9.5, [130, 130, 100], 70, 70);

    await addKey(ringId, 'transform/rotation', 2.0, 0, 70, 70);
    await addKey(ringId, 'transform/rotation', 3.6, 90, 70, 70);
    await addKey(ringId, 'transform/rotation', 8.6, 90, 70, 70);
    await addKey(ringId, 'transform/rotation', 9.5, 180, 70, 70);

    await addKey(ringId, 'transform/opacity', 2.0, 0, 70, 70);
    await addKey(ringId, 'transform/opacity', 2.6, 45, 70, 70);
    await addKey(ringId, 'transform/opacity', 8.6, 45, 70, 70);
    await addKey(ringId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- Creating Circle 1: Vibrant Orange (#FF7C00) ---');
    const c1 = await cmd('layer.newShape', {
        kind: 'ellipse',
        name: 'Circle 1 - Orange #FF7C00',
        size: [250, 250],
        fill: '#FF7C00',
        position: [-220, 1150]
    });
    const c1Id = c1.layer;
    await cmd('layer.setSwitch', { layers: [c1Id], switch: 'motionBlur', value: true });

    // Circle 1 Keyframes (0–2s entry, 2–4s geometric transform, 8–10s exit)
    await addKey(c1Id, 'transform/position', 0.0, [-220, 1150], 75, 75);
    await addKey(c1Id, 'transform/position', 1.8, [780, 480], 75, 75);
    await addKey(c1Id, 'transform/position', 2.0, [780, 480], 70, 70);
    await addKey(c1Id, 'transform/position', 3.8, [670, 370], 75, 75);
    await addKey(c1Id, 'transform/position', 8.6, [670, 370], 70, 70);
    await addKey(c1Id, 'transform/position', 9.6, [470, 270], 75, 75);

    await addKey(c1Id, 'transform/scale', 0.0, [40, 40, 100], 70, 70);
    await addKey(c1Id, 'transform/scale', 1.8, [100, 100, 100], 75, 75);
    await addKey(c1Id, 'transform/scale', 2.0, [100, 100, 100], 70, 70);
    await addKey(c1Id, 'transform/scale', 3.8, [85, 85, 100], 75, 75);
    await addKey(c1Id, 'transform/scale', 8.6, [85, 85, 100], 70, 70);
    await addKey(c1Id, 'transform/scale', 9.6, [0, 0, 100], 75, 75);

    await addKey(c1Id, 'transform/rotation', 2.0, 0, 70, 70);
    await addKey(c1Id, 'transform/rotation', 3.8, 45, 75, 75);
    await addKey(c1Id, 'transform/rotation', 8.6, 45, 70, 70);
    await addKey(c1Id, 'transform/rotation', 9.6, 90, 75, 75);

    await addKey(c1Id, 'transform/opacity', 0.0, 0, 70, 70);
    await addKey(c1Id, 'transform/opacity', 0.4, 100, 70, 70);
    await addKey(c1Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(c1Id, 'transform/opacity', 9.6, 0, 70, 70);

    console.log('--- Creating Circle 2: Warm Amber (#FF9828) ---');
    const c2 = await cmd('layer.newShape', {
        kind: 'ellipse',
        name: 'Circle 2 - Amber #FF9828',
        size: [180, 180],
        fill: '#FF9828',
        position: [2150, -100]
    });
    const c2Id = c2.layer;
    await cmd('layer.setSwitch', { layers: [c2Id], switch: 'motionBlur', value: true });

    // Circle 2 Keyframes
    await addKey(c2Id, 'transform/position', 0.2, [2150, -100], 75, 75);
    await addKey(c2Id, 'transform/position', 2.0, [1140, 440], 75, 75);
    await addKey(c2Id, 'transform/position', 2.2, [1140, 440], 70, 70);
    await addKey(c2Id, 'transform/position', 3.8, [1250, 350], 75, 75);
    await addKey(c2Id, 'transform/position', 8.6, [1250, 350], 70, 70);
    await addKey(c2Id, 'transform/position', 9.6, [1450, 250], 75, 75);

    await addKey(c2Id, 'transform/scale', 0.2, [30, 30, 100], 70, 70);
    await addKey(c2Id, 'transform/scale', 2.0, [100, 100, 100], 75, 75);
    await addKey(c2Id, 'transform/scale', 2.2, [100, 100, 100], 70, 70);
    await addKey(c2Id, 'transform/scale', 3.8, [90, 90, 100], 75, 75);
    await addKey(c2Id, 'transform/scale', 8.6, [90, 90, 100], 70, 70);
    await addKey(c2Id, 'transform/scale', 9.6, [0, 0, 100], 75, 75);

    await addKey(c2Id, 'transform/rotation', 2.2, 0, 70, 70);
    await addKey(c2Id, 'transform/rotation', 3.8, -35, 75, 75);
    await addKey(c2Id, 'transform/rotation', 8.6, -35, 70, 70);
    await addKey(c2Id, 'transform/rotation', 9.6, -70, 75, 75);

    await addKey(c2Id, 'transform/opacity', 0.2, 0, 70, 70);
    await addKey(c2Id, 'transform/opacity', 0.6, 100, 70, 70);
    await addKey(c2Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(c2Id, 'transform/opacity', 9.6, 0, 70, 70);

    console.log('--- Creating Circle 3: Crisp White (#FFFFFF) ---');
    const c3 = await cmd('layer.newShape', {
        kind: 'ellipse',
        name: 'Circle 3 - White #FFFFFF',
        size: [88, 88],
        fill: '#FFFFFF',
        position: [960, 1250]
    });
    const c3Id = c3.layer;
    await cmd('layer.setSwitch', { layers: [c3Id], switch: 'motionBlur', value: true });

    // Circle 3 Keyframes
    await addKey(c3Id, 'transform/position', 0.4, [960, 1250], 75, 75);
    await addKey(c3Id, 'transform/position', 2.0, [960, 580], 75, 75);
    await addKey(c3Id, 'transform/position', 2.2, [960, 580], 70, 70);
    await addKey(c3Id, 'transform/position', 3.8, [960, 290], 75, 75);
    await addKey(c3Id, 'transform/position', 8.6, [960, 290], 70, 70);
    await addKey(c3Id, 'transform/position', 9.6, [960, 180], 75, 75);

    await addKey(c3Id, 'transform/scale', 0.4, [25, 25, 100], 70, 70);
    await addKey(c3Id, 'transform/scale', 2.0, [100, 100, 100], 75, 75);
    await addKey(c3Id, 'transform/scale', 2.2, [100, 100, 100], 70, 70);
    await addKey(c3Id, 'transform/scale', 3.8, [65, 65, 100], 75, 75);
    await addKey(c3Id, 'transform/scale', 8.6, [65, 65, 100], 70, 70);
    await addKey(c3Id, 'transform/scale', 9.6, [0, 0, 100], 75, 75);

    await addKey(c3Id, 'transform/opacity', 0.4, 0, 70, 70);
    await addKey(c3Id, 'transform/opacity', 0.8, 100, 70, 70);
    await addKey(c3Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(c3Id, 'transform/opacity', 9.6, 0, 70, 70);

    console.log('--- Creating Headline Text Layers (4–6s) ---');
    // Word 1: CREATE
    const w1 = await cmd('layer.newText', {
        text: 'CREATE',
        name: 'Headline - CREATE',
        font: 'Segoe UI',
        style: 'Bold',
        size: 82,
        fill: '#FFFFFF',
        position: [620, 560]
    });
    const w1Id = w1.layer;
    await cmd('layer.setSwitch', { layers: [w1Id], switch: 'motionBlur', value: true });

    await addKey(w1Id, 'transform/position', 4.0, [620, 560], 75, 75);
    await addKey(w1Id, 'transform/position', 4.6, [620, 505], 75, 75);
    await addKey(w1Id, 'transform/position', 8.6, [620, 505], 70, 70);
    await addKey(w1Id, 'transform/position', 9.3, [620, 475], 75, 75);

    await addKey(w1Id, 'transform/opacity', 4.0, 0, 70, 70);
    await addKey(w1Id, 'transform/opacity', 4.6, 100, 70, 70);
    await addKey(w1Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(w1Id, 'transform/opacity', 9.3, 0, 70, 70);

    // Word 2: WITHOUT
    const w2 = await cmd('layer.newText', {
        text: 'WITHOUT',
        name: 'Headline - WITHOUT',
        font: 'Segoe UI',
        style: 'Bold',
        size: 82,
        fill: '#FFFFFF',
        position: [960, 560]
    });
    const w2Id = w2.layer;
    await cmd('layer.setSwitch', { layers: [w2Id], switch: 'motionBlur', value: true });

    await addKey(w2Id, 'transform/position', 4.2, [960, 560], 75, 75);
    await addKey(w2Id, 'transform/position', 4.8, [960, 505], 75, 75);
    await addKey(w2Id, 'transform/position', 8.6, [960, 505], 70, 70);
    await addKey(w2Id, 'transform/position', 9.3, [960, 475], 75, 75);

    await addKey(w2Id, 'transform/opacity', 4.2, 0, 70, 70);
    await addKey(w2Id, 'transform/opacity', 4.8, 100, 70, 70);
    await addKey(w2Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(w2Id, 'transform/opacity', 9.3, 0, 70, 70);

    // Word 3: LIMITS
    const w3 = await cmd('layer.newText', {
        text: 'LIMITS',
        name: 'Headline - LIMITS',
        font: 'Segoe UI',
        style: 'Bold',
        size: 82,
        fill: '#FFFFFF',
        position: [1300, 560]
    });
    const w3Id = w3.layer;
    await cmd('layer.setSwitch', { layers: [w3Id], switch: 'motionBlur', value: true });

    await addKey(w3Id, 'transform/position', 4.4, [1300, 560], 75, 75);
    await addKey(w3Id, 'transform/position', 5.0, [1300, 505], 75, 75);
    await addKey(w3Id, 'transform/position', 8.6, [1300, 505], 70, 70);
    await addKey(w3Id, 'transform/position', 9.3, [1300, 475], 75, 75);

    await addKey(w3Id, 'transform/opacity', 4.4, 0, 70, 70);
    await addKey(w3Id, 'transform/opacity', 5.0, 100, 70, 70);
    await addKey(w3Id, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(w3Id, 'transform/opacity', 9.3, 0, 70, 70);

    console.log('--- Creating Expanding Orange Underline (4.6–5.4s) ---');
    const underline = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Orange Underline',
        size: [760, 4],
        fill: '#FF7C00',
        position: [580, 560]
    });
    const lineId = underline.layer;
    // Set anchor point to left edge: [-380, 0] so scale X expands from left to right!
    await cmd('prop.set', { layer: lineId, path: 'transform/anchor', value: [-380, 0, 0] });
    await cmd('prop.set', { layer: lineId, path: 'transform/position', value: [580, 560, 0] });
    await cmd('layer.setSwitch', { layers: [lineId], switch: 'motionBlur', value: true });

    // Underline scale X: 0% -> 100%
    await addKey(lineId, 'transform/scale', 4.6, [0, 100, 100], 75, 75);
    await addKey(lineId, 'transform/scale', 5.4, [100, 100, 100], 75, 75);
    await addKey(lineId, 'transform/scale', 8.6, [100, 100, 100], 70, 70);
    await addKey(lineId, 'transform/scale', 9.3, [0, 100, 100], 75, 75);

    await addKey(lineId, 'transform/opacity', 4.6, 0, 70, 70);
    await addKey(lineId, 'transform/opacity', 4.8, 100, 70, 70);
    await addKey(lineId, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(lineId, 'transform/opacity', 9.3, 0, 70, 70);

    console.log('--- Creating Subtitle: "Design. Animate. Inspire." (6–8s) ---');
    const sub = await cmd('layer.newText', {
        text: 'Design. Animate. Inspire.',
        name: 'Subtitle - Design Animate Inspire',
        font: 'Segoe UI',
        style: 'Regular',
        size: 32,
        fill: '#CBD5E1',
        position: [960, 640],
        tracking: 160
    });
    const subId = sub.layer;
    await cmd('layer.setSwitch', { layers: [subId], switch: 'motionBlur', value: true });

    await addKey(subId, 'transform/position', 6.0, [960, 645], 75, 75);
    await addKey(subId, 'transform/position', 6.8, [960, 625], 75, 75);
    await addKey(subId, 'transform/position', 8.6, [960, 625], 70, 70);
    await addKey(subId, 'transform/position', 9.4, [960, 600], 75, 75);

    await addKey(subId, 'transform/opacity', 6.0, 0, 70, 70);
    await addKey(subId, 'transform/opacity', 6.8, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 8.6, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- Moving Playhead to 5.2s (Peak Showcase) ---');
    await cmd('time.set', { time: 5.2 });

    console.log('--- Saving Project File ---');
    const projectPath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\Modern_Motion_Graphics.ecproj';
    await tool('save_project', { path: projectPath });
    console.log('Saved project to:', projectPath);

    console.log('--- Rendering Preview Frame ---');
    const previewPath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\preview_hero_5.2s.png';
    await tool('render_frame', { comp: compId, time: 5.2, max_side: 1920, path: previewPath });
    console.log('Rendered hero preview frame to:', previewPath);

    console.log('--- Rendering Animation Sequences (1.5s, 3.5s, 7.0s) ---');
    await tool('render_frame', { comp: compId, time: 1.5, max_side: 960, path: 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\preview_circles_1.5s.png' });
    await tool('render_frame', { comp: compId, time: 3.5, max_side: 960, path: 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\preview_transform_3.5s.png' });
    await tool('render_frame', { comp: compId, time: 7.0, max_side: 960, path: 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\preview_subtitle_7.0s.png' });

    console.log('=== All Animation Elements Built Successfully! ===');
    cp.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('Execution Error:', err);
    cp.kill();
    process.exit(1);
});

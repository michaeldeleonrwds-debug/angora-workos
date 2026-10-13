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

async function addKey(layer, path, time, value, easeIn = 75, easeOut = 75) {
    await cmd('prop.addKey', { layer, path, time, value });
    if (easeIn !== null) {
        await cmd('keys.setEase', { layer, path, time, side: 'in', influence: easeIn }).catch(() => {});
    }
    if (easeOut !== null) {
        await cmd('keys.setEase', { layer, path, time, side: 'out', influence: easeOut }).catch(() => {});
    }
}

async function run() {
    console.log('--- Connecting to EffectCraft Live Bridge ---');
    await call('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'dissect-animator', version: '1.0' }
    });
    console.log('Bridge Initialized.');

    console.log('--- Initializing Fresh Clean Composition ---');
    await tool('open_project', { new: true });

    const compRes = await cmd('comp.new', {
        name: 'Angora - Dissected Brand Motion',
        width: 1080,
        height: 1080,
        frameRate: 30,
        duration: 10.0,
        background: '#060F0A'
    });
    const compId = compRes.comp || 1;
    await cmd('comp.open', { comp: compId });
    await cmd('comp.setSwitch', { switch: 'motionBlur', value: true });

    console.log('--- 1. Pure Obsidian Deep Dark Background Solid ---');
    await cmd('layer.newSolid', {
        name: 'BG - Deep Obsidian #060F0A',
        color: '#060F0A',
        width: 1080,
        height: 1080
    });

    console.log('--- 2. Minimalist Precision Corner Brackets ---');
    const corners = [
        { name: 'Bracket - Top Left', pos: [110, 110] },
        { name: 'Bracket - Top Right', pos: [970, 110] },
        { name: 'Bracket - Bottom Right', pos: [970, 970] },
        { name: 'Bracket - Bottom Left', pos: [110, 970] }
    ];

    for (const c of corners) {
        const hArm = await cmd('layer.newShape', {
            kind: 'rect',
            name: `${c.name} H`,
            size: [24, 2],
            fill: '#B0FF2A',
            position: c.pos
        });
        const hId = hArm.layer;
        await addKey(hId, 'transform/opacity', 0.4, 0, 70, 70);
        await addKey(hId, 'transform/opacity', 1.2, 80, 70, 70);
        await addKey(hId, 'transform/opacity', 8.8, 80, 70, 70);
        await addKey(hId, 'transform/opacity', 9.6, 0, 70, 70);

        const vArm = await cmd('layer.newShape', {
            kind: 'rect',
            name: `${c.name} V`,
            size: [2, 24],
            fill: '#B0FF2A',
            position: c.pos
        });
        const vId = vArm.layer;
        await addKey(vId, 'transform/opacity', 0.4, 0, 70, 70);
        await addKey(vId, 'transform/opacity', 1.2, 80, 70, 70);
        await addKey(vId, 'transform/opacity', 8.8, 80, 70, 70);
        await addKey(vId, 'transform/opacity', 9.6, 0, 70, 70);
    }

    console.log('--- 3. Importing Dissected Logo Assets ---');
    const framePath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\angora_frame_clean.png';
    const wavePath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\angora_wave_clean.png';

    const importFrame = await cmd('file.import', { paths: [framePath] });
    const frameItemId = importFrame.items[0];

    const importWave = await cmd('file.import', { paths: [wavePath] });
    const waveItemId = importWave.items[0];

    console.log('--- 4. Animating Element 1: The Chevron Frame of "A" ---');
    // Layer 1: Frame of the A (left and right legs)
    const frameLayerRes = await cmd('layer.addItem', { item: frameItemId });
    const frameLayerId = frameLayerRes.layer;
    await cmd('layer.setSwitch', { layers: [frameLayerId], switch: 'motionBlur', value: true });

    // Anchor point center of the A symbol
    await cmd('prop.set', { layer: frameLayerId, path: 'transform/anchor', value: [500, 448, 0] });

    // Frame motion:
    // Starts with a dynamic rising and unfolding expansion (0.6s to 2.0s)
    await addKey(frameLayerId, 'transform/position', 0.6, [540, 440], 80, 80);
    await addKey(frameLayerId, 'transform/position', 2.0, [540, 385], 80, 80);
    await addKey(frameLayerId, 'transform/position', 5.5, [540, 377], 60, 60);
    await addKey(frameLayerId, 'transform/position', 8.8, [540, 385], 70, 70);
    await addKey(frameLayerId, 'transform/position', 9.6, [540, 345], 80, 80);

    // Dynamic scale: unfolds vertically and springs outward
    await addKey(frameLayerId, 'transform/scale', 0.6, [70, 0, 100], 80, 80);
    await addKey(frameLayerId, 'transform/scale', 1.8, [92, 92, 100], 80, 80);
    await addKey(frameLayerId, 'transform/scale', 2.2, [86, 86, 100], 75, 75);
    await addKey(frameLayerId, 'transform/scale', 8.8, [86, 86, 100], 70, 70);
    await addKey(frameLayerId, 'transform/scale', 9.6, [0, 0, 100], 80, 80);

    await addKey(frameLayerId, 'transform/opacity', 0.6, 0, 75, 75);
    await addKey(frameLayerId, 'transform/opacity', 1.6, 100, 75, 75);
    await addKey(frameLayerId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(frameLayerId, 'transform/opacity', 9.6, 0, 75, 75);

    console.log('--- 5. Animating Element 2: The Flowing Wave Ribbon ---');
    // Layer 2: The dynamic wave ribbon crossbar
    const waveLayerRes = await cmd('layer.addItem', { item: waveItemId });
    const waveLayerId = waveLayerRes.layer;
    await cmd('layer.setSwitch', { layers: [waveLayerId], switch: 'motionBlur', value: true });

    // Anchor point centered on the wave origin
    await cmd('prop.set', { layer: waveLayerId, path: 'transform/anchor', value: [500, 448, 0] });

    // Wave Ribbon Motion:
    // Follows right after the frame: sweeps in from the left and dynamically unrolls across the A (1.4s to 2.6s)
    await addKey(waveLayerId, 'transform/position', 1.4, [510, 395], 80, 80);
    await addKey(waveLayerId, 'transform/position', 2.5, [540, 385], 80, 80);
    await addKey(waveLayerId, 'transform/position', 5.5, [540, 377], 60, 60);
    await addKey(waveLayerId, 'transform/position', 8.8, [540, 385], 70, 70);
    await addKey(waveLayerId, 'transform/position', 9.6, [540, 345], 80, 80);

    // Unrolls along X with elastic wave flex
    await addKey(waveLayerId, 'transform/scale', 1.4, [0, 86, 100], 80, 80);
    await addKey(waveLayerId, 'transform/scale', 2.3, [94, 86, 100], 80, 80);
    await addKey(waveLayerId, 'transform/scale', 2.7, [86, 86, 100], 75, 75);
    await addKey(waveLayerId, 'transform/scale', 8.8, [86, 86, 100], 70, 70);
    await addKey(waveLayerId, 'transform/scale', 9.6, [0, 0, 100], 80, 80);

    // Elastic rotation flex during the sweep
    await addKey(waveLayerId, 'transform/rotation', 1.4, -10, 75, 75);
    await addKey(waveLayerId, 'transform/rotation', 2.4, 2, 75, 75);
    await addKey(waveLayerId, 'transform/rotation', 2.8, 0, 75, 75);
    await addKey(waveLayerId, 'transform/rotation', 8.8, 0, 70, 70);
    await addKey(waveLayerId, 'transform/rotation', 9.6, 10, 75, 75);

    await addKey(waveLayerId, 'transform/opacity', 1.4, 0, 75, 75);
    await addKey(waveLayerId, 'transform/opacity', 2.2, 100, 75, 75);
    await addKey(waveLayerId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(waveLayerId, 'transform/opacity', 9.6, 0, 75, 75);

    console.log('--- 6. Shimmer Specular Light Beam on the Assembled Logo ---');
    // Subtle 45-degree light streak that glides across the logo at t=2.6s - 3.4s
    const shineBeam = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Specular Shimmer',
        size: [8, 260],
        fill: '#FFFFFF',
        position: [380, 385]
    });
    const shineId = shineBeam.layer;
    await cmd('prop.set', { layer: shineId, path: 'transform/rotation', value: 35 });
    await cmd('layer.setSwitch', { layers: [shineId], switch: 'motionBlur', value: true });

    await addKey(shineId, 'transform/position', 2.6, [360, 385], 75, 75);
    await addKey(shineId, 'transform/position', 3.4, [720, 385], 75, 75);
    await addKey(shineId, 'transform/opacity', 2.6, 0, 70, 70);
    await addKey(shineId, 'transform/opacity', 2.8, 55, 70, 70);
    await addKey(shineId, 'transform/opacity', 3.2, 55, 70, 70);
    await addKey(shineId, 'transform/opacity', 3.4, 0, 70, 70);

    console.log('--- 7. Kinetic Typography: "A N G O R A" ---');
    const wordmark = await cmd('layer.newText', {
        text: 'ANGORA',
        name: 'Wordmark - ANGORA',
        font: 'Poppins',
        style: 'Bold',
        size: 74,
        fill: '#FFFFFF',
        tracking: 360,
        position: [540, 705]
    });
    const wmId = wordmark.layer;
    await cmd('layer.setSwitch', { layers: [wmId], switch: 'motionBlur', value: true });

    await addKey(wmId, 'transform/position', 2.4, [540, 750], 80, 80);
    await addKey(wmId, 'transform/position', 3.4, [540, 705], 80, 80);
    await addKey(wmId, 'transform/position', 8.8, [540, 705], 70, 70);
    await addKey(wmId, 'transform/position', 9.5, [540, 675], 80, 80);

    await addKey(wmId, 'transform/opacity', 2.4, 0, 75, 75);
    await addKey(wmId, 'transform/opacity', 3.4, 100, 75, 75);
    await addKey(wmId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wmId, 'transform/opacity', 9.5, 0, 75, 75);

    console.log('--- 8. Brand Lime Accent Rule & Anchor Nodes ---');
    const limeRule = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Brand Lime Rule #B0FF2A',
        size: [520, 2.5],
        fill: '#B0FF2A',
        position: [540, 755]
    });
    const lrId = limeRule.layer;
    await cmd('layer.setSwitch', { layers: [lrId], switch: 'motionBlur', value: true });

    await addKey(lrId, 'transform/scale', 3.0, [0, 100, 100], 80, 80);
    await addKey(lrId, 'transform/scale', 4.0, [100, 100, 100], 80, 80);
    await addKey(lrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(lrId, 'transform/scale', 9.4, [0, 100, 100], 80, 80);

    await addKey(lrId, 'transform/opacity', 3.0, 0, 70, 70);
    await addKey(lrId, 'transform/opacity', 3.4, 100, 70, 70);
    await addKey(lrId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(lrId, 'transform/opacity', 9.4, 0, 70, 70);

    // Left Diamond Anchor
    const nl = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Left',
        size: [7, 7],
        fill: '#B0FF2A',
        position: [280, 755]
    });
    const nlId = nl.layer;
    await cmd('prop.set', { layer: nlId, path: 'transform/rotation', value: 45 });
    await addKey(nlId, 'transform/scale', 3.6, [0, 0, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 4.1, [100, 100, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nlId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    // Right Diamond Anchor
    const nr = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Right',
        size: [7, 7],
        fill: '#B0FF2A',
        position: [800, 755]
    });
    const nrId = nr.layer;
    await cmd('prop.set', { layer: nrId, path: 'transform/rotation', value: 45 });
    await addKey(nrId, 'transform/scale', 3.6, [0, 0, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 4.1, [100, 100, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nrId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    console.log('--- 9. Specialization Subtitle: "WEB DEVELOPMENT & DESIGN SERVICES" ---');
    const subtitle = await cmd('layer.newText', {
        text: 'WEB DEVELOPMENT & DESIGN SERVICES',
        name: 'Subtitle - Core Specialization',
        font: 'Poppins',
        style: 'SemiBold',
        size: 18,
        fill: '#A3E635',
        tracking: 230,
        position: [540, 805]
    });
    const subId = subtitle.layer;
    await cmd('layer.setSwitch', { layers: [subId], switch: 'motionBlur', value: true });

    await addKey(subId, 'transform/position', 3.6, [540, 825], 75, 75);
    await addKey(subId, 'transform/position', 4.6, [540, 805], 75, 75);
    await addKey(subId, 'transform/position', 8.8, [540, 805], 70, 70);
    await addKey(subId, 'transform/position', 9.5, [540, 785], 75, 75);

    await addKey(subId, 'transform/opacity', 3.6, 0, 70, 70);
    await addKey(subId, 'transform/opacity', 4.6, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 10. Creative Capabilities Pill Badge ---');
    const badge = await cmd('layer.newText', {
        text: 'FULL-STACK  •  UI/UX  •  CREATIVE DIRECTION  •  MOTION',
        name: 'Badge - Capabilities',
        font: 'Poppins',
        style: 'Medium',
        size: 11,
        fill: '#64748B',
        tracking: 200,
        position: [540, 850]
    });
    const badgeId = badge.layer;
    await addKey(badgeId, 'transform/opacity', 4.4, 0, 70, 70);
    await addKey(badgeId, 'transform/opacity', 5.4, 85, 70, 70);
    await addKey(badgeId, 'transform/opacity', 8.8, 85, 70, 70);
    await addKey(badgeId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- 11. Setting Playhead to 5.4s (Peak View) ---');
    await cmd('time.set', { time: 5.4 });

    console.log('--- 12. Saving Project File ---');
    const projPath = 'C:\\Users\\REYMARK\\Desktop\\Angora_Dissected_Motion_Design.ecproj';
    await tool('save_project', { path: projPath });
    console.log('Saved project to:', projPath);

    console.log('--- 13. Rendering Preview Frame ---');
    const previewHero = 'C:\\Users\\REYMARK\\Desktop\\preview_angora_dissected_hero.png';
    await tool('render_frame', { comp: compId, time: 5.4, max_side: 1080, path: previewHero });
    console.log('Hero frame rendered to Desktop:', previewHero);

    console.log('=== Dissected Motion Design Complete! ===');
    cp.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('Error during dissected animation build:', err);
    cp.kill();
    process.exit(1);
});

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
        clientInfo: { name: 'angora-animator', version: '1.0' }
    });
    console.log('Bridge Initialized.');

    console.log('--- Resetting Composition to Clean Slate ---');
    // Start fresh project to ensure 100% clean timeline
    await tool('open_project', { new: true });

    // Create 1080x1080 composition
    const compRes = await cmd('comp.new', {
        name: 'Angora - Brand Motion Design',
        width: 1080,
        height: 1080,
        frameRate: 30,
        duration: 10.0,
        background: '#060F0A' // Deep luxury dark forest-navy
    });
    const compId = compRes.comp || 1;
    await cmd('comp.open', { comp: compId });
    await cmd('comp.setSwitch', { switch: 'motionBlur', value: true });

    console.log('--- 1. Background Solid (Deep Dark Obsidian Green) ---');
    await cmd('layer.newSolid', {
        name: 'BG - Obsidian Dark #060F0A',
        color: '#060F0A',
        width: 1080,
        height: 1080
    });

    console.log('--- 2. Architectural Grid & Corner Brackets ---');
    // Horizontal center axis
    const axisH = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Grid - Horizontal Axis',
        size: [900, 1],
        fill: '#152A1C',
        position: [540, 540]
    });
    const axisHId = axisH.layer;
    await addKey(axisHId, 'transform/opacity', 0.2, 0, 70, 70);
    await addKey(axisHId, 'transform/opacity', 1.2, 35, 70, 70);
    await addKey(axisHId, 'transform/opacity', 8.8, 35, 70, 70);
    await addKey(axisHId, 'transform/opacity', 9.6, 0, 70, 70);

    // Viewport Bounding Frame (860 x 860)
    const frameRect = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Viewport - Bounding Square',
        size: [860, 860],
        fill: false,
        stroke: '#152A1C',
        strokeWidth: 1,
        position: [540, 540]
    });
    const frameId = frameRect.layer;
    await addKey(frameId, 'transform/opacity', 0.4, 0, 70, 70);
    await addKey(frameId, 'transform/opacity', 1.6, 45, 70, 70);
    await addKey(frameId, 'transform/opacity', 8.8, 45, 70, 70);
    await addKey(frameId, 'transform/opacity', 9.6, 0, 70, 70);

    // Corner brackets in brand lime green (#B0FF2A)
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
        await addKey(hId, 'transform/opacity', 0.6, 0, 70, 70);
        await addKey(hId, 'transform/opacity', 1.4, 90, 70, 70);
        await addKey(hId, 'transform/opacity', 8.8, 90, 70, 70);
        await addKey(hId, 'transform/opacity', 9.6, 0, 70, 70);

        const vArm = await cmd('layer.newShape', {
            kind: 'rect',
            name: `${c.name} V`,
            size: [2, 24],
            fill: '#B0FF2A',
            position: c.pos
        });
        const vId = vArm.layer;
        await addKey(vId, 'transform/opacity', 0.6, 0, 70, 70);
        await addKey(vId, 'transform/opacity', 1.4, 90, 70, 70);
        await addKey(vId, 'transform/opacity', 8.8, 90, 70, 70);
        await addKey(vId, 'transform/opacity', 9.6, 0, 70, 70);
    }

    console.log('--- 3. Importing and Animating the Hero Angora Logo ---');
    const logoPath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\angora_logo_source.png';
    const importRes = await cmd('file.import', { paths: [logoPath] });
    const logoItemId = (importRes.items && importRes.items[0]) || 972;

    const logoLayerRes = await cmd('layer.addItem', { item: logoItemId });
    const logoLayerId = logoLayerRes.layer;

    await cmd('layer.setSwitch', { layers: [logoLayerId], switch: 'motionBlur', value: true });

    // Logo Motion Choreography:
    // 0.8s: offscreen/scaled down with slight rotation
    // 2.2s: arrives at [540, 410] with smooth overshoot deceleration
    // 2.2s–8.8s: subtle ambient breathing float
    // 8.8s–9.8s: smooth cinematic exit
    await addKey(logoLayerId, 'transform/position', 0.8, [540, 470], 80, 80);
    await addKey(logoLayerId, 'transform/position', 2.2, [540, 410], 80, 80);
    await addKey(logoLayerId, 'transform/position', 5.5, [540, 402], 60, 60);
    await addKey(logoLayerId, 'transform/position', 8.8, [540, 410], 70, 70);
    await addKey(logoLayerId, 'transform/position', 9.6, [540, 370], 80, 80);

    await addKey(logoLayerId, 'transform/scale', 0.8, [0, 0, 100], 80, 80);
    await addKey(logoLayerId, 'transform/scale', 2.0, [57, 57, 100], 80, 80);
    await addKey(logoLayerId, 'transform/scale', 2.4, [53, 53, 100], 75, 75);
    await addKey(logoLayerId, 'transform/scale', 8.8, [53, 53, 100], 70, 70);
    await addKey(logoLayerId, 'transform/scale', 9.6, [0, 0, 100], 80, 80);

    await addKey(logoLayerId, 'transform/rotation', 0.8, -12, 75, 75);
    await addKey(logoLayerId, 'transform/rotation', 2.2, 0, 75, 75);
    await addKey(logoLayerId, 'transform/rotation', 8.8, 0, 70, 70);
    await addKey(logoLayerId, 'transform/rotation', 9.6, 12, 75, 75);

    await addKey(logoLayerId, 'transform/opacity', 0.8, 0, 75, 75);
    await addKey(logoLayerId, 'transform/opacity', 2.0, 100, 75, 75);
    await addKey(logoLayerId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(logoLayerId, 'transform/opacity', 9.6, 0, 75, 75);

    console.log('--- 4. Kinetic Wordmark: "A N G O R A" ---');
    const wordmark = await cmd('layer.newText', {
        text: 'ANGORA',
        name: 'Wordmark - ANGORA',
        font: 'Poppins',
        style: 'Bold',
        size: 72,
        fill: '#FFFFFF',
        tracking: 340,
        position: [540, 705]
    });
    const wmId = wordmark.layer;
    await cmd('layer.setSwitch', { layers: [wmId], switch: 'motionBlur', value: true });

    await addKey(wmId, 'transform/position', 2.0, [540, 745], 80, 80);
    await addKey(wmId, 'transform/position', 3.0, [540, 705], 80, 80);
    await addKey(wmId, 'transform/position', 8.8, [540, 705], 70, 70);
    await addKey(wmId, 'transform/position', 9.5, [540, 675], 80, 80);

    await addKey(wmId, 'transform/opacity', 2.0, 0, 75, 75);
    await addKey(wmId, 'transform/opacity', 3.0, 100, 75, 75);
    await addKey(wmId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wmId, 'transform/opacity', 9.5, 0, 75, 75);

    console.log('--- 5. Lime-Green Brand Accent Rule & Anchor Nodes ---');
    // Background track
    const trackLine = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Ruler - Track Background',
        size: [560, 1],
        fill: '#152A1C',
        position: [540, 755]
    });
    const trId = trackLine.layer;
    await addKey(trId, 'transform/opacity', 2.6, 0, 70, 70);
    await addKey(trId, 'transform/opacity', 3.4, 50, 70, 70);
    await addKey(trId, 'transform/opacity', 8.8, 50, 70, 70);
    await addKey(trId, 'transform/opacity', 9.4, 0, 70, 70);

    // Lime accent line (expanding from center)
    const limeRule = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Lime Green Rule #B0FF2A',
        size: [520, 2.5],
        fill: '#B0FF2A',
        position: [540, 755]
    });
    const lrId = limeRule.layer;
    await cmd('layer.setSwitch', { layers: [lrId], switch: 'motionBlur', value: true });

    await addKey(lrId, 'transform/scale', 2.8, [0, 100, 100], 80, 80);
    await addKey(lrId, 'transform/scale', 3.8, [100, 100, 100], 80, 80);
    await addKey(lrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(lrId, 'transform/scale', 9.4, [0, 100, 100], 80, 80);

    await addKey(lrId, 'transform/opacity', 2.8, 0, 70, 70);
    await addKey(lrId, 'transform/opacity', 3.2, 100, 70, 70);
    await addKey(lrId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(lrId, 'transform/opacity', 9.4, 0, 70, 70);

    // Anchor Diamonds
    const nl = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Left',
        size: [7, 7],
        fill: '#B0FF2A',
        position: [280, 755]
    });
    const nlId = nl.layer;
    await cmd('prop.set', { layer: nlId, path: 'transform/rotation', value: 45 });
    await addKey(nlId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nlId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    const nr = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Right',
        size: [7, 7],
        fill: '#B0FF2A',
        position: [800, 755]
    });
    const nrId = nr.layer;
    await cmd('prop.set', { layer: nrId, path: 'transform/rotation', value: 45 });
    await addKey(nrId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nrId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    console.log('--- 6. Specialization Subtitle: "WEB DEVELOPMENT & DESIGN SERVICES" ---');
    const subtitle = await cmd('layer.newText', {
        text: 'WEB DEVELOPMENT & DESIGN SERVICES',
        name: 'Subtitle - Specialization',
        font: 'Poppins',
        style: 'SemiBold',
        size: 18,
        fill: '#A3E635',
        tracking: 220,
        position: [540, 805]
    });
    const subId = subtitle.layer;
    await cmd('layer.setSwitch', { layers: [subId], switch: 'motionBlur', value: true });

    await addKey(subId, 'transform/position', 3.4, [540, 825], 75, 75);
    await addKey(subId, 'transform/position', 4.4, [540, 805], 75, 75);
    await addKey(subId, 'transform/position', 8.8, [540, 805], 70, 70);
    await addKey(subId, 'transform/position', 9.5, [540, 785], 75, 75);

    await addKey(subId, 'transform/opacity', 3.4, 0, 70, 70);
    await addKey(subId, 'transform/opacity', 4.4, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(subId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 7. Creative Pillars Badge ---');
    const badge = await cmd('layer.newText', {
        text: 'FULL-STACK  •  UI/UX  •  CREATIVE DIRECTION  •  MOTION',
        name: 'Badge - Core Capabilities',
        font: 'Poppins',
        style: 'Medium',
        size: 11,
        fill: '#64748B',
        tracking: 200,
        position: [540, 850]
    });
    const badgeId = badge.layer;
    await addKey(badgeId, 'transform/opacity', 4.2, 0, 70, 70);
    await addKey(badgeId, 'transform/opacity', 5.2, 80, 70, 70);
    await addKey(badgeId, 'transform/opacity', 8.8, 80, 70, 70);
    await addKey(badgeId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- 8. Setting Playhead to 5.4s (Peak View) ---');
    await cmd('time.set', { time: 5.4 });

    console.log('--- 9. Saving Project File ---');
    const projPath = 'C:\\Users\\REYMARK\\Desktop\\Angora_Brand_Motion_Design.ecproj';
    await tool('save_project', { path: projPath });
    console.log('Saved project to:', projPath);

    console.log('--- 10. Rendering Preview Frame ---');
    const previewHero = 'C:\\Users\\REYMARK\\Desktop\\preview_angora_logo_hero.png';
    await tool('render_frame', { comp: compId, time: 5.4, max_side: 1080, path: previewHero });
    console.log('Rendered hero frame to:', previewHero);

    console.log('=== Angora Logo Motion Design Complete! ===');
    cp.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('Error during Angora animation build:', err);
    cp.kill();
    process.exit(1);
});

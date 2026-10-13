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
        clientInfo: { name: 'square-builder', version: '1.0' }
    });
    console.log('Bridge Initialized.');

    const doc = await tool('doc_inspect', {});
    const compId = (doc.activeComp && doc.activeComp.id) || 1;
    console.log('Targeting active 1080x1080 composition ID:', compId);

    await cmd('comp.setSwitch', { switch: 'motionBlur', value: true });

    console.log('--- 1. Background Solid (1080x1080 #0B1120) ---');
    await cmd('layer.newSolid', {
        name: 'BG - Deep Navy #0B1120',
        color: '#0B1120',
        width: 1080,
        height: 1080
    });

    console.log('--- 2. Architectural Canvas Grid Crosshairs ---');
    // Horizontal center rule
    const axisH = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Grid - Horizontal Axis',
        size: [960, 1],
        fill: '#1E293B',
        position: [540, 540]
    });
    const axisHId = axisH.layer;
    await cmd('prop.set', { layer: axisHId, path: 'transform/opacity', value: 40 });
    await addKey(axisHId, 'transform/scale', 0.2, [0, 100, 100], 70, 70);
    await addKey(axisHId, 'transform/scale', 1.4, [100, 100, 100], 70, 70);
    await addKey(axisHId, 'transform/opacity', 8.8, 40, 70, 70);
    await addKey(axisHId, 'transform/opacity', 9.6, 0, 70, 70);

    // Vertical center rule
    const axisV = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Grid - Vertical Axis',
        size: [1, 960],
        fill: '#1E293B',
        position: [540, 540]
    });
    const axisVId = axisV.layer;
    await cmd('prop.set', { layer: axisVId, path: 'transform/opacity', value: 30 });
    await addKey(axisVId, 'transform/scale', 0.2, [100, 0, 100], 70, 70);
    await addKey(axisVId, 'transform/scale', 1.4, [100, 100, 100], 70, 70);
    await addKey(axisVId, 'transform/opacity', 8.8, 30, 70, 70);
    await addKey(axisVId, 'transform/opacity', 9.6, 0, 70, 70);

    // Bounding Viewport Square Frame (840 x 840)
    const frameRect = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Viewport - Bounding Square 840x840',
        size: [840, 840],
        fill: false,
        stroke: '#1E293B',
        strokeWidth: 1,
        position: [540, 540]
    });
    const frameId = frameRect.layer;
    await addKey(frameId, 'transform/opacity', 0.4, 0, 70, 70);
    await addKey(frameId, 'transform/opacity', 1.6, 50, 70, 70);
    await addKey(frameId, 'transform/opacity', 8.8, 50, 70, 70);
    await addKey(frameId, 'transform/opacity', 9.6, 0, 70, 70);

    console.log('--- 3. Precision Corner Brackets (840x840 bounds) ---');
    const corners = [
        { name: 'Bracket - Top Left', pos: [120, 120] },
        { name: 'Bracket - Top Right', pos: [960, 120] },
        { name: 'Bracket - Bottom Right', pos: [960, 960] },
        { name: 'Bracket - Bottom Left', pos: [120, 960] }
    ];

    for (const c of corners) {
        const hArm = await cmd('layer.newShape', {
            kind: 'rect',
            name: `${c.name} H`,
            size: [24, 2],
            fill: '#FF7C00',
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
            fill: '#FF7C00',
            position: c.pos
        });
        const vId = vArm.layer;
        await addKey(vId, 'transform/opacity', 0.6, 0, 70, 70);
        await addKey(vId, 'transform/opacity', 1.4, 90, 70, 70);
        await addKey(vId, 'transform/opacity', 8.8, 90, 70, 70);
        await addKey(vId, 'transform/opacity', 9.6, 0, 70, 70);
    }

    console.log('--- 4. Metadata Suite Kicker ---');
    const kicker = await cmd('layer.newText', {
        text: 'CREATIVE WORKSPACE // PRECISION MOTION',
        name: 'Metadata - Suite Kicker',
        font: 'Poppins',
        style: 'SemiBold',
        size: 13,
        fill: '#FF9828',
        tracking: 280,
        position: [540, 360]
    });
    const kickerId = kicker.layer;
    await addKey(kickerId, 'transform/position', 0.8, [540, 380], 75, 75);
    await addKey(kickerId, 'transform/position', 1.8, [540, 360], 75, 75);
    await addKey(kickerId, 'transform/position', 8.8, [540, 360], 70, 70);
    await addKey(kickerId, 'transform/position', 9.5, [540, 340], 75, 75);

    await addKey(kickerId, 'transform/opacity', 0.8, 0, 70, 70);
    await addKey(kickerId, 'transform/opacity', 1.8, 90, 70, 70);
    await addKey(kickerId, 'transform/opacity', 8.8, 90, 70, 70);
    await addKey(kickerId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 5. Monumental Typography (2-Line Editorial Architectural Hierarchy) ---');
    // Line 1: "CREATE" (Bold White, 96px)
    const wCreate = await cmd('layer.newText', {
        text: 'CREATE',
        name: 'Headline - CREATE [Bold]',
        font: 'Poppins',
        style: 'Bold',
        size: 96,
        fill: '#FFFFFF',
        tracking: 60,
        position: [540, 470]
    });
    const wCreateId = wCreate.layer;
    await cmd('layer.setSwitch', { layers: [wCreateId], switch: 'motionBlur', value: true });

    await addKey(wCreateId, 'transform/position', 1.5, [540, 515], 80, 80);
    await addKey(wCreateId, 'transform/position', 2.3, [540, 470], 80, 80);
    await addKey(wCreateId, 'transform/position', 8.8, [540, 470], 70, 70);
    await addKey(wCreateId, 'transform/position', 9.6, [540, 430], 80, 80);

    await addKey(wCreateId, 'transform/opacity', 1.5, 0, 75, 75);
    await addKey(wCreateId, 'transform/opacity', 2.3, 100, 75, 75);
    await addKey(wCreateId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wCreateId, 'transform/opacity', 9.6, 0, 75, 75);

    // Line 2: "WITHOUT" (Light Platinum Slate, 82px)
    const wWithout = await cmd('layer.newText', {
        text: 'WITHOUT',
        name: 'Headline - WITHOUT [Light]',
        font: 'Poppins',
        style: 'Light',
        size: 82,
        fill: '#94A3B8',
        tracking: 50,
        position: [375, 570]
    });
    const wWithoutId = wWithout.layer;
    await cmd('layer.setSwitch', { layers: [wWithoutId], switch: 'motionBlur', value: true });

    await addKey(wWithoutId, 'transform/position', 1.8, [375, 615], 80, 80);
    await addKey(wWithoutId, 'transform/position', 2.6, [375, 570], 80, 80);
    await addKey(wWithoutId, 'transform/position', 8.8, [375, 570], 70, 70);
    await addKey(wWithoutId, 'transform/position', 9.6, [375, 530], 80, 80);

    await addKey(wWithoutId, 'transform/opacity', 1.8, 0, 75, 75);
    await addKey(wWithoutId, 'transform/opacity', 2.6, 100, 75, 75);
    await addKey(wWithoutId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wWithoutId, 'transform/opacity', 9.6, 0, 75, 75);

    // Line 2: "LIMITS" (Black Pure White, 82px)
    const wLimits = await cmd('layer.newText', {
        text: 'LIMITS',
        name: 'Headline - LIMITS [Black]',
        font: 'Poppins',
        style: 'Black',
        size: 82,
        fill: '#FFFFFF',
        tracking: 50,
        position: [710, 570]
    });
    const wLimitsId = wLimits.layer;
    await cmd('layer.setSwitch', { layers: [wLimitsId], switch: 'motionBlur', value: true });

    await addKey(wLimitsId, 'transform/position', 2.1, [710, 615], 80, 80);
    await addKey(wLimitsId, 'transform/position', 2.9, [710, 570], 80, 80);
    await addKey(wLimitsId, 'transform/position', 8.8, [710, 570], 70, 70);
    await addKey(wLimitsId, 'transform/position', 9.6, [710, 530], 80, 80);

    await addKey(wLimitsId, 'transform/opacity', 2.1, 0, 75, 75);
    await addKey(wLimitsId, 'transform/opacity', 2.9, 100, 75, 75);
    await addKey(wLimitsId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wLimitsId, 'transform/opacity', 9.6, 0, 75, 75);

    console.log('--- 6. Precision Ruler & Orange Scrubber Line ---');
    // Ruler background track
    const trackLine = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Ruler - Track Background',
        size: [760, 1],
        fill: '#334155',
        position: [540, 630]
    });
    const trackId = trackLine.layer;
    await addKey(trackId, 'transform/opacity', 2.4, 0, 70, 70);
    await addKey(trackId, 'transform/opacity', 3.2, 50, 70, 70);
    await addKey(trackId, 'transform/opacity', 8.8, 50, 70, 70);
    await addKey(trackId, 'transform/opacity', 9.4, 0, 70, 70);

    // Expanding orange rule (720px wide)
    const orangeRule = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Orange Precision Line #FF7C00',
        size: [720, 2.5],
        fill: '#FF7C00',
        position: [540, 630]
    });
    const orangeRuleId = orangeRule.layer;
    await cmd('layer.setSwitch', { layers: [orangeRuleId], switch: 'motionBlur', value: true });

    await addKey(orangeRuleId, 'transform/scale', 2.6, [0, 100, 100], 80, 80);
    await addKey(orangeRuleId, 'transform/scale', 3.8, [100, 100, 100], 80, 80);
    await addKey(orangeRuleId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(orangeRuleId, 'transform/scale', 9.5, [0, 100, 100], 80, 80);

    await addKey(orangeRuleId, 'transform/opacity', 2.6, 0, 70, 70);
    await addKey(orangeRuleId, 'transform/opacity', 3.0, 100, 70, 70);
    await addKey(orangeRuleId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(orangeRuleId, 'transform/opacity', 9.5, 0, 70, 70);

    // Left Diamond Anchor Node
    const nodeLeft = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Left',
        size: [7, 7],
        fill: '#FF7C00',
        position: [180, 630]
    });
    const nlId = nodeLeft.layer;
    await cmd('prop.set', { layer: nlId, path: 'transform/rotation', value: 45 });
    await addKey(nlId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nlId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    // Right Diamond Anchor Node
    const nodeRight = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Right',
        size: [7, 7],
        fill: '#FF7C00',
        position: [900, 630]
    });
    const nrId = nodeRight.layer;
    await cmd('prop.set', { layer: nrId, path: 'transform/rotation', value: 45 });
    await addKey(nrId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nrId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    console.log('--- 7. Subtitle / Product Philosophy ---');
    const subtitle = await cmd('layer.newText', {
        text: 'DESIGN FREEDOM  •  INFINITE COMPOSITION',
        name: 'Subtitle - Philosophy',
        font: 'Poppins',
        style: 'Regular',
        size: 19,
        fill: '#CBD5E1',
        tracking: 220,
        position: [540, 685]
    });
    const subId = subtitle.layer;
    await cmd('layer.setSwitch', { layers: [subId], switch: 'motionBlur', value: true });

    await addKey(subId, 'transform/position', 4.0, [540, 705], 75, 75);
    await addKey(subId, 'transform/position', 5.0, [540, 685], 75, 75);
    await addKey(subId, 'transform/position', 8.8, [540, 685], 70, 70);
    await addKey(subId, 'transform/position', 9.5, [540, 665], 75, 75);

    await addKey(subId, 'transform/opacity', 4.0, 0, 70, 70);
    await addKey(subId, 'transform/opacity', 5.0, 90, 70, 70);
    await addKey(subId, 'transform/opacity', 8.8, 90, 70, 70);
    await addKey(subId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 8. High-End Creative Tech Badge ---');
    const badge = await cmd('layer.newText', {
        text: 'HARDWARE-ACCELERATED MOTION ENGINE // 64-BIT PRECISION',
        name: 'System Badge - Engine Architecture',
        font: 'Poppins',
        style: 'Medium',
        size: 10,
        fill: '#64748B',
        tracking: 220,
        position: [540, 735]
    });
    const badgeId = badge.layer;
    await addKey(badgeId, 'transform/opacity', 4.8, 0, 70, 70);
    await addKey(badgeId, 'transform/opacity', 5.8, 70, 70, 70);
    await addKey(badgeId, 'transform/opacity', 8.8, 70, 70, 70);
    await addKey(badgeId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- 9. Moving Playhead to 5.4s (Peak View) ---');
    await cmd('time.set', { time: 5.4 });

    console.log('--- 10. Saving Project File ---');
    const projectPath = 'C:\\Users\\REYMARK\\Desktop\\Modern_Motion_Graphics_1080x1080.ecproj';
    await tool('save_project', { path: projectPath });
    console.log('Saved 1080x1080 project to:', projectPath);

    console.log('--- 11. Rendering Preview Frame ---');
    const previewHero = 'C:\\Users\\REYMARK\\Desktop\\preview_1080x1080_hero.png';
    await tool('render_frame', { comp: compId, time: 5.4, max_side: 1080, path: previewHero });
    console.log('1080x1080 Hero frame rendered to Desktop:', previewHero);

    console.log('=== 1080x1080 Adaptation Complete! ===');
    cp.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('1080x1080 Execution Error:', err);
    cp.kill();
    process.exit(1);
});

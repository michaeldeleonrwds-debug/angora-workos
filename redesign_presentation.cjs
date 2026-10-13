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
        clientInfo: { name: 'redesign-builder', version: '1.0' }
    });
    console.log('Bridge Initialized.');

    console.log('--- Initializing New Composition ---');
    await tool('open_project', { new: true });

    const compRes = await cmd('comp.new', {
        name: 'CREATE WITHOUT LIMITS - Keynote',
        width: 1920,
        height: 1080,
        frameRate: 30,
        duration: 10.0,
        background: '#0B1120'
    });
    const compId = compRes.comp || 1;
    await cmd('comp.open', { comp: compId });
    await cmd('comp.setSwitch', { switch: 'motionBlur', value: true });

    console.log('--- 1. Background Solid (#0B1120) ---');
    await cmd('layer.newSolid', {
        name: 'BG - Deep Navy #0B1120',
        color: '#0B1120',
        width: 1920,
        height: 1080
    });

    console.log('--- 2. Precision Creative Canvas Grid Lines ---');
    // Horizontal center axis line
    const axisH = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Canvas Grid - Horizontal Axis',
        size: [1400, 1],
        fill: '#1E293B',
        position: [960, 530]
    });
    const axisHId = axisH.layer;
    await cmd('prop.set', { layer: axisHId, path: 'transform/opacity', value: 40 });
    await addKey(axisHId, 'transform/scale', 0.2, [0, 100, 100], 70, 70);
    await addKey(axisHId, 'transform/scale', 1.4, [100, 100, 100], 70, 70);
    await addKey(axisHId, 'transform/opacity', 8.8, 40, 70, 70);
    await addKey(axisHId, 'transform/opacity', 9.6, 0, 70, 70);

    // Subtle framing boundary container (1180 x 540)
    const frameRect = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Viewport - Bounding Frame',
        size: [1260, 520],
        fill: false,
        stroke: '#1E293B',
        strokeWidth: 1,
        position: [960, 530]
    });
    const frameId = frameRect.layer;
    await addKey(frameId, 'transform/opacity', 0.4, 0, 70, 70);
    await addKey(frameId, 'transform/opacity', 1.6, 50, 70, 70);
    await addKey(frameId, 'transform/opacity', 8.8, 50, 70, 70);
    await addKey(frameId, 'transform/opacity', 9.6, 0, 70, 70);

    console.log('--- 3. Viewport Precision Corner Bracket Marks ---');
    // Corner marks (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    const corners = [
        { name: 'Bracket - Top Left', pos: [330, 270], rot: 0 },
        { name: 'Bracket - Top Right', pos: [1590, 270], rot: 90 },
        { name: 'Bracket - Bottom Right', pos: [1590, 790], rot: 180 },
        { name: 'Bracket - Bottom Left', pos: [330, 790], rot: 270 }
    ];

    for (const c of corners) {
        // Horizontal arm
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

        // Vertical arm
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

    console.log('--- 4. Software Suite Kicker Tag ---');
    const kicker = await cmd('layer.newText', {
        text: 'CREATIVE WORKSPACE // PRECISION MOTION',
        name: 'Metadata - Workspace Kicker',
        font: 'Poppins',
        style: 'SemiBold',
        size: 14,
        fill: '#FF9828',
        tracking: 280,
        position: [960, 395]
    });
    const kickerId = kicker.layer;
    await addKey(kickerId, 'transform/position', 0.8, [960, 410], 75, 75);
    await addKey(kickerId, 'transform/position', 1.8, [960, 395], 75, 75);
    await addKey(kickerId, 'transform/position', 8.8, [960, 395], 70, 70);
    await addKey(kickerId, 'transform/position', 9.5, [960, 380], 75, 75);

    await addKey(kickerId, 'transform/opacity', 0.8, 0, 70, 70);
    await addKey(kickerId, 'transform/opacity', 1.8, 90, 70, 70);
    await addKey(kickerId, 'transform/opacity', 8.8, 90, 70, 70);
    await addKey(kickerId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 5. Monumental Typography: "CREATE WITHOUT LIMITS" ---');
    // Intentional contrast:
    // "CREATE"  -> Poppins Bold (#FFFFFF, 92px)
    // "WITHOUT" -> Poppins Light (#94A3B8 platinum slate, 92px)
    // "LIMITS"  -> Poppins Black (#FFFFFF, 92px)

    // Word 1: CREATE (Bold White)
    const wCreate = await cmd('layer.newText', {
        text: 'CREATE',
        name: 'Title - CREATE [Bold]',
        font: 'Poppins',
        style: 'Bold',
        size: 92,
        fill: '#FFFFFF',
        tracking: 40,
        position: [480, 520]
    });
    const wCreateId = wCreate.layer;
    await cmd('layer.setSwitch', { layers: [wCreateId], switch: 'motionBlur', value: true });

    await addKey(wCreateId, 'transform/position', 1.5, [480, 565], 80, 80);
    await addKey(wCreateId, 'transform/position', 2.3, [480, 520], 80, 80);
    await addKey(wCreateId, 'transform/position', 8.8, [480, 520], 70, 70);
    await addKey(wCreateId, 'transform/position', 9.6, [480, 480], 80, 80);

    await addKey(wCreateId, 'transform/opacity', 1.5, 0, 75, 75);
    await addKey(wCreateId, 'transform/opacity', 2.3, 100, 75, 75);
    await addKey(wCreateId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wCreateId, 'transform/opacity', 9.6, 0, 75, 75);

    // Word 2: WITHOUT (Light Platinum Slate - High Contrast Weight)
    const wWithout = await cmd('layer.newText', {
        text: 'WITHOUT',
        name: 'Title - WITHOUT [Light]',
        font: 'Poppins',
        style: 'Light',
        size: 92,
        fill: '#94A3B8',
        tracking: 60,
        position: [960, 520]
    });
    const wWithoutId = wWithout.layer;
    await cmd('layer.setSwitch', { layers: [wWithoutId], switch: 'motionBlur', value: true });

    await addKey(wWithoutId, 'transform/position', 1.8, [960, 565], 80, 80);
    await addKey(wWithoutId, 'transform/position', 2.6, [960, 520], 80, 80);
    await addKey(wWithoutId, 'transform/position', 8.8, [960, 520], 70, 70);
    await addKey(wWithoutId, 'transform/position', 9.6, [960, 480], 80, 80);

    await addKey(wWithoutId, 'transform/opacity', 1.8, 0, 75, 75);
    await addKey(wWithoutId, 'transform/opacity', 2.6, 100, 75, 75);
    await addKey(wWithoutId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wWithoutId, 'transform/opacity', 9.6, 0, 75, 75);

    // Word 3: LIMITS (Black / ExtraBold White)
    const wLimits = await cmd('layer.newText', {
        text: 'LIMITS',
        name: 'Title - LIMITS [Black]',
        font: 'Poppins',
        style: 'Black',
        size: 92,
        fill: '#FFFFFF',
        tracking: 50,
        position: [1440, 520]
    });
    const wLimitsId = wLimits.layer;
    await cmd('layer.setSwitch', { layers: [wLimitsId], switch: 'motionBlur', value: true });

    await addKey(wLimitsId, 'transform/position', 2.1, [1440, 565], 80, 80);
    await addKey(wLimitsId, 'transform/position', 2.9, [1440, 520], 80, 80);
    await addKey(wLimitsId, 'transform/position', 8.8, [1440, 520], 70, 70);
    await addKey(wLimitsId, 'transform/position', 9.6, [1440, 480], 80, 80);

    await addKey(wLimitsId, 'transform/opacity', 2.1, 0, 75, 75);
    await addKey(wLimitsId, 'transform/opacity', 2.9, 100, 75, 75);
    await addKey(wLimitsId, 'transform/opacity', 8.8, 100, 70, 70);
    await addKey(wLimitsId, 'transform/opacity', 9.6, 0, 75, 75);

    console.log('--- 6. Precision Ruler & Orange Accent Scrubber Line ---');
    // Subtle background track ruler
    const trackLine = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Ruler - Track Background',
        size: [1180, 1],
        fill: '#334155',
        position: [960, 580]
    });
    const trackId = trackLine.layer;
    await addKey(trackId, 'transform/opacity', 2.4, 0, 70, 70);
    await addKey(trackId, 'transform/opacity', 3.2, 50, 70, 70);
    await addKey(trackId, 'transform/opacity', 8.8, 50, 70, 70);
    await addKey(trackId, 'transform/opacity', 9.4, 0, 70, 70);

    // Dynamic expanding orange accent line (expands from center)
    const orangeRule = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Accent - Orange Precision Line #FF7C00',
        size: [960, 2.5],
        fill: '#FF7C00',
        position: [960, 580]
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

    // Precision Anchor Diamond at left edge
    const nodeLeft = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Left',
        size: [7, 7],
        fill: '#FF7C00',
        position: [480, 580]
    });
    const nlId = nodeLeft.layer;
    await cmd('prop.set', { layer: nlId, path: 'transform/rotation', value: 45 });
    await addKey(nlId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nlId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nlId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    // Precision Anchor Diamond at right edge
    const nodeRight = await cmd('layer.newShape', {
        kind: 'rect',
        name: 'Anchor Node - Right',
        size: [7, 7],
        fill: '#FF7C00',
        position: [1440, 580]
    });
    const nrId = nodeRight.layer;
    await cmd('prop.set', { layer: nrId, path: 'transform/rotation', value: 45 });
    await addKey(nrId, 'transform/scale', 3.4, [0, 0, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 3.9, [100, 100, 100], 75, 75);
    await addKey(nrId, 'transform/scale', 8.8, [100, 100, 100], 70, 70);
    await addKey(nrId, 'transform/scale', 9.4, [0, 0, 100], 75, 75);

    console.log('--- 7. Subtitle / Product Philosophy Tagline ---');
    const subtitle = await cmd('layer.newText', {
        text: 'DESIGN FREEDOM  •  INFINITE COMPOSITION',
        name: 'Subtitle - Core Value Proposition',
        font: 'Poppins',
        style: 'Regular',
        size: 20,
        fill: '#CBD5E1',
        tracking: 240,
        position: [960, 640]
    });
    const subId = subtitle.layer;
    await cmd('layer.setSwitch', { layers: [subId], switch: 'motionBlur', value: true });

    await addKey(subId, 'transform/position', 4.2, [960, 655], 75, 75);
    await addKey(subId, 'transform/position', 5.2, [960, 640], 75, 75);
    await addKey(subId, 'transform/position', 8.8, [960, 640], 70, 70);
    await addKey(subId, 'transform/position', 9.5, [960, 625], 75, 75);

    await addKey(subId, 'transform/opacity', 4.2, 0, 70, 70);
    await addKey(subId, 'transform/opacity', 5.2, 90, 70, 70);
    await addKey(subId, 'transform/opacity', 8.8, 90, 70, 70);
    await addKey(subId, 'transform/opacity', 9.5, 0, 70, 70);

    console.log('--- 8. High-End Creative Tech Badge ---');
    const badge = await cmd('layer.newText', {
        text: 'HARDWARE-ACCELERATED MOTION ENGINE // 64-BIT PRECISION',
        name: 'System Badge - Engine Architecture',
        font: 'Poppins',
        style: 'Medium',
        size: 11,
        fill: '#64748B',
        tracking: 220,
        position: [960, 695]
    });
    const badgeId = badge.layer;
    await addKey(badgeId, 'transform/opacity', 5.0, 0, 70, 70);
    await addKey(badgeId, 'transform/opacity', 6.0, 70, 70, 70);
    await addKey(badgeId, 'transform/opacity', 8.8, 70, 70, 70);
    await addKey(badgeId, 'transform/opacity', 9.4, 0, 70, 70);

    console.log('--- 9. Setting Playhead to 5.4s (Peak Presentation View) ---');
    await cmd('time.set', { time: 5.4 });

    console.log('--- 10. Saving Project File ---');
    const desktopProj = 'C:\\Users\\REYMARK\\Desktop\\Modern_Motion_Graphics.ecproj';
    await tool('save_project', { path: desktopProj });
    console.log('Saved project to:', desktopProj);

    console.log('--- 11. Rendering Preview Frame ---');
    const previewHero = 'C:\\Users\\REYMARK\\Desktop\\preview_redesign_hero.png';
    await tool('render_frame', { comp: compId, time: 5.4, max_side: 1920, path: previewHero });
    console.log('Hero frame rendered to Desktop:', previewHero);

    console.log('=== Redesign Complete! ===');
    cp.kill();
    process.exit(0);
}

run().catch(err => {
    console.error('Redesign Execution Error:', err);
    cp.kill();
    process.exit(1);
});

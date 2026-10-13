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
        if (res.content && res.content[0] && res.content[0].text) {
            try { return JSON.parse(res.content[0].text); } catch { return res.content[0].text; }
        }
        return res;
    });
}

async function addKey(layer, path, time, value) {
    return tool('add_keyframe', { layer, path, time, value });
}

async function setProp(layer, path, value) {
    return tool('set_property', { layer, path, value });
}

async function setEase(layer, path, time) {
    try {
        await tool('execute_command', {
            id: 'keys.setEase',
            params: { layer, path, time, side: 'in', speed: 0, influence: 65 }
        });
        await tool('execute_command', {
            id: 'keys.setEase',
            params: { layer, path, time, side: 'out', speed: 0, influence: 65 }
        });
    } catch {}
}

async function run() {
    console.log("=== Creating Professional 1920x1080 Angora Brand Motion Graphics ===");

    // 1. Create New 1920x1080 Composition (7.0s @ 30 FPS)
    const compRes = await tool('execute_command', {
        id: 'comp.new',
        params: {
            name: 'Angora - Cinematic Brand Motion',
            width: 1920,
            height: 1080,
            frameRate: 30,
            duration: 7.0,
            background: '#041209'
        }
    });
    console.log("Created Composition:", compRes);

    // 2. Background Solid Layer
    console.log("Adding background solid...");
    const bgSolid = await tool('execute_command', {
        id: 'layer.newSolid',
        params: {
            name: 'BG - Dark Green Stage',
            color: '#041209',
            width: 1920,
            height: 1080
        }
    });
    const bgLayerId = bgSolid.layer || bgSolid.id;

    // 3. Subtle Radial Vignette / Ambience
    const vigSolid = await tool('execute_command', {
        id: 'layer.newSolid',
        params: {
            name: 'BG - Radial Ambient Glow',
            color: '#082512',
            width: 1920,
            height: 1080
        }
    });
    const vigLayerId = vigSolid.layer || vigSolid.id;
    // Add central soft mask
    await tool('execute_command', {
        id: 'layer.addMask',
        params: { layer: vigLayerId, shape: 'ellipse', rect: [360, 40, 1200, 1000] }
    });
    await setProp(vigLayerId, 'masks/mask/feather', [250, 250]);
    await setProp(vigLayerId, 'transform/opacity', 35);

    // 4. Import the pristine symbol mark
    const symbolPath = 'C:\\Users\\REYMARK\\Documents\\Sites\\angora\\angora_sym_tight.png';
    console.log("Importing pristine symbol:", symbolPath);
    await tool('execute_command', {
        id: 'file.import',
        params: { paths: [symbolPath], addToComp: true }
    });

    let comp = await tool('get_comp');
    let importedLayer = comp.layers[0];
    console.log("Base Symbol Layer:", importedLayer.id, importedLayer.name);

    // Position the master logo
    // Center at X: 960, Y: 400. Display scale: 68%
    const LOGO_POS = [960, 400, 0];
    const LOGO_SCALE = [68, 68, 100];

    // Rename importedLayer to Master Symbol
    await tool('execute_command', {
        id: 'layer.rename',
        params: { layer: importedLayer.id, name: 'Logo - Master Complete' }
    });
    await setProp(importedLayer.id, 'transform/position', LOGO_POS);
    await setProp(importedLayer.id, 'transform/scale', LOGO_SCALE);

    // Duplicate for Layer 2: Curved Ribbon Reveal
    const dupRibbon = await tool('execute_command', {
        id: 'edit.duplicate',
        params: { layers: [importedLayer.id] }
    });
    comp = await tool('get_comp');
    const ribbonLayer = comp.layers[0];
    await tool('execute_command', {
        id: 'layer.rename',
        params: { layer: ribbonLayer.id, name: 'Logo - Curved Ribbon Reveal' }
    });

    // Duplicate for Layer 1: Diagonal Strokes Reveal
    const dupStrokes = await tool('execute_command', {
        id: 'edit.duplicate',
        params: { layers: [ribbonLayer.id] }
    });
    comp = await tool('get_comp');
    const strokesLayer = comp.layers[0];
    await tool('execute_command', {
        id: 'layer.rename',
        params: { layer: strokesLayer.id, name: 'Logo - Diagonal Strokes Reveal' }
    });

    console.log("Logo Layers created: Strokes:", strokesLayer.id, "Ribbon:", ribbonLayer.id, "Master:", importedLayer.id);

    // --- ANIMATING LAYER 1: DIAGONAL STROKES (Scene 1: 0.3s - 1.8s) ---
    // Smooth path-reveal wiping along the letter A from the apex down to the base
    console.log("Setting up Diagonal Strokes Reveal...");
    await tool('execute_command', {
        id: 'effect.apply',
        params: { effect: 'Linear Wipe', layers: [strokesLayer.id] }
    });
    // Angle 0: wipes from bottom to top, so at 100% completion everything is wiped away.
    // As completion goes from 100% -> 0%, the apex appears first and grows downwards along both diagonal legs!
    await setProp(strokesLayer.id, 'effects/#1/angle', 0);
    await setProp(strokesLayer.id, 'effects/#1/feather', 16);

    // Keyframe Strokes Completion:
    // 0.0s - 0.3s: 100% (hidden)
    // 0.3s: 100%
    // 1.8s: 0% (fully revealed)
    await addKey(strokesLayer.id, 'effects/#1/completion', 0.0, 100);
    await addKey(strokesLayer.id, 'effects/#1/completion', 0.3, 100);
    await addKey(strokesLayer.id, 'effects/#1/completion', 1.8, 0);
    await setEase(strokesLayer.id, 'effects/#1/completion', 0.3);
    await setEase(strokesLayer.id, 'effects/#1/completion', 1.8);

    // Subtle gentle emergence scale from 65% to 68% for natural organic flow
    await addKey(strokesLayer.id, 'transform/scale', 0.3, [65, 65, 100]);
    await addKey(strokesLayer.id, 'transform/scale', 1.8, [68, 68, 100]);
    await setEase(strokesLayer.id, 'transform/scale', 0.3);
    await setEase(strokesLayer.id, 'transform/scale', 1.8);

    // --- ANIMATING LAYER 2: CURVED RIBBON (Scene 1-2: 1.0s - 2.3s) ---
    // Fluid path-reveal unrolling across the curve from left to right
    console.log("Setting up Curved Ribbon Reveal...");
    await tool('execute_command', {
        id: 'effect.apply',
        params: { effect: 'Linear Wipe', layers: [ribbonLayer.id] }
    });
    // Angle 270: wipes from right to left, leaving left side.
    // As completion goes from 100% -> 0%, it unrolls gracefully from left to right!
    await setProp(ribbonLayer.id, 'effects/#1/angle', 270);
    await setProp(ribbonLayer.id, 'effects/#1/feather', 24);

    // Keyframe Ribbon Completion:
    // 0.0s - 1.0s: 100% (hidden)
    // 1.0s: 100%
    // 2.3s: 0% (fully unrolled)
    await addKey(ribbonLayer.id, 'effects/#1/completion', 0.0, 100);
    await addKey(ribbonLayer.id, 'effects/#1/completion', 1.0, 100);
    await addKey(ribbonLayer.id, 'effects/#1/completion', 2.3, 0);
    await setEase(ribbonLayer.id, 'effects/#1/completion', 1.0);
    await setEase(ribbonLayer.id, 'effects/#1/completion', 2.3);

    // Ribbon subtle leading flow
    await addKey(ribbonLayer.id, 'transform/scale', 1.0, [66, 68, 100]);
    await addKey(ribbonLayer.id, 'transform/scale', 2.3, [68, 68, 100]);
    await setEase(ribbonLayer.id, 'transform/scale', 1.0);
    await setEase(ribbonLayer.id, 'transform/scale', 2.3);

    // --- MASTER LOGO LAYER: Seamless Hand-off & Hold (Scene 2-5: 2.3s - 7.0s) ---
    console.log("Setting up Master Logo Layer hand-off...");
    // Master logo stays hidden while strokes and ribbon unroll, then smoothly takes over at 2.3s
    await addKey(importedLayer.id, 'transform/opacity', 0.0, 0);
    await addKey(importedLayer.id, 'transform/opacity', 2.2, 0);
    await addKey(importedLayer.id, 'transform/opacity', 2.4, 100);
    await addKey(importedLayer.id, 'transform/opacity', 7.0, 100);

    // --- SCENE 3: BRAND REVEAL - "ANGORA" (3.0s - 4.0s) ---
    console.log("Creating Brand Wordmark Typography...");
    const wordmarkRes = await tool('execute_command', {
        id: 'layer.newText',
        params: {
            text: 'ANGORA',
            name: 'Typography - ANGORA',
            font: 'Poppins',
            style: 'Bold',
            size: 54,
            fill: '#FFFFFF',
            tracking: 380,
            position: [960, 660]
        }
    });
    const wordmarkId = wordmarkRes.layer || wordmarkRes.id;
    // Animate wordmark: rising smoothly from Y: 680 to Y: 660 with opacity 0% -> 100%
    await addKey(wordmarkId, 'transform/position', 0.0, [960, 680, 0]);
    await addKey(wordmarkId, 'transform/position', 3.0, [960, 680, 0]);
    await addKey(wordmarkId, 'transform/position', 3.9, [960, 660, 0]);
    await setEase(wordmarkId, 'transform/position', 3.0);
    await setEase(wordmarkId, 'transform/position', 3.9);

    await addKey(wordmarkId, 'transform/opacity', 0.0, 0);
    await addKey(wordmarkId, 'transform/opacity', 3.0, 0);
    await addKey(wordmarkId, 'transform/opacity', 3.8, 100);
    await setEase(wordmarkId, 'transform/opacity', 3.0);
    await setEase(wordmarkId, 'transform/opacity', 3.8);

    // --- SCENE 4: TAGLINE REVEAL (4.0s - 5.0s) ---
    console.log("Creating Lime Accent Rule & Subtitle...");
    // 1. Thin lime-green horizontal line beneath ANGORA
    const lineSolid = await tool('execute_command', {
        id: 'layer.newSolid',
        params: {
            name: 'Accent - Lime Brand Line',
            color: '#B0FF2A',
            width: 440,
            height: 2
        }
    });
    const lineId = lineSolid.layer || lineSolid.id;
    await setProp(lineId, 'transform/position', [960, 715, 0]);
    // Expand horizontally from center (Scale X: 0% -> 100%)
    await addKey(lineId, 'transform/scale', 0.0, [0, 100, 100]);
    await addKey(lineId, 'transform/scale', 4.0, [0, 100, 100]);
    await addKey(lineId, 'transform/scale', 4.7, [100, 100, 100]);
    await setEase(lineId, 'transform/scale', 4.0);
    await setEase(lineId, 'transform/scale', 4.7);

    await addKey(lineId, 'transform/opacity', 0.0, 0);
    await addKey(lineId, 'transform/opacity', 4.0, 0);
    await addKey(lineId, 'transform/opacity', 4.2, 100);

    // 2. Exact Tagline: "WEB DEVELOPMENT & DESIGN SERVICES"
    const taglineRes = await tool('execute_command', {
        id: 'layer.newText',
        params: {
            text: 'WEB DEVELOPMENT & DESIGN SERVICES',
            name: 'Typography - Tagline',
            font: 'Poppins',
            style: 'Medium',
            size: 15,
            fill: '#A3E635',
            tracking: 300,
            position: [960, 755]
        }
    });
    const taglineId = taglineRes.layer || taglineRes.id;
    // Animate subtle fade-in from 4.2s to 4.9s
    await addKey(taglineId, 'transform/position', 0.0, [960, 762, 0]);
    await addKey(taglineId, 'transform/position', 4.2, [960, 762, 0]);
    await addKey(taglineId, 'transform/position', 4.9, [960, 755, 0]);
    await setEase(taglineId, 'transform/position', 4.2);
    await setEase(taglineId, 'transform/position', 4.9);

    await addKey(taglineId, 'transform/opacity', 0.0, 0);
    await addKey(taglineId, 'transform/opacity', 4.2, 0);
    await addKey(taglineId, 'transform/opacity', 4.9, 100);
    await setEase(taglineId, 'transform/opacity', 4.2);
    await setEase(taglineId, 'transform/opacity', 4.9);

    // --- SCENE 5: FINAL HOLD (5.0s - 7.0s) ---
    // Everything stays locked in place through 7.0s!
    console.log("Setting CTI to 5.5s (Peak Hold)...");
    await tool('execute_command', {
        id: 'time.set',
        params: { time: 5.5 }
    });

    // Save project file
    const projectPath = 'C:\\Users\\REYMARK\\Desktop\\Angora_Cinematic_Brand_Motion.ecproj';
    console.log("Saving project to:", projectPath);
    await tool('execute_command', {
        id: 'file.saveAs',
        params: { path: projectPath }
    });

    // Render Preview Frames at Key Timestamps:
    // 1.0s (Strokes constructing)
    // 1.7s (Ribbon unrolling)
    // 2.7s (Logo completion & shimmer)
    // 3.6s (Brand wordmark reveal)
    // 5.5s (Final hold)
    const timestamps = [
        { time: 1.0, name: 'preview_1.0s_construction.png' },
        { time: 1.7, name: 'preview_1.7s_ribbon_unroll.png' },
        { time: 2.7, name: 'preview_2.7s_logo_complete.png' },
        { time: 3.6, name: 'preview_3.6s_brand_reveal.png' },
        { time: 5.5, name: 'preview_5.5s_final_hold.png' }
    ];

    for (const ts of timestamps) {
        console.log(`Rendering preview at ${ts.time}s...`);
        const prev = await tool('render_preview', { time: ts.time });
        for (const c of prev.content) {
            if (c.data && c.mimeType === 'image/png') {
                const outPath = `C:\\Users\\REYMARK\\Desktop\\${ts.name}`;
                fs.writeFileSync(outPath, Buffer.from(c.data, 'base64'));
                console.log(`Saved: ${outPath}`);
                break;
            }
        }
    }

    console.log("=== Build Complete! ===");
    process.exit(0);
}

run().catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
});

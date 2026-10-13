// Professional Motion Graphics Animation for EffectCraft / After Effects
// Resolution: 1920x1080 @ 30 FPS, Duration: 10.0s, BG: #0B1120

(function() {
    // 1. Reset / initialize project
    var project = app.project;
    
    // Create Main Composition
    var comp = project.items.addComp("Modern Motion Graphics", 1920, 1080, 1.0, 10.0, 30.0);
    comp.bgColor = [11/255, 17/255, 32/255]; // #0B1120
    comp.motionBlur = true;

    // Helper for Easy Ease
    function easeKey(prop, keyIdx, inInfl, outInfl) {
        var easeIn = [];
        var easeOut = [];
        var dims = 1;
        var val = prop.keyValue(keyIdx);
        if (val instanceof Array) {
            dims = val.length;
        }
        for (var d = 0; d < dims; d++) {
            easeIn.push(new KeyframeEase(0, inInfl || 70));
            easeOut.push(new KeyframeEase(0, outInfl || 70));
        }
        try {
            prop.setTemporalEaseAtKey(keyIdx, easeIn, easeOut);
        } catch(e) {}
    }

    // 2. Add Background Solid
    var bgSolid = comp.layers.addSolid([11/255, 17/255, 32/255], "BG - Dark Navy #0B1120", 1920, 1080, 1.0, 10.0);
    bgSolid.locked = true;

    writeLn("Comp and Background created successfully.");
})();

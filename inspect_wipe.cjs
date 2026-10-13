const fs = require('fs');

const effects = JSON.parse(fs.readFileSync('C:/Users/REYMARK/.gemini/antigravity/brain/40d1503c-3371-4d49-aa05-4e4f0ba94659/.system_generated/steps/510/output.txt', 'utf8'));

const targets = ['ec.transition.linearwipe', 'ec.transition.radialwipe', 'ec.transition.gradientwipe', 'ec.generate.stroke'];
for (const id of targets) {
  const eff = effects.find(e => e.id === id);
  console.log(`=== Effect: ${id} ===`);
  if (eff) {
    console.log(JSON.stringify(eff.params, null, 2));
  } else {
    console.log("Not found");
  }
}

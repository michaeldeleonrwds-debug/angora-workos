const fs = require('fs');

const stat = fs.statSync('angora_symbol_clean.png');
console.log('angora_symbol_clean.png size:', stat.size);

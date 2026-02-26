 
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.jsx');

files.forEach(filePath => {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (l.includes('bg="brand.') || l.includes('background:')) {
      console.log(filePath, 'line', i+1, ':', l.trim());
    }
  });
});
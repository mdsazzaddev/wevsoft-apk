const fs = require('fs');
const path = require('path');

function getFiles(dir, extList = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, extList));
    } else {
      if (extList.includes(path.extname(file))) {
        results.push(file);
      }
    }
  });
  return results;
}

const srcDir = path.join(__dirname, 'src');
const files = getFiles(srcDir);

let totalModified = 0;

// Regex to capture const { token, user } = useStore();
const regex = /^([ \t]*)(const|let)\s+\{([\s\S]+?)\}\s*=\s*useStore\(\);/gm;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let modified = false;

  const newContent = content.replace(regex, (match, indent, kw, varsStr) => {
    modified = true;
    
    const rawVars = varsStr.split(',').map(v => v.trim()).filter(Boolean);
    
    const replacements = rawVars.map(v => {
      if (v.includes(':')) {
        const parts = v.split(':');
        const orig = parts[0].trim();
        const alias = parts[1].trim();
        return indent + kw + ' ' + alias + ' = useStore((s) => s.' + orig + ');';
      } else {
        return indent + kw + ' ' + v + ' = useStore((s) => s.' + v + ');';
      }
    });

    return replacements.join('\n');
  });

  if (modified) {
    fs.writeFileSync(file, newContent, 'utf8');
    totalModified++;
    console.log('Updated: ' + path.relative(__dirname, file));
  }
});

console.log('\nRefactoring complete. Total files modified: ' + totalModified);

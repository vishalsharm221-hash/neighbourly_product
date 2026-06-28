const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');

const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith('entry-') && f.endsWith('.js'));
let patched = 0;

for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let applied = 0;

  // 1. Fallback in getStateFromPath when no route matches the root path
  const fallbackPattern = /if\(void 0===p\|\|void 0===f\)return;return S\(e,p,n,f\)/;
  if (fallbackPattern.test(content)) {
    content = content.replace(
      fallbackPattern,
      'if(void 0===p||void 0===f){const t=s[0];if(t)return S(e,t.routeNames.map(e=>({name:e})),n,t);return}return S(e,p,n,f)'
    );
    applied++;
  }

  // 2. Guard O.set(S,t) WeakMap crash when state is undefined
  const weakMapGuard = /O\.set\(S,t\),P\.set\(JSON\.stringify\(t\),t\)/;
  if (weakMapGuard.test(content)) {
    content = content.replace(
      weakMapGuard,
      'S&&(O.set(S,t),P.set(JSON.stringify(t),t))'
    );
    applied++;
  }

  if (applied > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${file} (${applied} patches)`);
    patched++;
  } else {
    console.log(`WARNING: No patches applied to ${file}`);
  }
}

if (patched === 0) {
  console.error('ERROR: No files were patched!');
  process.exit(1);
}

console.log('Done!');

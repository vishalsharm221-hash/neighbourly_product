const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');

// 1. Read and patch JS bundle
const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith('entry-') && f.endsWith('.js'));
const patches = [];

for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  let applied = 0;

  // --- Routing/asset patches ---

  // 1. Default URL for useLoadedNavigation
  if (content.includes('getUrlWithReactNavigationConcessions=function(t,n="")')) {
    content = content.replace(
      'getUrlWithReactNavigationConcessions=function(t,n="")',
      'getUrlWithReactNavigationConcessions=function(t,n="/neighbourly_product/")'
    );
    applied++;
  } else {
    console.log('  [SKIP] Patch 1: getUrlWithReactNavigationConcessions');
  }

  // 2. Default URL for resolveHref
  if (content.includes('function i(t,a=""){return a?')) {
    content = content.replace(
      'function i(t,a=""){return a?',
      'function i(t,a="/neighbourly_product/"){return a?'
    );
    applied++;
  } else {
    console.log('  [SKIP] Patch 2: resolveHref');
  }

  // 3. Asset paths (/"assets/ → "assets/)
  const assetMatches = content.match(/"\/assets\//g);
  if (assetMatches) {
    content = content.replace(/"\/assets\//g, '"assets/');
    applied++;
  } else {
    console.log('  [SKIP] Patch 3: asset paths');
  }

  // 4. Root path stripping (i=i.replace(e,'') → i=i.replace(e,'/'))
  if (content.includes("i=i.replace(e,'')")) {
    content = content.replace("i=i.replace(e,'')", "i=i.replace(e,'/')");
    applied++;
  } else if (content.includes("i=i.replace(e,'/')")) {
    // Already patched from a previous build iteration
    applied++;
    console.log('  [INFO] Patch 4: already applied');
  } else {
    console.log('  [SKIP] Patch 4: root path stripping');
  }

  // 5. Config path addition - use regex to find config:R, or similar patterns
  // Look for the linking config return statement
  const configRegex = /return\{prefixes:\[\],config:([A-Z]),/;
  const configMatch = content.match(configRegex);
  if (configMatch) {
    const varName = configMatch[1];
    const oldStr = `config:${varName},`;
    const newStr = `config:Object.assign({},${varName},{path:"/neighbourly_product/"}),`;
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      applied++;
    } else {
      content = content.replace(
        /(config:Object\.assign\(\{[^}]*\},[A-Z],\{path:"\/neighbourly_product\/"\}\)),/,
        '$1'
      );
      applied++;
      console.log('  [INFO] Patch 5: already applied');
    }
  } else {
    // Fallback: try direct replacement
    if (content.includes('config:R,')) {
      content = content.replace(
        'config:R,',
        'config:Object.assign({},R,{path:"/neighbourly_product/"}),'
      );
      applied++;
    } else {
      console.log('  [SKIP] Patch 5: config path addition');
    }
  }

  // --- Runtime crash guards ---

  // 6. Fallback in getStateFromPath when no route matches the root path
  // Change: if(void 0===p||void 0===f)return; → fallback using first available config
  // This ensures the root URL always produces a valid navigation state
  const fallbackPattern = /if\(void 0===p\|\|void 0===f\)return;return S\(e,p,n,f\)/;
  if (fallbackPattern.test(content)) {
    content = content.replace(
      fallbackPattern,
      'if(void 0===p||void 0===f){const t=s[0];if(t)return S(e,t.routeNames.map(e=>({name:e})),n,t);return}return S(e,p,n,f)'
    );
    applied++;
  } else {
    console.log('  [SKIP] Patch 6: getStateFromPath fallback');
  }

  // 7. Guard O.set(S,t) when S is undefined (TypeError: Invalid value used as weak map key)
  const weakMapGuard = /O\.set\(S,t\),P\.set\(JSON\.stringify\(t\),t\)/;
  if (weakMapGuard.test(content)) {
    content = content.replace(
      weakMapGuard,
      'S&&(O.set(S,t),P.set(JSON.stringify(t),t))'
    );
    applied++;
  } else {
    // Try alternate pattern with different variable names
    const altWeakMap = /\.set\(([A-Z]),t\),P\.set\(JSON\.stringify\(t\),t\)/;
    const altMatch = content.match(altWeakMap);
    if (altMatch) {
      const varName = altMatch[1];
      content = content.replace(
        altWeakMap,
        `${varName}&&(.set(${varName},t),P.set(JSON.stringify(t),t))`
      );
      applied++;
    } else {
      console.log('  [SKIP] Patch 7: WeakMap crash guard');
    }
  }

  if (applied > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${file} (${applied} patches)`);
    patches.push({ file, applied });
  } else {
    console.log(`WARNING: No patches applied to ${file}`);
  }
}

if (patches.length === 0) {
  console.error('ERROR: No files were patched! The bundle patterns may have changed.');
  process.exit(1);
}

// 2. Patch index.html
let html = fs.readFileSync(indexPath, 'utf-8');
html = html.replace('<title>Localy</title>', '<base href="/neighbourly_product/" />\n    <title>Localy</title>');
html = html.replace('href="/favicon.ico"', 'href="favicon.ico"');
html = html.replace('src="/_expo/', 'src="_expo/');

// 3. Add cache-busting hash to script tag
const hash = crypto.randomBytes(8).toString('hex');
html = html.replace(
  /src="(_expo\/static\/js\/web\/entry-[a-f0-9]+\.js)"/,
  `src="$1?v=${hash}"`
);
fs.writeFileSync(indexPath, html, 'utf-8');
console.log(`Patched index.html (cache-bust: v=${hash})`);

console.log('Done!');

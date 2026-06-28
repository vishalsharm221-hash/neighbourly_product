const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');

// 1. Read and patch JS bundle
const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith('entry-') && f.endsWith('.js'));
let patchCount = 0;

for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  content = content.replace(
    'getUrlWithReactNavigationConcessions=function(t,n="")',
    'getUrlWithReactNavigationConcessions=function(t,n="/neighbourly_product/")'
  );
  content = content.replace(
    'function i(t,a=""){return a?',
    'function i(t,a="/neighbourly_product/"){return a?'
  );
  content = content.replace(/"\/assets\//g, '"assets/');
  content = content.replace(
    'config:R,',
    'config:Object.assign({},R,{path:"/neighbourly_product/"}),'
  );
  content = content.replace("i=i.replace(e,'')", "i=i.replace(e,'/')");

  if (content !== original) {
    patchCount++;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${file}`);
  } else {
    console.log(`WARNING: No patches applied to ${file} - patterns may not match!`);
  }
}

if (patchCount === 0) {
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

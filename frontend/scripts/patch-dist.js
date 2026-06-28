const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');

// 1. Patch index.html
let html = fs.readFileSync(indexPath, 'utf-8');
html = html.replace('<title>Localy</title>', '<base href="/neighbourly_product/" />\n    <title>Localy</title>');
html = html.replace('href="/favicon.ico"', 'href="favicon.ico"');
html = html.replace('src="/_expo/', 'src="_expo/');
fs.writeFileSync(indexPath, html, 'utf-8');
console.log('Patched index.html');

// 2. Patch JS bundle
const jsFiles = fs.readdirSync(jsDir).filter(f => f.startsWith('entry-') && f.endsWith('.js'));
for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const originalSize = content.length;
  
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
  
  const replacedCount = (content.length - originalSize) / 
    ('/neighbourly_product/"'.length - '""'.length);
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Patched ${file}`);
}

console.log('Done!');

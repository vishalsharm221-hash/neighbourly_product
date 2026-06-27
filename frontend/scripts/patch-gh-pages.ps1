# Patches the dist/ output to work when deployed to /neighbourly_product/ on GitHub Pages
param(
    [string]$DistPath = (Join-Path $PSScriptRoot ".." "dist")
)

$DistPath = Resolve-Path $DistPath
$IndexHtml = Join-Path $DistPath "index.html"
$BundleFiles = Get-ChildItem -Path (Join-Path $DistPath "_expo" "static" "js" "web") -Filter "*.js"

Write-Output "Patching dist at: $DistPath"

# 1. Add <base> tag to index.html
$html = Get-Content $IndexHtml -Raw
if ($html -notmatch '<base href=') {
    $html = $html -replace '(<title>.*?</title>)', "`$1`n    <base href=""/neighbourly_product/"" />"
}
# 2. Make paths relative (remove leading / from href/src)
$html = $html -replace '(href|src)="/_expo/', '${1}="_expo/'
$html = $html -replace '(href|src)="/favicon', '${1}="favicon'
Set-Content $IndexHtml -Value $html -NoNewline
Write-Output "  Patched index.html"

# 3. Patch JS bundle - set base URL defaults
foreach ($bundle in $BundleFiles) {
    $content = Get-Content $bundle.FullName -Raw
    
    # Patch getUrlWithReactNavigationConcessions default baseUrl
    $content = $content -replace '(getUrlWithReactNavigationConcessions=function\(t,n="")', '${1}/neighbourly_product/"'
    
    # Patch stripBaseUrl default baseUrl
    $content = $content -replace '(function i\(t,a=""\)\{return a\?)', '${1}/neighbourly_product/"'
    
    # Make absolute /assets/ paths relative (so <base> tag resolves them)
    $content = $content -replace '"/assets/', '"assets/'
    
    Set-Content $bundle.FullName -Value $content -NoNewline
    Write-Output "  Patched $($bundle.Name)"
}

Write-Output "Done!"

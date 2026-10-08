#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path $PSScriptRoot -Parent
$problems = [System.Collections.Generic.List[string]]::new()

$required = @(
  'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'LICENSE',
  'docs/README.md', 'docs/STATUS.md', 'docs/architecture.md',
  'docs/design/game-brief.md', 'docs/decisions/README.md',
  'src/README.md', 'assets/README.md', 'data/README.md', 'tests/README.md',
  'experiments/README.md', 'experiments/_template/README.md',
  'experiments/hex-tiles/README.md', 'tools/README.md',
  '.github/workflows/repository-check.yml'
)
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $path) -PathType Leaf)) {
    $problems.Add("Missing required file: $path")
  }
}
if (Test-Path -LiteralPath (Join-Path $root 'docs/MapTest')) {
  $problems.Add('Obsolete docs/MapTest directory remains.')
}

# Git supplies a consistent file list without traversing dependencies or .git.
$paths = @(git -C $root ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) { throw 'Unable to list repository files.' }
$markdownCount = 0
$svgCount = 0
foreach ($path in $paths) {
  $fullPath = Join-Path $root $path
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    $problems.Add("Tracked file missing: $path")
    continue
  }
  if ($path.EndsWith('.md')) {
    $markdownCount++
    $content = Get-Content -LiteralPath $fullPath -Raw
    # Inline links used by this repository; skip external URLs and anchor-only links.
    foreach ($match in [regex]::Matches($content, '\[[^\]]*\]\(([^)]+)\)')) {
      $target = $match.Groups[1].Value.Trim()
      if ($target -match '^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#|//)') { continue }
      $target = [Uri]::UnescapeDataString(($target -split '[#?]', 2)[0].Trim('<', '>'))
      if (-not $target) { continue }
      $resolved = Join-Path (Split-Path $fullPath -Parent) $target
      if (-not (Test-Path -LiteralPath $resolved)) {
        $problems.Add("Broken local link in ${path}: $target")
      }
    }
  }
  if ($path.EndsWith('.svg')) {
    $svgCount++
    try {
      $settings = [System.Xml.XmlReaderSettings]::new()
      $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
      $settings.XmlResolver = $null
      $reader = [System.Xml.XmlReader]::Create($fullPath, $settings)
      try {
        $document = [System.Xml.XmlDocument]::new()
        $document.XmlResolver = $null
        $document.Load($reader)
      } finally { $reader.Dispose() }
      if ($document.DocumentElement.LocalName -ne 'svg' -or
          $document.DocumentElement.NamespaceURI -ne 'http://www.w3.org/2000/svg') {
        $problems.Add("Not an SVG document: $path")
      }
    } catch { $problems.Add("Invalid SVG ${path}: $($_.Exception.Message)") }
  }
}

$tileDirectory = Join-Path $root 'experiments/hex-tiles'
$patterns = @('endpoint', 'two-edge-adjacent', 'two-edge-separated',
  'two-edge-opposite', 'branch-consecutive', 'branch-asymmetric', 'branch-alternating')
$expected = @('bridge.svg', 'mockups.svg', 'road-empty.svg', 'railroad-empty.svg')
foreach ($kind in @('river', 'road', 'railroad')) {
  foreach ($pattern in $patterns) { $expected += "$kind-$pattern.svg" }
}
$actual = @(Get-ChildItem -LiteralPath $tileDirectory -Filter '*.svg' -File | ForEach-Object Name)
foreach ($difference in @(Compare-Object -ReferenceObject $expected -DifferenceObject $actual)) {
  $problems.Add("Tile inventory mismatch: $($difference.InputObject) ($($difference.SideIndicator))")
}
$tileReadme = Get-Content -LiteralPath (Join-Path $tileDirectory 'README.md') -Raw
foreach ($name in $actual) {
  if (-not $tileReadme.Contains("]($name)")) {
    $problems.Add("Tile missing from README links: $name")
  }
}
if ($problems.Count -gt 0) {
  foreach ($problem in $problems) { Write-Output "ERROR: $problem" }
  exit 1
}
Write-Output "PASS: $markdownCount Markdown files; $svgCount valid SVG documents; 24 tiles and one mockup indexed."

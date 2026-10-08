# Development tools

Run with PowerShell 7 from the repository root:

```powershell
pwsh -NoProfile -File tools/check-repository.ps1
```

The script checks required entry points, relative Markdown file/directory links
(not URL availability or heading anchors), SVG XML validity, and the original
24-tile-plus-one-mockup inventory. It rejects the obsolete SVG directory.
It does not validate rendering, geometry, or game behavior.

When intentionally changing the baseline tile set, update its README and the check's
inventory. GitHub Actions runs the same command on pushes and pull requests.

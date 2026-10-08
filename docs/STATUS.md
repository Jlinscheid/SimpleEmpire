# Project status

Updated: 2026-10-08

## Current state

- Repository organized for a hex-based, turn-based wargame.
- Shared human/assistant workflow in CONTRIBUTING.md and AGENTS.md.
- Existing 24 tile SVGs and one map mockup preserved in
  [experiments/hex-tiles](../experiments/hex-tiles/README.md).
- Experiment catalog and reusable README template available for concept programs.
- Production folders are documented placeholders. No engine, game implementation,
  production test runner, or playable build exists yet.
- [Repository layout decision](decisions/0001-repository-layout.md) accepted.

## Next steps

1. Agree on the [first playable scope](design/game-brief.md) and target platform.
2. Choose a language/engine and record the decision with run/test commands.
3. Explore hex coordinates and movement in a self-contained concept program.
4. Implement a minimal rules core with behavior tests, then connect a map view.

## Validation

Reorganization checks performed on 2026-10-08:

- Repository check passed: 17 Markdown files, 25 valid SVG documents, and the
  complete tile inventory with local file links resolved.
- All 25 moved SVGs matched their original Git object hashes.
- A temporary broken-link probe was correctly rejected and then removed.
- Git whitespace/error check passed. No game tests exist to run yet.
- The CI workflow is configured; its hosted run has not been verified locally.

The repository check covers Markdown file links, SVG XML, and tile inventory.
It does not verify game mechanics, rendering, or heading anchors. See
[tool instructions](../tools/README.md) for the repeatable command.

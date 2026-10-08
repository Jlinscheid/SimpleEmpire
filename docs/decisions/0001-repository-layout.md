# 0001: Repository layout

Status: accepted

Date: 2026-10-08

## Context

The repository began with SVG studies under docs/MapTest. It needs room for a
hex-based, turn-based wargame and collaboration across coding assistants.

## Decision

Separate production code, assets, data, tests, documentation, tools, and experiments.
Move the complete SVG study to experiments/hex-tiles, preserving filenames and local
documentation. Use AGENTS.md for shared instructions and docs/STATUS.md for handoffs.
Defer engine and language selection until implementation requirements are clearer.

## Alternatives

Keeping prototypes under docs would blur documentation and runnable work. Selecting
an engine now would impose dependencies without an agreed first playable scope.

## Consequences

Experiments can evolve independently while production boundaries remain clear.
The layout contains documentation placeholders, not a runnable game. Links using
the former docs/MapTest path must use experiments/hex-tiles instead.

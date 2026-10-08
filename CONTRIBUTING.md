# Contributing

## Shared workflow

Use the same workflow manually, with Codex, or with Herms. Read [AGENTS.md](AGENTS.md)
and [project status](docs/STATUS.md). If an assistant does not discover the
instructions, use this opening prompt:

> Read AGENTS.md and docs/STATUS.md, inspect the working tree, and follow the
> repository instructions while completing this task: <describe the task>.

Choose a small outcome with observable acceptance criteria. Use a short-lived
branch such as feature/hex-neighbors, fix/turn-order, or docs/combat-proposal.
Use separate checkouts or worktrees for simultaneous contributors and coordinate
ownership before editing the same files. Review diffs before merging.

## Where work belongs

- Explore uncertain concepts in [experiments/](experiments/README.md).
- Record proposed rules in [the game brief](docs/design/game-brief.md).
- Record lasting choices in [decision records](docs/decisions/README.md).
- Implement accepted behavior in src/, with production data and assets separate.
- Put production tests in tests/ and repeatable developer commands in tools/.

No particular assistant, paid service, or private memory should be required to
maintain the game. Assistant-specific local settings are optional; shared
instructions and design decisions remain authoritative in the repository.

## Validation and review

Run `pwsh -NoProfile -File tools/check-repository.ps1` from the root.
When code exists, document its build and test commands and add suitable CI checks.
Check relevant behavior rather than writing tests for empty folders.
For art changes, also inspect SVGs visually in a viewer or editor.

Explain the problem, resulting behavior, verification, and unresolved limitations.
Update links when moving files. Keep commits focused and use descriptive imperative
subjects, for example `Add axial hex neighbors`. Do not commit secrets or
machine-specific absolute paths.

## Handoff

Update [STATUS.md](docs/STATUS.md) with progress, open questions, next steps, and
checks performed. Link relevant decisions or experiments so another contributor
can continue from the repository alone.

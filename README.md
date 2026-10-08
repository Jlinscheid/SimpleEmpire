# SimpleEmpire

A hex-based, turn-based wargame of global conquest.

The project is in early design. The current working material is an editable SVG
tile experiment; there is no playable game, selected engine, or game build yet.

## Start here

- Read [the game brief](docs/design/game-brief.md) and [current status](docs/STATUS.md).
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for human and AI collaboration.
- Give Codex, Herms, or another assistant [AGENTS.md](AGENTS.md) as shared instructions.
- Explore [the existing SVG tiles](experiments/hex-tiles/README.md).

## Repository map

| Location | Purpose |
| --- | --- |
| [src/](src/README.md) | Production rules, application flow, and presentation |
| [assets/](assets/README.md) | Approved production art, audio, and other media |
| [data/](data/README.md) | Versioned rules, scenarios, and maps |
| [tests/](tests/README.md) | Automated production tests and fixtures |
| [experiments/](experiments/README.md) | Isolated concept programs, prototypes, and art studies |
| [docs/](docs/README.md) | Design, architecture, decisions, and handoffs |
| [tools/](tools/README.md) | Development and validation tools |

## Check the repository

With PowerShell 7 installed, run from the repository root:

```powershell
pwsh -NoProfile -File tools/check-repository.ps1
```

This checks local Markdown file links, parses SVGs, and verifies the tile inventory.
GitHub Actions runs the same check. No game dependencies are required.
See [the architecture](docs/architecture.md) before adding production code.

## License

[MIT](LICENSE).

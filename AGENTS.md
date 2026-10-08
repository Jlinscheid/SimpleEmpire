# Shared agent instructions

These instructions apply throughout this repository to Codex, Herms, and other
assistants. Keep project knowledge in repository files rather than only in chats
or private memory. If your assistant does not load this file automatically,
explicitly ask it to read it before working.

## Before work

1. Read README.md, CONTRIBUTING.md, docs/STATUS.md, and relevant design documents.
2. Inspect Git status and existing changes. Preserve other contributors' work.
3. State the intended scope. Resolve routine details independently; ask about
   decisions that materially change game design or the requested scope.

## Implementation rules

- Follow docs/architecture.md. Keep simulation rules independent of rendering,
  filesystem access, networking, and wall-clock time.
- Do not select an engine or add a framework merely to fill the scaffold.
- Put exploratory programs in experiments/<name>/ with a README explaining the
  question, run steps, dependencies, findings, and limitations.
- Production must not import from experiments. Promote reviewed work into src/,
  assets/, or data/ with appropriate tests and documentation.
- For rule changes, test behavior, boundary cases, and determinism as applicable.
- Preserve editable SVG sources. Update the hex-tiles inventory and instructions
  when changing tile content or geometry.
- Scope and document dependencies. Never commit credentials, local saves, caches,
  or generated build output.
- Record consequential decisions in docs/decisions/; distinguish accepted choices
  from proposals. Do not describe unimplemented features as complete.

## Finish and hand off

1. Run tools/check-repository.ps1 and relevant tests for the changed component.
2. Review the diff for unrelated changes, broken references, and generated files.
3. Update docs/STATUS.md when progress, decisions, or next steps change.
4. Report changes, checks actually run, limitations, and remaining work.
5. Commit when requested; push or publish only when requested. Do not rewrite
   shared history without explicit authorization.

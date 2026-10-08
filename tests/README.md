# Production tests

Add tests alongside the first implementation and document the runner here.
There are no game tests yet. Keep prototype checks with their experiments.

Prioritize hex neighbors and distances including boundaries, movement costs and
blocked paths, legal turn transitions, command rejection without state corruption,
and reproducible combat once rules are defined. Add scenario-loading and save
round-trip tests when implemented. Introduce small `fixtures/` as needed.

Repository checks live in [tools/check-repository.ps1](../tools/check-repository.ps1).

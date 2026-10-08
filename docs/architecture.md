# Architecture direction

This is a language-neutral plan; there is no production implementation yet.

## Boundaries

| Area | Responsibility | Dependency rule |
| --- | --- | --- |
| src/core/ | Hex topology, state, legal actions, turns, combat | No UI or I/O dependencies |
| src/application/ | Commands, use cases, scenario loading, save coordination | Depends on core; external services through explicit interfaces |
| src/presentation/ | Input, map rendering, feedback | Calls application; does not duplicate rules |
| data/ | Scenario and rule definitions | Validated at application boundary |
| assets/ | Approved media | Used by presentation, not simulation |

Create component folders when code is introduced. Keep the core usable by tests,
a future UI, and future AI without a running renderer.

## Simulation principles

- Prefer explicit state and commands; reject illegal commands without partially
  changing state.
- Aim for reproducible outcomes given an initial state, command sequence, and
  supplied random seed. Inject randomness instead of hiding global generators.
- Define coordinates, neighbor direction ordering, and map boundaries once.
  Keep pixel conversion in presentation. Record the convention before implementing
  it; SVG edge numbering alone does not choose a simulation model.
- Introduce versioned save/scenario formats when persistence is implemented.
- Add multiplayer, advanced AI, and infrastructure only when there is an accepted need.

## Exploration to production

Experiments own their dependencies and run instructions. Production must not import
them. When a concept is accepted, move or adapt it into the appropriate production
area, add behavior tests, record the decision, and update the experiment's findings.

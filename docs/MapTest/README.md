# This is for testign maps

# River hex tiles

Seven river-bearing patterns, distinct under 60-degree rotation and reflection.
Each SVG is standalone and editable in Inkscape; there are no fonts, linked images,
clones, or external dependencies.

| File | Connected edges | Pattern |
| --- | --- | --- |
| `river-endpoint.svg` | 0 | Edge to center endpoint (or source) |
| `river-two-edge-adjacent.svg` | 0, 1 | Adjacent edges |
| `river-two-edge-separated.svg` | 0, 2 | One intervening edge |
| `river-two-edge-opposite.svg` | 0, 3 | Opposite edges |
| `river-branch-consecutive.svg` | 0, 1, 2 | Three consecutive edges; cyclic gaps 1, 1, 4 |
| `river-branch-asymmetric.svg` | 0, 1, 3 | Asymmetric branch; cyclic gaps 1, 2, 3 |
| `river-branch-alternating.svg` | 0, 2, 4 | Alternating edges; cyclic gaps 2, 2, 2 |

## Geometry and editing

All tiles use a 220 x 220 SVG canvas, a point-up regular hexagon of circumradius
and side length 100, and center `(110, 110)`. The hexagon is approximately
173.205081 x 200 units. Edge numbers run clockwise from the upper-right edge:
0 upper right, 1 right, 2 lower right, 3 lower left, 4 left, 5 upper left.
Every river arm meets an edge at its midpoint, perpendicular to that edge.
The river width is 12 units. Each branch has exactly one junction at the center.

Open an individual SVG in Inkscape. In Layers and Objects, edit the **Hexagon**
and **River — editable arms** layers separately. Each arm is a normal path;
the center disk keeps the junction or endpoint rounded. Change the arm stroke
and center disk fill together to recolor the river.

All **Flow** layers are hidden by default. Reveal exactly one to add arrows:

- Endpoint and two-edge tiles have forward and reverse layers.
- Each branch has three confluence layers (two incoming arms, one outgoing)
  and three distributary layers (one incoming arm, two outgoing). Their labels
  identify the single outlet or inlet, so every possible choice is available.
- Arrow paths and the SVG arrowhead marker remain editable. Flow direction is
  independent of the seven underlying undirected tile shapes.

For precise transforms of a complete tile, wrap all layer groups in one group
and apply `rotate(60 110 110)` (or a multiple of 60). Mirror horizontally with
`translate(220 0) scale(-1 1)`, or vertically with
`translate(0 220) scale(1 -1)`. Include hidden flow layers in the transform so
arrows remain aligned. Transforming only river and flow groups also works when
the hexagon should stay fixed. Edge labels describe the original orientation.

The 220-unit page includes margins; it is not the map grid spacing. For a
point-up hex grid, use horizontal center spacing `100*sqrt(3)` and vertical
row spacing `150`, staggering alternate rows by `50*sqrt(3)`. Rivers then meet
at neighboring edge midpoints. Hide the Hexagon layer for river-only overlays.

The seven classes cover all selections of one, two, or three edges modulo
rotation and reflection. Blank tiles, four-or-more-edge junctions, loops, and
multiple independent rivers within one tile are outside this set.

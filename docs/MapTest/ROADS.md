# Road hex tiles

These tiles apply the river connection rules to an undirected road network:
one edge-to-center endpoint, two connected edges, or three arms joining at a
single center junction. All arms belong to the same road system.

There are seven distinct road-bearing patterns under 60-degree rotation and
mirroring, plus an optional empty tile:

| File | Connected edges | Shape |
| --- | --- | --- |
| `road-endpoint.svg` | 0 | Road terminates at center |
| `road-two-edge-adjacent.svg` | 0, 1 | Adjacent edges |
| `road-two-edge-separated.svg` | 0, 2 | One intervening edge |
| `road-two-edge-opposite.svg` | 0, 3 | Straight through |
| `road-branch-consecutive.svg` | 0, 1, 2 | Three consecutive edges |
| `road-branch-asymmetric.svg` | 0, 1, 3 | Asymmetric three-arm junction |
| `road-branch-alternating.svg` | 0, 2, 4 | Symmetric Y junction |
| `road-empty.svg` | None | Optional blank hexagon |

Each standalone Inkscape-compatible SVG has a transparent background, a separate
**Hexagon** outline layer, and a **Road — editable arms** layer. Roads are brown,
12 units wide, and have no direction arrows. Each arm is a normal editable path;
a matching center disk rounds the endpoint or joins the arms. Recolor the arm
strokes and center disk together. Hide the Hexagon layer for road-only overlays.

Geometry matches the river set: 220 x 220 canvas, regular point-up hexagon with
side length and circumradius 100, center `(110,110)`. Each connection is at an
edge midpoint, perpendicular to that edge. Edge numbering starts at upper right
with 0 and increases clockwise through 5.

Group all layers to transform a whole tile. Rotate by `rotate(60 110 110)` or a
multiple of 60; mirror using `translate(220 0) scale(-1 1)` horizontally or
`translate(0 220) scale(1 -1)` vertically. Geometry and grid spacing are identical
to those documented in [README.md](README.md).

Three-arm tiles have one degree-three junction. Only the alternating pattern is
an evenly spaced Y; the other two preserve the other distinct edge selections.
No tile contains disconnected roads, loops, or more than three connections.

## Bridge overlay

Use [bridge.svg](bridge.svg) above the straight-through road tile and river at
the same page origin. This is one additional overlay, separate from the eight
road tiles listed above. It has a transparent background, a hidden optional
hexagon guide, and an editable Bridge layer with a brown deck and dark parapets.
Its initial orientation matches road edges 0 and 3. Rotate the entire Bridge
layer by 60 or 120 degrees about `(110, 110)` to match other straight-road
orientations; 180 degrees repeats the same shape. See the
[bridge instructions](README.md#bridge-overlay) for dimensions and layer order.

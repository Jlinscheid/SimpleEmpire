# Map testing: river and road hex tiles

This directory contains seven river tiles and eight road tiles (including an
optional empty tile), plus the separate [map mockup](mockups.svg).
This README is the main index for tile additions and changes.

## Shared tile rules

The seven connected patterns in each set are distinct under 60-degree rotation
and reflection. Connections meet the midpoints of hexagon edges. A tile may end
at the center (one connection), pass through (two), or join three arms at one
center junction. All arms belong to one connected system. Only the alternating
three-arm pattern forms an evenly spaced Y; the others cover the remaining edge
selections. Four-or-more-edge junctions, loops, and disconnected systems are
outside these sets. The optional empty road tile has no connections.

Each individual tile SVG is standalone and editable in Inkscape; there are no fonts, linked images,
clones, or external dependencies. Hexagon fills are transparent; outlines remain visible.
River strokes are blue (`#3d9fc4`); road strokes are brown (`#806044`).
The separate mockup is not part of the standardized tile set.

## River tile files

| File | Connected edges | Pattern |
| --- | --- | --- |
| [river-endpoint.svg](river-endpoint.svg) | 0 | Edge to center endpoint (or source) |
| [river-two-edge-adjacent.svg](river-two-edge-adjacent.svg) | 0, 1 | Adjacent edges |
| [river-two-edge-separated.svg](river-two-edge-separated.svg) | 0, 2 | One intervening edge |
| [river-two-edge-opposite.svg](river-two-edge-opposite.svg) | 0, 3 | Opposite edges |
| [river-branch-consecutive.svg](river-branch-consecutive.svg) | 0, 1, 2 | Three consecutive edges; cyclic gaps 1, 1, 4 |
| [river-branch-asymmetric.svg](river-branch-asymmetric.svg) | 0, 1, 3 | Asymmetric branch; cyclic gaps 1, 2, 3 |
| [river-branch-alternating.svg](river-branch-alternating.svg) | 0, 2, 4 | Alternating edges; cyclic gaps 2, 2, 2 |

## Road tile files

| File | Connected edges | Pattern |
| --- | --- | --- |
| [road-endpoint.svg](road-endpoint.svg) | 0 | Edge to center endpoint |
| [road-two-edge-adjacent.svg](road-two-edge-adjacent.svg) | 0, 1 | Adjacent edges |
| [road-two-edge-separated.svg](road-two-edge-separated.svg) | 0, 2 | One intervening edge |
| [road-two-edge-opposite.svg](road-two-edge-opposite.svg) | 0, 3 | Straight through |
| [road-branch-consecutive.svg](road-branch-consecutive.svg) | 0, 1, 2 | Three consecutive edges |
| [road-branch-asymmetric.svg](road-branch-asymmetric.svg) | 0, 1, 3 | Asymmetric junction |
| [road-branch-alternating.svg](road-branch-alternating.svg) | 0, 2, 4 | Symmetric Y junction |
| [road-empty.svg](road-empty.svg) | None | Optional empty hexagon |

Roads are undirected and have no flow-arrow layers. The empty tile contains only
the visible hexagon outline and an empty road layer. See [ROADS.md](ROADS.md)
for additional road-specific notes.

## Geometry and editing

All tiles use a 220 x 220 SVG canvas, a point-up regular hexagon of circumradius
and side length 100, and center `(110, 110)`. The hexagon is approximately
173.205081 x 200 units. Edge numbers run clockwise from the upper-right edge:
0 upper right, 1 right, 2 lower right, 3 lower left, 4 left, 5 upper left.
On nonempty tiles, every river or road arm meets an edge at its midpoint, perpendicular to that edge.
Both use a width of 12 units. Each branch has exactly one junction at the center.

Open an individual SVG in Inkscape. In Layers and Objects, edit the **Hexagon**
and **River — editable arms** or **Road — editable arms** layers separately. Each arm is a normal path;
the center disk keeps the junction or endpoint rounded. Change the arm stroke
and center disk fill together to recolor the river or road. Hide the Hexagon
layer for river-only or road-only overlays. Transparent areas may appear white
in an editor; they have no background fill.

### Optional river flow arrows

All river **Flow** layers are hidden by default. Reveal exactly one to add arrows:

- Endpoint and two-edge tiles have forward and reverse layers.
- Each branch has three confluence layers (two incoming arms, one outgoing)
  and three distributary layers (one incoming arm, two outgoing). Their labels
  identify the single outlet or inlet, so every possible choice is available.
- Arrow paths and the SVG arrowhead marker remain editable. Flow direction is
  independent of the seven underlying undirected tile shapes.

### Rotation, mirroring, and grid placement

For precise transforms of a complete tile, wrap all layer groups in one group
and apply `rotate(60 110 110)` (or a multiple of 60). Mirror horizontally with
`translate(220 0) scale(-1 1)`, or vertically with
`translate(0 220) scale(1 -1)`. Include hidden flow layers in the transform so
arrows remain aligned. Transforming only the road group, or river and flow groups, also works when
the hexagon should stay fixed. Edge labels describe the original orientation.

The 220-unit page includes margins; it is not the map grid spacing. For a
point-up hex grid, use horizontal center spacing `100*sqrt(3)` and vertical
row spacing `150`, staggering alternate rows by `50*sqrt(3)`. Matching river or road connections meet at neighboring edge midpoints when their connected edges face each other.

## Maintenance

Update this README whenever tiles are added or changed, including file inventories,
background appearance, layer behavior, and geometry or editing instructions.
Keep [ROADS.md](ROADS.md) consistent with road-specific changes.

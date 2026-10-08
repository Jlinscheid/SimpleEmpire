# Map testing: river, road, railroad, and bridge hex tiles

This directory contains 24 tile SVGs: seven river tiles, eight road tiles, eight railroad tiles, and one bridge overlay. Roads and railroads each include an optional empty tile.
The separate [map mockup](mockups.svg) is not included in this count.
This README is the main index for tile additions and changes.

## Shared tile rules

The seven connected patterns in each set are distinct under 60-degree rotation
and reflection. Connections meet the midpoints of hexagon edges. A tile may end
at the center (one connection), pass through (two), or join three arms at one
center junction. All arms belong to one connected system. Only the alternating
three-arm pattern forms an evenly spaced Y; the others cover the remaining edge
selections. Four-or-more-edge junctions, loops, and disconnected systems are
outside these sets. The optional empty road and railroad tiles have no connections.

Each individual tile SVG is standalone and editable in Inkscape; there are no fonts, linked images,
clones, or external dependencies. Hexagon fills are transparent; outlines remain visible.
River strokes are blue (`#3d9fc4`); road strokes are brown (`#806044`).
Railroad rails are charcoal (`#374151`) with brown ties (`#806044`).
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

## Bridge overlay

[bridge.svg](bridge.svg) is the single rotatable bridge tile. It shares the
220 x 220 canvas and center `(110, 110)` with the road tiles. Place it at the
same page origin as `road-two-edge-opposite.svg`, above both the road and river.
The bridge initially follows the road axis between edges 0 and 3.

The background is transparent and the optional **Hexagon — optional alignment
guide** layer is hidden by default. The **Bridge — editable deck and parapets**
layer contains a solid brown deck and two dark, flared side parapets; all shapes
are independently editable. The 16-unit-wide, 48-unit-long deck covers the
12-unit road and the river at the crossing; its ends leave the road visible.
It adds no edge connections and needs no separate mirrored version.

Rotate the entire Bridge layer around `(110, 110)` using
`rotate(60 110 110)` or `rotate(120 110 110)` to match the other straight-road
orientations. A 180-degree rotation repeats the same bridge. Keep its internal
30-degree alignment transform intact. For a crossing, place the river on a
different axis from the road, with the bridge above both.

## Railroad tile files

| File | Connected edges | Pattern |
| --- | --- | --- |
| [railroad-branch-alternating.svg](railroad-branch-alternating.svg) | 0, 2, 4 | Symmetric Y junction |
| [railroad-branch-asymmetric.svg](railroad-branch-asymmetric.svg) | 0, 1, 3 | Asymmetric junction |
| [railroad-branch-consecutive.svg](railroad-branch-consecutive.svg) | 0, 1, 2 | Three consecutive edges |
| [railroad-empty.svg](railroad-empty.svg) | None | Optional empty hexagon |
| [railroad-endpoint.svg](railroad-endpoint.svg) | 0 | Edge to center endpoint |
| [railroad-two-edge-adjacent.svg](railroad-two-edge-adjacent.svg) | 0, 1 | Adjacent edges |
| [railroad-two-edge-opposite.svg](railroad-two-edge-opposite.svg) | 0, 3 | Straight through |
| [railroad-two-edge-separated.svg](railroad-two-edge-separated.svg) | 0, 2 | One intervening edge |

Railroads use the same seven connected patterns as roads, plus an empty tile.
They are undirected and have no flow-arrow layers. Each file has **Hexagon**,
**Railroad — ties**, and **Railroad — rails and junction** layers. Ties and rails
are individual editable paths. Hide the Hexagon layer for a railroad-only overlay.
The empty tile has an outline and two empty railroad layers.

Two 2-unit rail strokes sit 8 units apart, centered on each connection axis.
Brown ties are 16 units long and 3 units thick, spaced every 10 units from 14
through 84 units from the center. The rail pair straddles the edge midpoint and
meets matching rails on adjacent tiles. A charcoal center disk of radius 5
marks the shared junction or endpoint. This is a schematic map symbol, not a
physical turnout or track-engineering diagram. Recolor rails and the center
disk together; recolor the ties separately. Gaps between rails remain transparent.

## Geometry and editing

All tiles use a 220 x 220 SVG canvas, a point-up regular hexagon of circumradius
and side length 100, and center `(110, 110)`. The hexagon is approximately
173.205081 x 200 units. Edge numbers run clockwise from the upper-right edge:
0 upper right, 1 right, 2 lower right, 3 lower left, 4 left, 5 upper left.
On nonempty tiles, every connection axis meets an edge at its midpoint, perpendicular
to that edge. River and road arms use a width of 12 units; railroad dimensions
are listed above. Each branch has exactly one junction at the center.

For river and road tiles, open an individual SVG in Inkscape. In Layers and Objects, edit the **Hexagon**
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
arrows remain aligned. To leave the hexagon fixed, transform only the road group, the river and flow
groups together, or both railroad layers together. Edge labels describe the original orientation.

The 220-unit page includes margins; it is not the map grid spacing. For a
point-up hex grid, use horizontal center spacing `100*sqrt(3)` and vertical
row spacing `150`, staggering alternate rows by `50*sqrt(3)`. Matching river, road, or railroad connections meet at neighboring edge midpoints when their connected edges face each other.

## Maintenance

Update this README whenever tiles are added or changed, including file inventories,
background appearance, layer behavior, and geometry or editing instructions.
Keep [ROADS.md](ROADS.md) consistent with road-specific changes.

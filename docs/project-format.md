# Portable project files

```json
{
  "application": "SpaceSketch",
  "schemaVersion": 1,
  "plan": {
    "version": 1,
    "title": "My space",
    "length": 6000,
    "width": 4000,
    "items": []
  }
}
```

All coordinates and dimensions are millimetres. The room is rectangular, between 1,000 and 20,000 mm on each axis, in 50 mm increments. Up to 100 components and a 100-character title are accepted. Imports are limited to 128,000 bytes.

Each component has a unique string `id`, a known `kind`, numeric `x`, `y`, `width`, `depth`, and rotation `0 | 90 | 180 | 270`. Wall-bound components may carry `wall: top | right | bottom | left`; doors may carry `flipped: true`.

`parseProject` validates the envelope and passes the plan to `parsePlan`. Unknown component kinds, unsupported versions, duplicate IDs, non-finite numbers, non-positive sizes and unsupported room dimensions are rejected. Allowed fields are reconstructed, so unknown properties do not enter application state. Accepted component dimensions and positions are constrained to fit the room; an import may therefore normalize out-of-bounds positions.

An invalid import leaves the current layout untouched. A valid import is an ordinary history step and can be undone. An exported file contains the plan only, not the undo history, UI selection or viewport state.

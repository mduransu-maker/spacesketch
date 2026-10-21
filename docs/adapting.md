# Adapting the planner

SpaceSketch is a small application, not a packaged drop-in SDK. You can fork it and adapt these pieces independently.

## Components

1. Add a literal to `PartKind` in `src/lib/model.ts`.
2. Add its default dimensions, group, label, code and wall-binding behavior to `PARTS`.
3. Render its top-view symbol in `PartSymbol` in `src/components/plan-svg.tsx`.
4. Add the matching library icon in `src/components/planner.tsx`.
5. Add appropriate constraints and conflict hints, plus meaningful boundary tests.

Dimensions use **millimetres**. Coordinates refer to the top-left of the room outline; a component's `x`/`y` is its symbol centre/anchor. The 50 mm position grid is distinct from physical installation tolerances. Wall-bound parts use `wall`; free-standing parts use position and rotation.

The PDF list derives labels and counts from `PARTS`. A new SVG symbol appears in the PDF drawing because export snapshots the same drawing at its full view box. Review PDF pagination and spacing when adding more types.

## Templates and industry-specific rules

`src/lib/templates.ts` defines synthetic starting layouts using the same constructors and constraints as the editor. Keep templates independent of real customer projects.

For example:

| Use case | Useful additions | Information to verify first |
| --- | --- | --- |
| Retail display | Counter, rail, display stand | Actual footprints and access requirements |
| Creative studio | Workbench, equipment station | Operating space and installation requirements |
| Modular room | Additional openings and service symbols | Real dimensions and valid placement rules |

Extend the model deliberately if you need mounting heights, service connections or manufacturer clearances. These are not currently inferred from the drawing.

## Embedding and branding

`src/app.tsx` contains the standalone shell; `src/components/planner.tsx` contains the editor. Replace the shell or incorporate the editor into your own React application and include both stylesheets. This repository does not currently expose a stable published component API.

PDF branding is in `src/lib/pdf.ts`. Do not place personal contact information or secrets in a public fork. Keep commercial pricing and sensitive product data outside client bundles.

## Storage

The editor autosaves a validated plan under `spacesketch-plan-v1` in localStorage. JSON files have a separate explicit application/schema envelope. A different product or schema should use its own storage key, migration handling and file version.

There is no backend. Adding one changes the privacy and security model: validate again on the server, limit input sizes and add access control, rate limiting and retention rules appropriate to that use case.

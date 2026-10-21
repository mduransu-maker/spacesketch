# v0.1.0 verification

Checked on 2026-10-21.

- Ten automated tests cover geometry, bounds, wall snapping, undo/redo, plan validation, custom dimensions, independent starter layouts and portable project files.
- TypeScript checks and Vite production build pass.
- Browser checks at 320, 390, 900 and 1440 px: no document-wide horizontal overflow. These are viewport tests, not physical-device certification.
- Mobile Components → add → Plan → Details flow exercised.
- Custom length rounded to the 50 mm grid; saved JSON reopened successfully. Import is undoable. Invalid imported version left the current layout intact.
- Actual exported PDF checked: two readable pages, complete plan plus component list, neutral visible text and document metadata.
- Local privacy review: no bundled business media, private documents, contact destinations or original Git history. Neutral example layout only. No submission service or telemetry.

Known limitations are documented in the README. A local review and passing dependency audit are not a security guarantee or an engineering validation of a drawn layout.

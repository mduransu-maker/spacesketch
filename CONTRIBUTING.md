# Contributing to SpaceSketch

Small, focused contributions are welcome.

1. Open an issue describing the problem or proposed use case. Use synthetic layouts, never customer or confidential data.
2. Fork the repository and create a branch.
3. Run `npm ci`, then `npm run dev`.
4. For geometry, file formats or history changes, add tests for the relevant boundary cases.
5. Run `npm test` and `npm run build`; check both desktop and mobile layouts when changing the interface.
6. Open a pull request explaining the resulting behavior and relevant checks.

Keep core geometry independent of React. Avoid introducing accounts, external uploads or tracking as incidental changes. Changes to the portable file format require explicit versioning and compatibility handling. Describe the scope of new layout checks accurately: a warning is not technical approval.

Do not post credentials, private documents, sensitive project files or unnecessary personal information in issues, pull requests or screenshots.

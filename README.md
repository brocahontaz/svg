# SVG

A lightweight, fully client-side SVG inspector and optimizer. Paste or load SVG markup,
inspect its structure, preview a sanitized version, and produce formatted, minified, or
optimized output — nothing leaves your browser. It is part of a family of small self-hosted
tools (Portal, Paste, QR, Blueprint, Regex, Cron, Tools, and Palette) sharing a clean,
dark-first interface.

## Features

- Paste, upload, or drag and drop SVG files, with a 2 MB input limit.
- Live sanitized preview in a sandboxed iframe with a checkerboard background.
- Metadata for raw and pixel width/height, viewBox, element and path counts, and file size.
- A structure inspector with a clear truncation note for very large trees.
- Format, minify, and optimize SVGs; optimization passes are independently toggleable and
  report the actions they performed.
- Before/after byte sizes and reduction percentage, plus copy, download, and use-as-source
  actions.

## Privacy

The application runs entirely client-side and makes no network calls for SVG content. SVG
content is not persisted. There are no accounts, analytics, telemetry, or tracking.

## Security

Input is parsed as XML with clear parser errors and size limits. The preview uses a
`sandbox=""` iframe and a sanitizer that removes scripts, event-handler attributes,
`javascript:`-style URLs, external resources, `foreignObject`, and SMIL animations that
target href. Production CSP and security headers are supplied by nginx.

## Local development

Requires Node 22+.

```sh
npm install
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker

```sh
docker compose up --build
docker build -t svg-utility:local .
docker run --rm -p 8080:8080 svg-utility:local
```

The app is served on port 8080 by an unprivileged nginx and includes a healthcheck.

## Published image

The published image is `ghcr.io/brocahontaz/svg`, with `latest`, `sha-<commit>`, and
`vX.Y.Z` tags. Behind a reverse proxy, forward traffic to port 8080 and terminate TLS there.

## CI/CD

CI runs formatting, linting, typecheck, tests, and a production build on pushes and pull
requests. Docker images publish only from `main` and `v*` tags, never from pull requests,
using the `latest`, `sha-<commit>`, and version tags.

## Limitations

This is not a vector editor and does not edit nodes. It deliberately does not perform
path-data precision optimization.

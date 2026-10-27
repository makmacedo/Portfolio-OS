# Portfolio OS

Interactive desktop portfolio built with HTML, CSS and JavaScript.

## Local preview

Serve the project root with a static HTTP server, for example:

```sh
python -m http.server 8000
```

Open http://localhost:8000, wait for the boot sequence and select the standard user. Resume opens automatically.

## Resume app

The Resume window embeds `viewer/index.html`, a Mozilla PDF.js viewer with page navigation, selectable text, zoom and print controls. Open PDF and Download link directly to the original document. The CV stays on this hosting account; PDF.js assets load from a version-pinned CDN. A browser PDF plugin is not required. Open PDF and Download remain available if the CDN cannot be reached.

The approved CV is stored at `media/documents/Arcadio_Macedo_CV.pdf`. Replace that file to update the viewer and download together. Keep the static portfolio's `assets/Arcadio_Macedo_CV.pdf` in sync.

PDF.js 6.4.299 loads from `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/`. The renderer, worker, viewer CSS and fallback fonts use the same pinned release. No vendor files, dependency installation or build step are required.

This suits the current Hostinger deployment: a push to `master` triggers a webhook that pulls the static repository. The local module uses a `.js` extension for compatibility with shared-hosting MIME defaults. Use HTTP(S), not a local file URL. PDF.js is maintained by Mozilla and licensed under Apache-2.0: https://github.com/mozilla/pdf.js/blob/master/LICENSE

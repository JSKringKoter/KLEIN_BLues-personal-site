# KLEIN BLues Astro site

The complete personal archive now runs on Astro. The homepage keeps the established art direction and interactions, while fiction, unfinished writing, and technical notes are compiled into permanent static routes.

## Commands

```powershell
npm install
npm run import:fiction -- "C:\Users\Klein Blues\Desktop\KleinBlues-personal site-rebuild\assets\text\finished"
npm run import:drafts -- "C:\Users\Klein Blues\Desktop\KleinBlues-personal site-rebuild\assets\text\unfinished"
npm run import:notes -- "C:\Users\Klein Blues\Desktop\KleinBlues-personal site-rebuild"
npm run dev
npm run build
```

## Content routes

- Completed fiction: `src/content/fiction/*.md` -> `/fiction/[slug]/`
- Unfinished fiction: `src/content/drafts/*.md` -> `/unfinished/[slug]/`
- Technical notes: `src/content/notes/*.md` -> `/notes/[slug]/`
- Cangqiong worldbuilding: `/worldbuildings/cangqiong/`
- Portrait gallery: `/worldbuildings/portraits/`
- Portraits, photography, map data, and homepage media: `public/assets/`

The homepage WORLDBUILDINGS section links to the Cangqiong introduction and the standalone portrait gallery. Its entry cards live in `src/components/WorldbuildingEntries.astro`; the gallery and shared image viewer live in `PortraitGallery.astro` and `ImageViewer.astro`. Both worldbuilding pages use `WorldLayout.astro`, with their new styles in `public/worldbuildings.css`. The portrait page reuses the original gallery runtime in `public/app.js`.

The homepage currently uses the preserved interaction runtime in `public/app.js` while its content routes and SEO are owned by Astro. This keeps visual and interaction parity during the component-by-component modernization.

If Astro telemetry cannot write to the local user profile in a restricted environment, run commands with `ASTRO_TELEMETRY_DISABLED=1`. This is not required on Vercel.

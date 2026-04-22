title: "Web preview tool: remaining improvements"

---

The web-based interactive preview tool (`web/`) landed via the `claude/timeline-preview-tool-haer6` branch. Below are the remaining tasks to polish it.

## Functional improvements

- [ ] **Wire git inputs to the preview** — the branch/status input fields exist in the UI but don't actually update the rendered preview. The renderer uses hardcoded mock git values (see `evalGit()` in `renderer.ts`).
- [ ] **Persist form state to `localStorage`** — so users don't lose their work-in-progress format string on page reload.
- [ ] **Share via URL** — encode the current format string + settings into a query param so users can share previews.

## UX / design

- [ ] **Error boundary UI** — show a user-friendly message when the renderer throws instead of a raw error span.
- [ ] **Mobile responsiveness pass** — verify the segment palette and terminal preview work well on small screens.
- [ ] **Accessibility audit** — ensure proper ARIA labels, keyboard navigation, and colour contrast.

## Infrastructure

- [ ] **Enable GitHub Pages in repo settings** — set Pages source to "GitHub Actions" so the `deploy-preview.yml` workflow can deploy.
- [ ] **Add link to README** — once deployed, add a "Try it online" link to the project README.
- [ ] **Add web build to CI** — ensure `web/` builds successfully on PRs to catch regressions.

## Nice-to-haves

- [ ] **Export to image / SVG** — let users screenshot their status line preview.
- [ ] **Diff view** — show before/after when switching themes.
- [ ] **Usage analytics** — lightweight analytics to understand which themes are popular.

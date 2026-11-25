# PROGYNON / DEPOT — A Molecular Dossier

An interactive research dossier on **プロギノン・デポー筋注10mg** (Fuji Pharma, estradiol valerate 10 mg/mL), its official Japanese label, MtF GAHT guidelines, pharmacokinetics, safety, insurance and the 2026 supply fracture.

## Live

- **Primary:** https://verlintas.dev/v/PDfuji/
- **GitHub Pages alias:** https://verlintas.dev/PDfuji/
- **Full dossier:** https://verlintas.dev/v/PDfuji/dossier.html

## Local files

- `index.html` — visual, interactive dossier
- `dossier.html` — all ten report files, rendered
- `dossier/*.md` — raw Markdown downloads
- `assets/` — CSS, JS, SVG, OG image

## Build / deploy

```bash
python3 tools/build_dossier.py
python3 tools/deploy_site.py
```

**Not medical advice.** The product is a Japanese prescription drug; MtF GAHT use is off-label and, in principle, uninsured. The site is a research object, not a treatment guide.

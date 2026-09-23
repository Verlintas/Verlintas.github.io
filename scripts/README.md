# scripts

Build and maintenance scripts for this site.

| Script | Purpose | Run |
| --- | --- | --- |
| `build-nlu-data.mjs` | Builds the Empty-X datasets (`assets/data/*.json`) from public corpora: periodic table, idioms, countries, xiaohuangji + ALICE chit-chat. Bump `manifest.version` so browsers refresh their cache. | `node scripts/build-nlu-data.mjs` |
| `status.py` | Probes the five NUSV sites, the X account and GitHub activity, then writes `status.json` (also run by the `Service Status` workflow every 15 minutes). | `python3 scripts/status.py` |

Datasets are committed on purpose — the site serves them same-origin so no external CDN is required at runtime.

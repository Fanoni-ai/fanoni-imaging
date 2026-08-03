# OHIF version pin (Fanoni Imaging)

| Field | Value |
|---|---|
| Clone path | `/Users/dafe/repos/fanoni-imaging` |
| Upstream remote | `origin` → `https://github.com/OHIF/Viewers.git` |
| Fanoni remote | `fanoni` → `https://github.com/Fanoni-ai/fanoni-imaging.git` |
| Branch (this work) | `feature/ohif-full-modes-sample-data` |
| Working tree SHA | `5c6620a6f8d27cffa5a685579abadedac4e11a55` |
| Based on | `v3.13.0-beta.81` + Fanoni AWS HealthImaging config |
| Latest fetched upstream | `origin/master` = `v3.14.0-beta.8` (`c7adb4939b2610c00560eb4e14ade9cf532801e8`) |
| Fetched at | 2026-08-03 |

## Upgrade path

`git merge origin/master` was attempted 2026-08-03 and aborted: conflicts concentrated
in Fanoni-branded docs / `default.js` / Docusaurus (not in modes/extensions source).
Re-attempt on a dedicated upgrade branch; keep `platform/app/public/config/fanoni-aws.js`.

```bash
cd /Users/dafe/repos/fanoni-imaging
git fetch origin --tags
git merge origin/master   # resolve conflicts; keep fanoni-aws.js
yarn install --frozen-lockfile
APP_CONFIG=config/fanoni-aws.js yarn build
```

Then overlay / sync `app-config.js` from `fanoni-ehr/fanoni-healthimaging/ohif/` onto the
CloudFront bucket (see that README). Do **not** laptop-deploy production.

Modes already in this tree (loaded when `modes: []`): basic, longitudinal (`viewer`),
segmentation, tmtv, microscopy, preclinical-4d (`dynamic-volume`), usAnnotation.

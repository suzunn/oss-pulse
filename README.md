# oss-pulse

Live dashboard of [@suzunn](https://github.com/suzunn)'s open-source contributions:
merged pull requests over the last 12 months, PRs currently open for review, and
the repositories they landed in.

**→ [suzunn.github.io/oss-pulse](https://suzunn.github.io/oss-pulse/)**

## How it works

- [`scripts/build-data.mjs`](scripts/build-data.mjs) queries the GitHub API and
  writes [`data.json`](data.json).
- A [GitHub Action](.github/workflows/update.yml) runs it daily and commits the
  result — no manual edits, ever.
- [`index.html`](index.html) is a dependency-free static page that renders the
  data: stat tiles, a monthly bar chart, and PR lists.

Part of an AI-assisted contribution pipeline: the pipeline drafts and maintains,
a human reviews, quality gates decide.

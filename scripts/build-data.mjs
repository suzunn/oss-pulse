#!/usr/bin/env node
/**
 * Builds data.json for the oss-pulse dashboard from the GitHub API.
 * Requires GITHUB_TOKEN in the environment (provided by GitHub Actions).
 */

const USER = "suzunn";
const API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${path}: ${await res.text()}`);
  }
  return res.json();
}

async function searchAll(query, maxPages = 5) {
  const items = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const data = await api(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}&sort=updated`
    );
    total = data.total_count;
    items.push(...data.items);
    if (items.length >= total || data.items.length === 0) break;
  }
  return { total, items };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function repoFromUrl(repositoryUrl) {
  return repositoryUrl.replace(`${API}/repos/`, "");
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function lastTwelveMonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

const since = isoDaysAgo(365);

const [user, merged, open] = await Promise.all([
  api(`/users/${USER}`),
  searchAll(`is:pr author:${USER} is:merged merged:>=${since} -user:${USER}`),
  searchAll(`is:pr author:${USER} is:open -user:${USER}`),
]);

const monthKeys = lastTwelveMonthKeys();
const monthly = Object.fromEntries(monthKeys.map((k) => [k, 0]));
for (const pr of merged.items) {
  const key = monthKey(pr.pull_request?.merged_at ?? pr.closed_at ?? pr.updated_at);
  if (key in monthly) monthly[key] += 1;
}

const mergedRepos = {};
for (const pr of merged.items) {
  const repo = repoFromUrl(pr.repository_url);
  mergedRepos[repo] = (mergedRepos[repo] ?? 0) + 1;
}

const data = {
  generatedAt: new Date().toISOString(),
  user: {
    login: user.login,
    followers: user.followers,
    publicRepos: user.public_repos,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
  },
  mergedLast12Months: {
    total: merged.total,
    monthly: monthKeys.map((k) => ({ month: k, count: monthly[k] })),
    byRepo: Object.entries(mergedRepos)
      .map(([repo, count]) => ({ repo, count }))
      .sort((a, b) => b.count - a.count),
    recent: merged.items
      .sort((a, b) =>
        (b.pull_request?.merged_at ?? "").localeCompare(a.pull_request?.merged_at ?? "")
      )
      .slice(0, 10)
      .map((pr) => ({
        title: pr.title,
        repo: repoFromUrl(pr.repository_url),
        url: pr.html_url,
        mergedAt: pr.pull_request?.merged_at ?? null,
      })),
  },
  openPrs: open.items
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((pr) => ({
      title: pr.title,
      repo: repoFromUrl(pr.repository_url),
      url: pr.html_url,
      updatedAt: pr.updated_at,
    })),
};

const { writeFile } = await import("node:fs/promises");
await writeFile(new URL("../data.json", import.meta.url), JSON.stringify(data, null, 2) + "\n");
console.log(
  `data.json written: ${merged.total} merged (12mo), ${open.total} open, ${user.followers} followers`
);

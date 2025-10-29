#!/usr/bin/env node
// Copyright © 2025 Cai Frazier.
// Compare all PageRecords in an .atls archive to live HTTP fetches of each URL.
// Usage: node scripts/compare-curl-all.mjs <path-to.atls> [--originFilter https://www.example.com]

import { openAtlas } from '@atlas/sdk';
import * as cheerio from 'cheerio';
import { fetch } from 'undici';

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    if (url.pathname === '') url.pathname = '/';
    return url.toString();
  } catch {
    return u;
  }
}

function extractFromHtml(html, finalUrl, headers, status) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr('content') || null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href') || null;
  const metaRobots = $('meta[name="robots"]').attr('content') || null;
  const hreflangLinks = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ({ lang: $(el).attr('hreflang'), url: $(el).attr('href') }))
    .get();
  const linksCount = $('a[href]').length;
  const assets = {
    stylesheets: $('link[rel="stylesheet"][href]').length,
    scripts: $('script[src]').length,
    images: $('img[src]').length,
  };
  const contentType = headers.get('content-type') || null;
  const server = headers.get('server') || null;
  const contentLength = headers.get('content-length') || null;
  return {
    url: finalUrl,
    statusCode: status,
    title,
    metaDescription,
    canonicalUrl,
    metaRobots,
    hreflangLinks,
    linkCounts: { total: linksCount },
    assetCounts: assets,
    headers: { contentType, server, contentLength },
    htmlBytes: Buffer.byteLength(html, 'utf8'),
  };
}

function summarizeAtlas(page) {
  return {
    url: page.url,
    statusCode: page.statusCode ?? null,
    title: page.title ?? null,
    metaDescription: page.meta?.description ?? null,
    canonicalUrl: page.canonicalUrl ?? null,
    metaRobots: page.meta?.robots ?? null,
    hreflangLinks: Array.isArray(page.hreflangLinks) ? page.hreflangLinks.map(h => ({ lang: h.lang, url: h.url })) : [],
    linkCounts: {
      total: page.linkCounts?.total ?? (Array.isArray(page.links) ? page.links.length : null),
    },
    assetCounts: {
      stylesheets: page.assetCounts?.stylesheets ?? null,
      scripts: page.assetCounts?.scripts ?? null,
      images: page.assetCounts?.images ?? null,
    },
    encoding: page.encoding ?? null,
    wait_condition: page.wait_condition ?? null,
    timings: page.timings ?? null,
  };
}

function compare(a, b) {
  const diffs = [];
  function addDiff(field, va, vb) {
    const equal = JSON.stringify(va) === JSON.stringify(vb);
    diffs.push({ field, atlas: va, live: vb, equal });
  }
  addDiff('statusCode', a.statusCode, b.statusCode);
  addDiff('title', a.title, b.title);
  addDiff('metaDescription', a.metaDescription, b.metaDescription);
  addDiff('canonicalUrl', a.canonicalUrl, b.canonicalUrl);
  addDiff('metaRobots', a.metaRobots, b.metaRobots);
  addDiff('hreflangLinks', a.hreflangLinks, b.hreflangLinks);
  addDiff('linkCounts.total', a.linkCounts?.total, b.linkCounts?.total);
  addDiff('assetCounts.stylesheets', a.assetCounts?.stylesheets, b.assetCounts?.stylesheets);
  addDiff('assetCounts.scripts', a.assetCounts?.scripts, b.assetCounts?.scripts);
  addDiff('assetCounts.images', a.assetCounts?.images, b.assetCounts?.images);
  return diffs;
}

async function main() {
  const args = process.argv.slice(2);
  const atlsPath = args[0];
  let originFilter = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--originFilter') originFilter = args[++i];
  }
  if (!atlsPath) {
    console.error('Usage: node scripts/compare-curl-all.mjs <path-to.atls> [--originFilter https://www.example.com]');
    process.exit(1);
  }

  const atlas = await openAtlas(atlsPath);
  const results = [];
  let count = 0;

  for await (const page of atlas.readers.pages()) {
    const url = page.url;
    if (originFilter) {
      try {
        const o = new URL(originFilter);
        const p = new URL(url);
        if (o.host !== p.host) continue;
      } catch {}
    }

    const atlasSummary = summarizeAtlas(page);
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      const finalUrl = resp.url;
      const html = await resp.text();
      const liveSummary = extractFromHtml(html, finalUrl, resp.headers, resp.status);
      const diffs = compare(atlasSummary, liveSummary);
      results.push({
        target: url,
        atlas: atlasSummary,
        live: pick(liveSummary, ['url','statusCode','title','metaDescription','canonicalUrl','metaRobots','hreflangLinks','linkCounts','assetCounts','headers','htmlBytes']),
        diffs,
      });
    } catch (err) {
      results.push({ target: url, error: String(err) });
    }
    count++;
  }

  console.log(JSON.stringify({ atlsPath, total: count, results }, null, 2));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(10);
});

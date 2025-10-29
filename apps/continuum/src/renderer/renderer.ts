// Copyright © 2025 Cai Frazier.

/**
 * Renderer process for Continuum
 */

// State
let currentFilePath: string | null = null;
let currentPages: any[] = [];
let allPagesCache: any[] = [];
let currentPage = 1;
const pageSize = 50;
let totalPages = 0;
let currentTab = 'pages';

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen')!;
const dataView = document.getElementById('dataView')!;
const importBtn = document.getElementById('importBtn')!;
const importAnotherBtn = document.getElementById('importAnotherBtn')!;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const pagesTableBody = document.getElementById('pagesTableBody')!;
const pageCount = document.getElementById('pageCount')!;
const prevPageBtn = document.getElementById('prevPageBtn') as HTMLButtonElement;
const nextPageBtn = document.getElementById('nextPageBtn') as HTMLButtonElement;
const pageInfo = document.getElementById('pageInfo')!;
const loadingState = document.getElementById('loadingState')!;
const emptyState = document.getElementById('emptyState')!;
const pageModal = document.getElementById('pageModal')!;
const closeModalBtn = document.getElementById('closeModalBtn')!;
const modalBody = document.getElementById('modalBody')!;

// Metadata elements
const archiveMetadata = document.getElementById('archiveMetadata')!;
const statPages = document.getElementById('statPages')!;
const statEdges = document.getElementById('statEdges')!;
const statAssets = document.getElementById('statAssets')!;
const statErrors = document.getElementById('statErrors')!;
const statA11y = document.getElementById('statA11y')!;

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Issue elements
const issueStats = document.getElementById('issueStats')!;
const noindexCount = document.getElementById('noindexCount')!;
const noindexList = document.getElementById('noindexList')!;
const missingH1Count = document.getElementById('missingH1Count')!;
const missingH1List = document.getElementById('missingH1List')!;
const missingCanonicalCount = document.getElementById('missingCanonicalCount')!;
const missingCanonicalList = document.getElementById('missingCanonicalList')!;
const titleIssuesCount = document.getElementById('titleIssuesCount')!;
const titleIssuesList = document.getElementById('titleIssuesList')!;

// Event Listeners
importBtn.addEventListener('click', handleImport);
importAnotherBtn.addEventListener('click', handleImport);
prevPageBtn.addEventListener('click', () => changePage(-1));
nextPageBtn.addEventListener('click', () => changePage(1));
searchInput.addEventListener('input', handleSearch);
closeModalBtn.addEventListener('click', closeModal);

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    if (tabName) switchTab(tabName);
  });
});

// Import Handler
async function handleImport() {
  try {
    const result = await window.atlasAPI.importAtlas();
    
    if (!result.success || !result.data) {
      if (result.error && result.error !== 'No file selected') {
        alert(`Failed to import: ${result.error}`);
      }
      return;
    }

    currentFilePath = result.data.filePath;
    
    // Update metadata
    const manifest = result.data.manifest;
    archiveMetadata.innerHTML = `
      <div class="metadata-item">
        <strong>Owner:</strong> ${manifest.owner}
      </div>
      <div class="metadata-item">
        <strong>Version:</strong> ${manifest.atlasVersion}
      </div>
      <div class="metadata-item">
        <strong>Format:</strong> ${manifest.formatVersion}
      </div>
      <div class="metadata-item">
        <strong>Created:</strong> ${new Date(manifest.createdAt).toLocaleDateString()}
      </div>
      <div class="metadata-item">
        <strong>Generator:</strong> ${manifest.generator}
      </div>
      <div class="metadata-item">
        <strong>Datasets:</strong> ${result.data.datasets.join(', ')}
      </div>
    `;

    // Load stats
    await loadStats();

    // Load all pages for analysis
    await loadAllPages();

    // Analyze data
    await analyzeData();

    // Load initial pages
    await loadPages();

    // Show data view
    welcomeScreen.classList.add('hidden');
    dataView.classList.remove('hidden');

  } catch (error) {
    console.error('Import error:', error);
    alert(`Import failed: ${error}`);
  }
}

// Switch Tab
function switchTab(tabName: string) {
  currentTab = tabName;
  
  // Update tab buttons
  tabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab content
  tabContents.forEach(content => {
    const contentId = `${tabName}Tab`;
    if (content.id === contentId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Load tab-specific data
  switch (tabName) {
    case 'redirects':
      loadRedirects();
      break;
    case 'social':
      loadSocialTags();
      break;
    case 'accessibility':
      loadAccessibility();
      break;
    case 'errors':
      loadErrors();
      break;
  }
}

// Load all pages for analysis
async function loadAllPages() {
  if (!currentFilePath) return;

  try {
    // Load all pages into cache for analysis
    let offset = 0;
    const batchSize = 500;
    allPagesCache = [];

    while (true) {
      const result = await window.atlasAPI.loadPages(currentFilePath, batchSize, offset);
      
      if (!result.success || !result.data || result.data.pages.length === 0) {
        break;
      }

      allPagesCache.push(...result.data.pages);
      
      if (!result.data.hasMore) {
        break;
      }

      offset += batchSize;
    }

    console.log(`Loaded ${allPagesCache.length} pages for analysis`);
  } catch (error) {
    console.error('Failed to load all pages:', error);
  }
}

// Analyze Data
async function analyzeData() {
  if (allPagesCache.length === 0) return;

  // Count issues
  const noindexPages = allPagesCache.filter(p => 
    p.noindexSurface || 
    (p.robotsMeta && p.robotsMeta.toLowerCase().includes('noindex'))
  );

  const missingH1Pages = allPagesCache.filter(p => !p.h1 && !p.noindexSurface);
  
  const missingCanonicalPages = allPagesCache.filter(p => 
    !p.canonicalResolved && !p.noindexSurface
  );

  const titleIssuePages = allPagesCache.filter(p => {
    if (!p.title) return true;
    const len = p.title.length;
    return len < 30 || len > 60;
  }).filter(p => !p.noindexSurface);

  const redirectPages = allPagesCache.filter(p => 
    p.redirectChain && p.redirectChain.length > 1
  );

  // Update issue counts
  noindexCount.textContent = noindexPages.length.toString();
  missingH1Count.textContent = missingH1Pages.length.toString();
  missingCanonicalCount.textContent = missingCanonicalPages.length.toString();
  titleIssuesCount.textContent = titleIssuePages.length.toString();

  // Update sidebar issue summary
  issueStats.innerHTML = `
    <div class="issue-stat">
      <span class="issue-icon">🚫</span>
      <span>${noindexPages.length} Noindex</span>
    </div>
    <div class="issue-stat">
      <span class="issue-icon">📑</span>
      <span>${missingH1Pages.length} Missing H1</span>
    </div>
    <div class="issue-stat">
      <span class="issue-icon">🔗</span>
      <span>${missingCanonicalPages.length} No Canonical</span>
    </div>
    <div class="issue-stat">
      <span class="issue-icon">🔄</span>
      <span>${redirectPages.length} Redirects</span>
    </div>
  `;

  // Populate issue lists (top 5 each)
  noindexList.innerHTML = noindexPages.slice(0, 5).map(p => `
    <div class="issue-item" data-url="${escapeHtml(p.url)}">
      <a href="${escapeHtml(p.url)}" target="_blank" onclick="event.stopPropagation()">
        ${truncate(p.url, 40)}
      </a>
      <span class="issue-badge">${p.noindexSurface || 'noindex'}</span>
    </div>
  `).join('') + (noindexPages.length > 5 ? `<div class="issue-more">+${noindexPages.length - 5} more</div>` : '');

  missingH1List.innerHTML = missingH1Pages.slice(0, 5).map(p => `
    <div class="issue-item" data-url="${escapeHtml(p.url)}">
      <a href="${escapeHtml(p.url)}" target="_blank" onclick="event.stopPropagation()">
        ${truncate(p.url, 40)}
      </a>
    </div>
  `).join('') + (missingH1Pages.length > 5 ? `<div class="issue-more">+${missingH1Pages.length - 5} more</div>` : '');

  missingCanonicalList.innerHTML = missingCanonicalPages.slice(0, 5).map(p => `
    <div class="issue-item" data-url="${escapeHtml(p.url)}">
      <a href="${escapeHtml(p.url)}" target="_blank" onclick="event.stopPropagation()">
        ${truncate(p.url, 40)}
      </a>
    </div>
  `).join('') + (missingCanonicalPages.length > 5 ? `<div class="issue-more">+${missingCanonicalPages.length - 5} more</div>` : '');

  titleIssuesList.innerHTML = titleIssuePages.slice(0, 5).map(p => `
    <div class="issue-item" data-url="${escapeHtml(p.url)}">
      <a href="${escapeHtml(p.url)}" target="_blank" onclick="event.stopPropagation()">
        ${truncate(p.url, 40)}
      </a>
      <span class="issue-badge">${p.title ? p.title.length + ' chars' : 'missing'}</span>
    </div>
  `).join('') + (titleIssuePages.length > 5 ? `<div class="issue-more">+${titleIssuePages.length - 5} more</div>` : '');
}

// Load Statistics
async function loadStats() {
  if (!currentFilePath) return;

  try {
    const result = await window.atlasAPI.getStats(currentFilePath);
    
    if (result.success && result.data) {
      statPages.textContent = result.data.pages.toLocaleString();
      statEdges.textContent = result.data.edges.toLocaleString();
      statAssets.textContent = result.data.assets.toLocaleString();
      statErrors.textContent = result.data.errors.toLocaleString();
      statA11y.textContent = result.data.accessibility.toLocaleString();
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load Pages
async function loadPages() {
  if (!currentFilePath) return;

  showLoading(true);

  try {
    const offset = (currentPage - 1) * pageSize;
    const result = await window.atlasAPI.loadPages(currentFilePath, pageSize, offset);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load pages');
    }

    currentPages = result.data.pages;
    totalPages = Math.ceil(result.data.totalCount / pageSize);

    renderPages(currentPages);
    updatePagination();
    pageCount.textContent = `${result.data.totalCount.toLocaleString()} pages`;

  } catch (error) {
    console.error('Failed to load pages:', error);
    showError('Failed to load pages');
  } finally {
    showLoading(false);
  }
}

// Render Pages Table
function renderPages(pages: any[]) {
  if (pages.length === 0) {
    pagesTableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  pagesTableBody.innerHTML = pages.map(page => {
    const flags = [];
    if (page.noindexSurface || (page.robotsMeta && page.robotsMeta.toLowerCase().includes('noindex'))) {
      flags.push('<span class="flag flag-noindex" title="Noindex">🚫</span>');
    }
    if (!page.h1) {
      flags.push('<span class="flag flag-no-h1" title="Missing H1">📑</span>');
    }
    if (!page.canonicalResolved) {
      flags.push('<span class="flag flag-no-canonical" title="No Canonical">🔗</span>');
    }
    if (page.redirectChain && page.redirectChain.length > 1) {
      flags.push('<span class="flag flag-redirect" title="Has Redirect">🔄</span>');
    }
    if (!page.openGraph || Object.keys(page.openGraph).length === 0) {
      flags.push('<span class="flag flag-no-og" title="Missing OpenGraph">📱</span>');
    }

    return `
      <tr class="page-row" data-url="${escapeHtml(page.url)}">
        <td class="col-status">
          <span class="status-badge status-${getStatusClass(page.statusCode)}">
            ${page.statusCode}
          </span>
        </td>
        <td class="col-url">
          <a href="${escapeHtml(page.url)}" target="_blank" class="url-link" onclick="event.stopPropagation()">
            ${escapeHtml(page.url)}
          </a>
        </td>
        <td class="col-title">
          ${page.title ? escapeHtml(truncate(page.title, 80)) : '<em>No title</em>'}
        </td>
        <td class="col-h1">
          ${page.h1 ? escapeHtml(truncate(page.h1, 60)) : '<em>No H1</em>'}
        </td>
        <td class="col-flags">${flags.join(' ')}</td>
      </tr>
    `;
  }).join('');

  // Add click handlers
  document.querySelectorAll('.page-row').forEach(row => {
    row.addEventListener('click', () => {
      const url = row.getAttribute('data-url');
      if (url) showPageDetails(url);
    });
  });
}

// Load Redirects Tab
function loadRedirects() {
  const redirectsTableBody = document.getElementById('redirectsTableBody')!;
  
  const redirectPages = allPagesCache.filter(p => 
    p.redirectChain && p.redirectChain.length > 1
  );

  if (redirectPages.length === 0) {
    redirectsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No redirects found</td></tr>';
    return;
  }

  redirectsTableBody.innerHTML = redirectPages.map(p => `
    <tr>
      <td><a href="${escapeHtml(p.url)}" target="_blank">${truncate(p.url, 50)}</a></td>
      <td><a href="${escapeHtml(p.finalUrl || p.url)}" target="_blank">${truncate(p.finalUrl || p.url, 50)}</a></td>
      <td>${p.redirectChain.length - 1}</td>
      <td><span class="status-badge status-${getStatusClass(p.statusCode)}">${p.statusCode}</span></td>
    </tr>
  `).join('');
}

// Load Social Tags Tab
function loadSocialTags() {
  const socialTableBody = document.getElementById('socialTableBody')!;
  
  const pagesWithSocialIssues = allPagesCache.filter(p => {
    if (p.noindexSurface) return false; // Skip noindex pages
    
    const hasOG = p.openGraph && Object.keys(p.openGraph).length > 0;
    const hasTwitter = p.twitterCard && Object.keys(p.twitterCard).length > 0;
    
    // Include pages with missing or incomplete social tags
    if (!hasOG || !hasTwitter) return true;
    
    // Check OG completeness
    const ogTitle = p.openGraph?.['og:title'] || p.openGraph?.ogTitle;
    const ogImage = p.openGraph?.['og:image'] || p.openGraph?.ogImage;
    const ogDesc = p.openGraph?.['og:description'] || p.openGraph?.ogDescription;
    
    if (!ogTitle || !ogImage || !ogDesc) return true;
    
    return false;
  });

  if (pagesWithSocialIssues.length === 0) {
    socialTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">All pages have complete social tags</td></tr>';
    return;
  }

  socialTableBody.innerHTML = pagesWithSocialIssues.slice(0, 100).map(p => {
    const hasOG = p.openGraph && Object.keys(p.openGraph).length > 0;
    const hasTwitter = p.twitterCard && Object.keys(p.twitterCard).length > 0;
    const issues = [];
    
    if (!hasOG) {
      issues.push('No OpenGraph');
    } else {
      const ogTitle = p.openGraph?.['og:title'] || p.openGraph?.ogTitle;
      const ogImage = p.openGraph?.['og:image'] || p.openGraph?.ogImage;
      const ogDesc = p.openGraph?.['og:description'] || p.openGraph?.ogDescription;
      
      if (!ogTitle) issues.push('Missing og:title');
      if (!ogImage) issues.push('Missing og:image');
      if (!ogDesc) issues.push('Missing og:description');
    }
    
    if (!hasTwitter) {
      issues.push('No Twitter Card');
    }
    
    return `
      <tr>
        <td><a href="${escapeHtml(p.url)}" target="_blank">${truncate(p.url, 50)}</a></td>
        <td>${hasOG ? '✓' : '✗'}</td>
        <td>${hasTwitter ? '✓' : '✗'}</td>
        <td><span class="issue-badge">${issues.join(', ')}</span></td>
      </tr>
    `;
  }).join('') + (pagesWithSocialIssues.length > 100 ? 
    `<tr><td colspan="4" style="text-align: center; padding: 1rem;"><em>Showing first 100 of ${pagesWithSocialIssues.length} pages</em></td></tr>` : '');
}

// Load Accessibility Tab
async function loadAccessibility() {
  if (!currentFilePath) return;
  
  const accessibilityTableBody = document.getElementById('accessibilityTableBody')!;
  accessibilityTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Loading accessibility data...</td></tr>';
  
  try {
    const result = await window.atlasAPI.loadAccessibility(currentFilePath);
    
    if (!result.success || !result.data) {
      accessibilityTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No accessibility data available</td></tr>';
      return;
    }

    const a11yRecords = result.data.records;
    
    if (a11yRecords.length === 0) {
      accessibilityTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No accessibility data found</td></tr>';
      return;
    }

    accessibilityTableBody.innerHTML = a11yRecords.slice(0, 100).map((a11y: any) => {
      // Count total issues
      let totalIssues = 0;
      const issues = [];
      
      // Missing alt text
      if (a11y.missingAltCount > 0) {
        totalIssues += a11y.missingAltCount;
        issues.push(`${a11y.missingAltCount} missing alt`);
      }
      
      // Form controls missing labels
      if (a11y.formControls?.missingLabel > 0) {
        totalIssues += a11y.formControls.missingLabel;
        issues.push(`${a11y.formControls.missingLabel} unlabeled inputs`);
      }
      
      // Contrast violations
      if (a11y.contrastViolations?.length > 0) {
        totalIssues += a11y.contrastViolations.length;
        issues.push(`${a11y.contrastViolations.length} contrast issues`);
      }
      
      // WCAG data
      if (a11y.wcagData) {
        // Count various WCAG issues
        if (a11y.wcagData.perceivable?.textAlternatives?.missingAltCount) {
          totalIssues += a11y.wcagData.perceivable.textAlternatives.missingAltCount;
        }
        if (a11y.wcagData.operable?.keyboardAccessible?.unreachableElements?.length) {
          totalIssues += a11y.wcagData.operable.keyboardAccessible.unreachableElements.length;
          issues.push(`${a11y.wcagData.operable.keyboardAccessible.unreachableElements.length} unreachable`);
        }
        if (a11y.wcagData.understandable?.predictable?.missingSkipLinks) {
          totalIssues++;
          issues.push('missing skip link');
        }
      }
      
      // Missing lang attribute
      if (!a11y.lang) {
        totalIssues++;
        issues.push('missing lang');
      }
      
      // Missing landmarks
      const missingLandmarks = [];
      if (!a11y.landmarks?.main) missingLandmarks.push('main');
      if (!a11y.landmarks?.nav) missingLandmarks.push('nav');
      if (missingLandmarks.length > 0) {
        totalIssues += missingLandmarks.length;
        issues.push(`missing ${missingLandmarks.join(', ')}`);
      }
      
      return `
        <tr>
          <td><a href="${escapeHtml(a11y.pageUrl || a11y.url)}" target="_blank">${escapeHtml(a11y.pageUrl || a11y.url)}</a></td>
          <td>${a11y.missingAltCount || 0}</td>
          <td>${totalIssues}</td>
          <td><span class="issue-badge">${issues.length > 0 ? issues.join(', ') : 'None'}</span></td>
        </tr>
      `;
    }).join('') + (a11yRecords.length > 100 ?
      `<tr><td colspan="4" style="text-align: center; padding: 1rem;"><em>Showing first 100 of ${a11yRecords.length} pages</em></td></tr>` : '');
      
  } catch (error) {
    console.error('Failed to load accessibility data:', error);
    accessibilityTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Error loading accessibility data</td></tr>';
  }
}

// Load Errors Tab
async function loadErrors() {
  if (!currentFilePath) return;
  
  const errorsTableBody = document.getElementById('errorsTableBody')!;
  errorsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Loading errors...</td></tr>';
  
  try {
    const result = await window.atlasAPI.loadErrors(currentFilePath);
    
    if (!result.success || !result.data) {
      errorsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No errors found</td></tr>';
      return;
    }

    const errorRecords = result.data.errors;
    
    if (errorRecords.length === 0) {
      errorsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No errors found 🎉</td></tr>';
      return;
    }

    errorsTableBody.innerHTML = errorRecords.map((err: any) => `
      <tr>
        <td><a href="${escapeHtml(err.url)}" target="_blank">${truncate(err.url, 50)}</a></td>
        <td>${err.type || 'Unknown'}</td>
        <td>${escapeHtml(err.message || 'No message')}</td>
        <td>${new Date(err.timestamp || Date.now()).toLocaleString()}</td>
      </tr>
    `).join('');
      
  } catch (error) {
    console.error('Failed to load errors:', error);
    errorsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Error loading error data</td></tr>';
  }
}

// Show Page Details Modal
async function showPageDetails(url: string) {
  if (!currentFilePath) return;

  try {
    modalBody.innerHTML = '<div class="spinner"></div>';
    pageModal.classList.remove('hidden');

    const result = await window.atlasAPI.getPageDetails(currentFilePath, url);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load page details');
    }

    const page = result.data;

    modalBody.innerHTML = `
      <div class="detail-section">
        <h3>Basic Info</h3>
        <div class="detail-grid">
          <div><strong>URL:</strong></div>
          <div><a href="${escapeHtml(page.url)}" target="_blank">${escapeHtml(page.url)}</a></div>
          
          ${page.finalUrl && page.finalUrl !== page.url ? `
            <div><strong>Final URL:</strong></div>
            <div><a href="${escapeHtml(page.finalUrl)}" target="_blank">${escapeHtml(page.finalUrl)}</a></div>
          ` : ''}
          
          <div><strong>Status Code:</strong></div>
          <div><span class="status-badge status-${getStatusClass(page.statusCode)}">${page.statusCode}</span></div>
          
          <div><strong>Depth:</strong></div>
          <div>${page.depth}</div>
          
          <div><strong>Render Mode:</strong></div>
          <div>${page.renderMode}</div>
          
          ${page.renderMs ? `
            <div><strong>Render Time:</strong></div>
            <div>${page.renderMs}ms</div>
          ` : ''}
        </div>
      </div>

      ${page.redirectChain && page.redirectChain.length > 1 ? `
        <div class="detail-section">
          <h3>🔄 Redirect Chain</h3>
          <div class="redirect-chain">
            ${page.redirectChain.map((redirectUrl: string, i: number) => `
              <div class="redirect-step">
                <span class="redirect-number">${i + 1}</span>
                <a href="${escapeHtml(redirectUrl)}" target="_blank">${escapeHtml(redirectUrl)}</a>
              </div>
            `).join('<div class="redirect-arrow">↓</div>')}
          </div>
        </div>
      ` : ''}

      <div class="detail-section">
        <h3>SEO</h3>
        <div class="detail-grid">
          <div><strong>Title:</strong></div>
          <div>${page.title ? `${escapeHtml(page.title)} <span class="char-count">(${page.title.length} chars)</span>` : '<em class="error">Missing</em>'}</div>
          
          <div><strong>Meta Description:</strong></div>
          <div>${page.metaDescription ? `${escapeHtml(page.metaDescription)} <span class="char-count">(${page.metaDescription.length} chars)</span>` : '<em class="error">Missing</em>'}</div>
          
          <div><strong>H1:</strong></div>
          <div>${page.h1 ? escapeHtml(page.h1) : '<em class="error">Missing</em>'}</div>
          
          <div><strong>Canonical:</strong></div>
          <div>${page.canonicalResolved ? escapeHtml(page.canonicalResolved) : '<em class="error">Not set</em>'}</div>

          ${page.noindexSurface ? `
            <div><strong>Noindex:</strong></div>
            <div><span class="issue-badge">${page.noindexSurface}</span></div>
          ` : ''}

          ${page.robotsMeta ? `
            <div><strong>Robots Meta:</strong></div>
            <div>${escapeHtml(page.robotsMeta)}</div>
          ` : ''}
        </div>
      </div>

      ${page.openGraph && Object.keys(page.openGraph).length > 0 ? `
        <div class="detail-section">
          <h3>📱 OpenGraph</h3>
          <div class="detail-grid">
            ${Object.entries(page.openGraph).map(([key, value]: [string, any]) => `
              <div><strong>${key}:</strong></div>
              <div>${value ? escapeHtml(String(value)) : '<em>Not set</em>'}</div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="detail-section"><h3>📱 OpenGraph</h3><p class="error">No OpenGraph tags found</p></div>'}

      ${page.twitterCard && Object.keys(page.twitterCard).length > 0 ? `
        <div class="detail-section">
          <h3>🐦 Twitter Card</h3>
          <div class="detail-grid">
            ${Object.entries(page.twitterCard).map(([key, value]: [string, any]) => `
              <div><strong>${key}:</strong></div>
              <div>${value ? escapeHtml(String(value)) : '<em>Not set</em>'}</div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="detail-section"><h3>🐦 Twitter Card</h3><p class="error">No Twitter Card tags found</p></div>'}

      <div class="detail-section">
        <h3>Links & Assets</h3>
        <div class="detail-grid">
          <div><strong>Internal Links:</strong></div>
          <div>${page.internalLinksCount || 0}</div>
          
          <div><strong>External Links:</strong></div>
          <div>${page.externalLinksCount || 0}</div>
          
          <div><strong>Media Assets:</strong></div>
          <div>${page.mediaAssetsCount || 0}${page.mediaAssetsTruncated ? ' (truncated)' : ''}</div>
        </div>
      </div>

      ${page.headings && page.headings.length > 0 ? `
        <div class="detail-section">
          <h3>Headings</h3>
          <ul class="headings-list">
            ${page.headings.slice(0, 10).map((h: any) => `
              <li><strong>H${h.level}:</strong> ${escapeHtml(h.text)}</li>
            `).join('')}
            ${page.headings.length > 10 ? `<li><em>...and ${page.headings.length - 10} more</em></li>` : ''}
          </ul>
        </div>
      ` : ''}
    `;

  } catch (error) {
    console.error('Failed to load page details:', error);
    modalBody.innerHTML = `<p class="error">Failed to load details: ${error}</p>`;
  }
}

// Close Modal
function closeModal() {
  pageModal.classList.add('hidden');
}

// Pagination
function updatePagination() {
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function changePage(delta: number) {
  const newPage = currentPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    loadPages();
  }
}

// Search
let searchTimeout: NodeJS.Timeout | null = null;

function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(() => {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
      renderPages(currentPages);
      return;
    }

    const filtered = currentPages.filter(page => 
      page.url?.toLowerCase().includes(query) ||
      page.title?.toLowerCase().includes(query) ||
      page.h1?.toLowerCase().includes(query)
    );

    renderPages(filtered);
  }, 300);
}

// Utilities
function showLoading(show: boolean) {
  if (show) {
    loadingState.classList.remove('hidden');
    pagesTableBody.innerHTML = '';
  } else {
    loadingState.classList.add('hidden');
  }
}

function showError(message: string) {
  emptyState.innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
  emptyState.classList.remove('hidden');
}

function getStatusClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirect';
  if (statusCode >= 400 && statusCode < 500) return 'client-error';
  if (statusCode >= 500) return 'server-error';
  return 'unknown';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
console.log('Continuum renderer loaded');
console.log('window.atlasAPI available:', !!window.atlasAPI);
console.log('atlasAPI methods:', window.atlasAPI ? Object.keys(window.atlasAPI) : 'N/A');


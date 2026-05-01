(function () {
  if (window.__leadflowInjected) return;
  window.__leadflowInjected = true;

  function extractListings() {
    const results = [];
    const seenPlaceIds = new Set();

    const items = document.querySelectorAll('[role="article"], [role="feed"] > div > div > a');

    for (const item of items) {
      try {
        const lead = extractFromItem(item);
        if (lead && lead.place_id && !seenPlaceIds.has(lead.place_id)) {
          seenPlaceIds.add(lead.place_id);
          results.push(lead);
        }
      } catch (e) {
        console.warn('[Leadflow] extract error', e);
      }
    }

    if (results.length === 0) {
      const detail = extractFromDetailPanel();
      if (detail && detail.place_id) results.push(detail);
    }

    return results;
  }

  function extractFromItem(el) {
    const link = el.querySelector('a[href*="/maps/place/"]') || (el.tagName === 'A' ? el : null);
    if (!link) return null;
    const href = link.getAttribute('href') || '';

    const placeIdMatch = href.match(/!1s([^!]+)/);
    const place_id = placeIdMatch ? placeIdMatch[1] : extractPlaceIdFromHref(href);
    if (!place_id) return null;

    const ariaLabel = link.getAttribute('aria-label') || '';
    const nameEl = el.querySelector('.qBF1Pd, .fontHeadlineSmall');
    const name = nameEl ? nameEl.textContent.trim() : ariaLabel.split('·')[0]?.trim();
    if (!name) return null;

    const ratingEl = el.querySelector('[role="img"][aria-label*="bintang"], [role="img"][aria-label*="star"]');
    let rating = null;
    let review_count = 0;
    if (ratingEl) {
      const label = ratingEl.getAttribute('aria-label') || '';
      const r = label.match(/([\d.,]+)/);
      if (r) rating = parseFloat(r[1].replace(',', '.'));
      const reviewMatch = el.textContent.match(/\((\d[\d.,]*)\)/);
      if (reviewMatch) review_count = parseInt(reviewMatch[1].replace(/[.,]/g, ''));
    }

    const allText = el.textContent || '';
    const phoneMatch = allText.match(/(\+?\d[\d\s\-()]{7,})/);
    const phone = phoneMatch ? phoneMatch[1].trim() : null;

    let category = null;
    const catMatch = allText.match(/·\s*([^·\n]+?)\s*·/);
    if (catMatch) category = catMatch[1].trim();

    const websiteEl = el.querySelector('a[data-value="Website"], a[href^="http"]:not([href*="google.com"])');
    let website = null;
    if (websiteEl) {
      const w = websiteEl.getAttribute('href');
      if (w && !w.includes('google.com/maps')) website = w;
    }

    let address = null;
    const addrMatch = allText.match(/·([^·]+?)(?:·|$)/g);
    if (addrMatch && addrMatch.length >= 2) {
      address = addrMatch[addrMatch.length - 1].replace(/^·\s*/, '').trim();
    }

    return {
      place_id,
      name,
      address,
      phone,
      website,
      category,
      rating,
      review_count,
    };
  }

  function extractFromDetailPanel() {
    const panel = document.querySelector('[role="main"]');
    if (!panel) return null;

    const url = window.location.href;
    const placeIdMatch = url.match(/!1s([^!]+)/) || url.match(/place_id:([^&]+)/);
    if (!placeIdMatch) return null;

    const nameEl = panel.querySelector('h1');
    const name = nameEl ? nameEl.textContent.trim() : null;
    if (!name) return null;

    const buttons = panel.querySelectorAll('button[data-item-id], a[data-item-id]');
    let address = null,
      phone = null,
      website = null;

    for (const btn of buttons) {
      const id = btn.getAttribute('data-item-id') || '';
      const text = btn.textContent.trim();
      if (id.startsWith('address')) address = text;
      else if (id.startsWith('phone')) phone = text;
      else if (id === 'authority') website = btn.getAttribute('href');
    }

    const ratingEl = panel.querySelector('[role="img"][aria-label*="bintang"], [role="img"][aria-label*="star"]');
    let rating = null;
    if (ratingEl) {
      const label = ratingEl.getAttribute('aria-label') || '';
      const m = label.match(/([\d.,]+)/);
      if (m) rating = parseFloat(m[1].replace(',', '.'));
    }
    const reviewBtn = panel.querySelector('button[aria-label*="ulasan"], button[aria-label*="reviews"]');
    let review_count = 0;
    if (reviewBtn) {
      const t = reviewBtn.textContent.match(/\d[\d.,]*/);
      if (t) review_count = parseInt(t[0].replace(/[.,]/g, ''));
    }

    const categoryEl = panel.querySelector('button[jsaction*="category"]');
    const category = categoryEl ? categoryEl.textContent.trim() : null;

    return {
      place_id: placeIdMatch[1],
      name,
      address,
      phone,
      website,
      category,
      rating,
      review_count,
    };
  }

  function extractPlaceIdFromHref(href) {
    const cidMatch = href.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
    if (cidMatch) return cidMatch[0];
    const dataMatch = href.match(/data=([^?&]+)/);
    if (dataMatch) {
      const placeMatch = dataMatch[1].match(/!1s([^!]+)/);
      if (placeMatch) return placeMatch[1];
    }
    return null;
  }

  function getSearchContext() {
    const searchInput = document.querySelector('input[name="q"], input[aria-label*="Cari"], input[aria-label*="Search"]');
    const query = searchInput ? searchInput.value : null;
    return { query, location: null };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SCRAPE_VISIBLE') {
      const leads = extractListings();
      const context = getSearchContext();
      sendResponse({ leads, context });
      return true;
    }
  });
})();

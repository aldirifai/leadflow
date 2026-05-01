const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveConfig');
const captureBtn = document.getElementById('captureBtn');
const capturePageBtn = document.getElementById('capturePageBtn');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');

function showStatus(msg, type) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = msg;
}

function clearStatus() {
  statusEl.className = '';
  statusEl.textContent = '';
}

chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (data) => {
  if (data?.apiUrl) apiUrlInput.value = data.apiUrl;
  if (data?.apiKey) apiKeyInput.value = data.apiKey;
});

saveBtn.addEventListener('click', () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
  const apiKey = apiKeyInput.value.trim();
  if (!apiUrl || !apiKey) {
    showStatus('Isi API URL dan key dulu.', 'err');
    return;
  }
  chrome.runtime.sendMessage({ type: 'SET_CONFIG', payload: { apiUrl, apiKey } }, () => {
    showStatus('Saved.', 'ok');
    setTimeout(clearStatus, 1500);
  });
});

async function captureFromTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('google.com/maps')) {
    showStatus('Buka google.com/maps dulu, baru capture.', 'err');
    return null;
  }
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_VISIBLE' }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        showStatus('Gagal connect ke tab. Refresh halaman Maps lalu coba lagi.', 'err');
        resolve(null);
      } else {
        resolve(resp);
      }
    });
  });
}

captureBtn.addEventListener('click', async () => {
  clearStatus();
  showStatus('Capturing...', 'info');
  captureBtn.disabled = true;

  try {
    const result = await captureFromTab();
    if (!result) return;

    const { leads, context } = result;
    if (!leads || leads.length === 0) {
      showStatus('Tidak ada listing ditemukan. Scroll dulu di Maps untuk load lebih banyak.', 'err');
      return;
    }

    showStatus(`Found ${leads.length} listings. Sending...`, 'info');

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'INGEST_LEADS',
          payload: {
            leads,
            search_query: context?.query || null,
            search_location: context?.location || null,
          },
        },
        resolve,
      );
    });

    if (response?.error) {
      showStatus(`Error: ${response.error}`, 'err');
    } else {
      showStatus(
        `Inserted: ${response.inserted}, Updated: ${response.updated}, Blacklisted skip: ${response.skipped_blacklisted}`,
        'ok',
      );
      statsEl.textContent = `Quota: ${response.quota_used}/${response.quota_limit} (${response.quota_remaining} remaining)`;
    }
  } catch (e) {
    showStatus(`Error: ${e.message || e}`, 'err');
  } finally {
    captureBtn.disabled = false;
  }
});

capturePageBtn.addEventListener('click', async () => {
  captureBtn.click();
});

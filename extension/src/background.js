chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INGEST_LEADS') {
    handleIngest(msg.payload).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
    return true;
  }
  if (msg.type === 'GET_CONFIG') {
    chrome.storage.local.get(['apiUrl', 'apiKey'], (data) => sendResponse(data));
    return true;
  }
  if (msg.type === 'SET_CONFIG') {
    chrome.storage.local.set(msg.payload, () => sendResponse({ ok: true }));
    return true;
  }
});

async function handleIngest(payload) {
  const config = await new Promise((resolve) =>
    chrome.storage.local.get(['apiUrl', 'apiKey'], resolve),
  );
  if (!config.apiUrl || !config.apiKey) {
    throw new Error('API URL dan API Key belum diset. Buka popup extension.');
  }

  const response = await fetch(`${config.apiUrl}/leads/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  return await response.json();
}

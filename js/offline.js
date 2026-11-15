// App-shell offline controls for Burmese Study. No study data, login tokens,
// account state or audio cache entries are touched by these helpers.

export function appWorkerUrl(base = document.baseURI) {
  return new URL('sw.js', base).href;
}

export function appScopeUrl(base = document.baseURI) {
  return new URL('./', base).href;
}

export function supportsAppCaching() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
    typeof window !== 'undefined' && 'caches' in window;
}

export async function registerAppWorker() {
  if (!supportsAppCaching()) throw new Error('Offline app caching is not supported by this browser.');
  return navigator.serviceWorker.register(appWorkerUrl(), {
    scope: appScopeUrl(), updateViaCache: 'none'
  });
}

export async function getAppRegistration() {
  if (!supportsAppCaching()) return null;
  const reg = await navigator.serviceWorker.getRegistration(appScopeUrl());
  // Do not mistake a root worker from another GitHub Pages app for our worker.
  return reg && [reg.active, reg.waiting, reg.installing]
    .some(worker => worker?.scriptURL === appWorkerUrl()) ? reg : null;
}

export function sendWorkerRequest(worker, type, onProgress = () => {}, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    if (!worker) return reject(new Error('The offline worker is not active yet.'));
    const channel = new MessageChannel();
    const finish = (error, result) => {
      clearTimeout(timer);
      channel.port1.close();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('Offline worker did not respond. Reload the app and try again.')),
      timeoutMs);
    channel.port1.onmessage = event => {
      const message = event.data;
      if (message?.type === 'progress') onProgress(message.progress);
      else if (message?.type === 'done') finish(null, message.status);
      else if (message?.type === 'error') finish(new Error(message.message));
    };
    try { worker.postMessage({ type }, [channel.port2]); }
    catch (error) { finish(error); }
  });
}

export async function checkAppOffline() {
  if (!supportsAppCaching()) return { kind: 'unsupported' };
  const reg = await getAppRegistration();
  if (!reg) return { kind: 'not-installed' };
  if (reg.installing || reg.waiting || !reg.active) return { kind: 'installing' };
  try {
    const status = await sendWorkerRequest(reg.active, 'OFFLINE_STATUS', () => {}, 5000);
    return { kind: status.ready ? 'ready' : 'partial', ...status };
  } catch (error) {
    return { kind: 'unknown', message: error.message };
  }
}

async function waitForActiveWorker(reg, timeoutMs = 45000) {
  if (reg.active && !reg.installing && !reg.waiting) return reg.active;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('App update is still installing. Check your connection and retry.')),
      timeoutMs);
    const finish = (error, worker) => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', check);
      reg.installing?.removeEventListener('statechange', check);
      if (error) reject(error); else resolve(worker);
    };
    const check = () => {
      if (reg.active && !reg.installing && !reg.waiting) finish(null, reg.active);
    };
    navigator.serviceWorker.addEventListener('controllerchange', check);
    reg.installing?.addEventListener('statechange', check);
    check();
  });
}

export async function downloadAppOffline(onProgress = () => {}) {
  const reg = await registerAppWorker();
  // Check for a published update before requesting new files. A failed network
  // update check must not hide a previously installed working shell.
  try { await reg.update(); } catch { /* Continue with the active worker. */ }
  const worker = await waitForActiveWorker(reg);
  // Older workers don't implement the status protocol; show a useful error
  // quickly instead of leaving Downloading visible for two minutes.
  await sendWorkerRequest(worker, 'OFFLINE_STATUS', () => {}, 5000);
  return sendWorkerRequest(worker, 'CACHE_APP', onProgress);
}

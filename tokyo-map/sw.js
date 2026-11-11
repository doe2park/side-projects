// 오프라인에서도 지도가 열리게 페이지와 글꼴을 기기에 보관한다.
// 페이지는 인터넷이 되면 항상 새 버전을 받고, 안 될 때만 보관본을 쓴다.
const CACHE = "tokyo-map-v1";
const SHELL = ["./", "./manifest.webmanifest", "./icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  const save = res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; };
  if (isFont) { // 글꼴은 안 바뀌니 보관본 먼저
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(save)));
  } else {      // 페이지는 새 버전 먼저, 실패하면 보관본
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match("./"))));
  }
});

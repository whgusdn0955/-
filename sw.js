"use strict";

const CACHE_NAME = "word-memorize-app-v4";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_FILES);
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    // 최신 파일을 우선 사용해야 하는 파일
    const isUpdateSensitiveFile =
        url.pathname.endsWith("/index.html") ||
        url.pathname.endsWith("/app.js") ||
        url.pathname.endsWith("/style.css") ||
        url.pathname.endsWith("/sw.js");

    if (isUpdateSensitiveFile) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (
                        response &&
                        response.status === 200
                    ) {
                        const clone = response.clone();

                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }

                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );

        return;
    }

    // 이미지 등 나머지 파일은 캐시 우선
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                return cached;
            }

            return fetch(event.request)
                .then(response => {
                    if (
                        !response ||
                        response.status !== 200
                    ) {
                        return response;
                    }

                    const clone = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });

                    return response;
                })
                .catch(() => {
                    return caches.match("./index.html");
                });
        })
    );
});

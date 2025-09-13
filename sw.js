// SūperLight Service Worker
const CACHE_NAME = "superlight-v1.0.3";
const STATIC_CACHE_URLS = ["./index.html", "./manifest.json", "./README.md"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("SūperLight: Installing new service worker");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("SūperLight: Caching static assets");
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log("SūperLight: Service worker installed, taking control");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("SūperLight: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("SūperLight: Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        console.log("SūperLight: Serving from cache:", event.request.url);
        return response;
      }

      // Otherwise fetch from network
      console.log("SūperLight: Fetching from network:", event.request.url);
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the response for future use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.log("SūperLight: Network fetch failed:", error);

          // Return a basic offline page for navigation requests
          if (event.request.mode === "navigate") {
            return new Response(
              `<!DOCTYPE html>
                <html>
                <head>
                  <title>SūperLight - Offline</title>
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      height: 100vh; 
                      margin: 0; 
                      background: #f5f5f5;
                      color: #333;
                    }
                    .offline-message {
                      text-align: center;
                      padding: 2rem;
                      background: white;
                      border-radius: 8px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    h1 { color: #ff6b35; margin-bottom: 1rem; }
                    p { margin-bottom: 1rem; }
                    button {
                      background: #ff6b35;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 4px;
                      cursor: pointer;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <h1>SūperLight</h1>
                    <p>You're offline, but SūperLight still works!</p>
                    <p>Your work is saved locally and will sync when you're back online.</p>
                    <button onclick="window.location.reload()">Try Again</button>
                  </div>
                </body>
                </html>`,
              {
                headers: {
                  "Content-Type": "text/html",
                },
              }
            );
          }

          throw error;
        });
    })
  );
});

// Handle background sync (for future use)
self.addEventListener("sync", (event) => {
  console.log("SūperLight: Background sync triggered:", event.tag);
});

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  console.log("SūperLight: Push notification received");
});

// Handle messages from client for clean shutdown
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLIENT_CLOSING") {
    console.log("SūperLight: Client closing, performing immediate cleanup");

    // Immediately clear any pending operations
    // This helps prevent the PWA from hanging during shutdown
    try {
      // Cancel any pending cache operations
      if (self.pendingCacheOperations) {
        self.pendingCacheOperations.forEach((op) => {
          if (op && typeof op.abort === "function") {
            op.abort();
          }
        });
        self.pendingCacheOperations = [];
      }

      // Force immediate cleanup - don't wait for async operations
      setTimeout(() => {
        console.log("SūperLight: Forced cleanup complete");
      }, 0);
    } catch (error) {
      console.log("SūperLight: Cleanup error (expected during shutdown):", error.message);
    }
  }

  if (event.data && event.data.type === "CLIENT_HIDDEN") {
    console.log("SūperLight: Client hidden, preparing for potential shutdown");
    // Lighter cleanup for hide events
  }
});

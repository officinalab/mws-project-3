console.log("SW startup!");
const staticCacheName = 'rest-reviews-static-v1';
const contentImgsCache = 'rest-reviews-imgs';
const allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event) {
    console.log("Installed!");
    event.waitUntil(
      caches.open(staticCacheName).then(function(cache) {
        console.log("cache created!");
        return cache.addAll([
          '/css/medium.css',
          '/css/small.css',
          '/css/styles.css',
          '/favicon.ico',
          '/index.html',
          '/restaurant.html',
          '/js/dbhelper.js',
          '/js/main.js',
          '/js/restaurant_info.js',
          '/js/custom.js'
        ]);
      }).catch(function(error){
          console.log(error);
      })
    );
});


self.addEventListener('activate', function(event) { // update sw version changed
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.filter(function(cacheName) {
                return cacheName.startsWith('restaurant-reviews-') &&
                    !allCaches.includes(cacheName);
            }).map(function(cacheName) {
                return caches.delete(cacheName);
            })
        );
        })
    );
});

self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/restaurant.html')) {
            event.respondWith(serveRestaurant(event.request));
            return;
        }
    }

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/images/')) {
            event.respondWith(serveImage(event.request));
            return;
        }
    }
    event.respondWith(
        caches.open(staticCacheName).then(function(cache) {
          return cache.match(event.request).then(function (response) {
            return response || fetch(event.request).then(function(response) {
                if(event.request.method === 'GET'){
                    cache.put(event.request, response.clone());
                }
                return response;
            });
          });
        })
    );
});

function serveRestaurant(request) {
    var storageUrl = request.url.substring(0,request.url.indexOf('?')-1); //.replace(/-\d+px\.jpg$/, '');
    return caches.open(staticCacheName).then(function(cache) {
        return cache.match(storageUrl).then(function(response) {
            if (response) return response;
            return fetch(request).then(function(networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

function serveImage(request) {
    var storageUrl = request.url.replace(/-\w+_\w+\.jpg$/i, '');
    return caches.open(staticCacheName).then(function(cache) {
        return cache.match(storageUrl).then(function(response) {
            if (response) return response;
            return fetch(request).then(function(networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

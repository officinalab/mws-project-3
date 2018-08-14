
// SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      // Registration was successful
      console.log('◕‿◕ ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ಠ_ಠ ServiceWorker registration failed: ', err);
    });
  });
}

//opens database

const dbPromise = self.idb.open('rr', 1, function(upgradeDb) {
  const store = upgradeDb.createObjectStore('restaurants');
  store.createIndex('by-id', 'id');
  if (!upgradeDb.objectStoreNames.contains('reviews')) {
    const reviewsIdb = upgradeDb.createObjectStore('reviews', {keyPath: 'id', autoIncrement: "true" });
    //objectStore.createIndex(nomIndex, nomCle, parametresIndexOptionnel);
    reviewsIdb.createIndex('restaurant_id', 'restaurant_id', {unique: false});
  }
}); // CREATE IDB
// link to filter (skip-map and return to top)
function goto(element){
  const target = document.getElementById(element);
  window.scrollTo(0, target.offsetTop - 50);
  target.focus();
}

const gotofilter = document.getElementById('gotofilter');
gotofilter.addEventListener('click', function(event){
  event.preventDefault();
  element = this.getAttribute('href').slice(1);
  goto(element);
});
gotofilter.addEventListener('keyup',function(event){
  event.preventDefault();
  if(event.keyCode == "13" || event.keyCode == "32"){ // 13 == enter 32 ==  space
    element = this.getAttribute('href').slice(1);
    goto(element);
  }
  return false;
});

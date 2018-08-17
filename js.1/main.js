let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute("role","menuitem");
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    option.setAttribute("role","menuitem");
    select.append(option);
  });
}


/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');
  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;
  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      initFavorites();
      requestAnimationFrame(lazyload);
    }
  });
}

// Clear current restaurants, their HTML and remove their map markers.
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';
  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

// Create all restaurants HTML and add them to the webpage.
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    if(typeof restaurant.name != 'undefined' && restaurant.name != ""){
      ul.append(createRestaurantHTML(restaurant));
    }
  });
  if (typeof google === 'object' && typeof google.maps === 'object'){
    addMarkersToMap();
  }
}

// Create restaurant HTML.
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.classList.add("restaurants-list-item");
  const name = document.createElement('h2');
  const favorite = document.createElement('a');
  favorite.classList.add('favorite');
  favorite.setAttribute('id', "favorite_restaurantid-"+ restaurant.id);
  favorite.setAttribute('aria-label',`Set ${restaurant.name} as favorite.`);
  if(restaurant.is_favorite === true || restaurant.is_favorite === "true" ){
    favorite.classList.add('isfavorite');
  }
  favorite.innerHTML = ' ♥';
  name.innerHTML = restaurant.name;
  li.append(name);
  name.append(favorite);
  const neighborhood = document.createElement('h3');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);
  const address = document.createElement('h4');
  address.innerHTML = restaurant.address;
  li.append(address);
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label',`Views details ${restaurant.name}`);
  li.append(more);
  if(typeof restaurant.photograph != 'undefined' && restaurant.photograph != ""){
    function createSrcs(str) {
      let labels = new Array();
      labels[ "small"] = 270;
      labels[ "medium"] = 460;
      let listSrc = new Array();
      const idx = str.indexOf(".");
      for(let label in labels){
        listSrc.push(`${str.slice(0, idx)}-${label}_${label}${str.slice(idx)} ${labels[label]}w`);
      }
      return listSrc.join();
    }
    const image = document.createElement('img');
    image.classList.add('restaurant-img');
    image.classList.add('lazy');
    //image.setAttribute('src', DBHelper.imageUrlForRestaurant(restaurant));
    image.setAttribute('src', "images/blank.jpg");
    image.setAttribute('srcset', createSrcs(image.src) );
    image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
    image.setAttribute('data-srcset', createSrcs(DBHelper.imageUrlForRestaurant(restaurant)) );
    image.setAttribute('sizes','(min-width: 271px) 400w, 100vw' );
    image.setAttribute('alt', `${restaurant.name}, ${restaurant.cuisine_type} restaurant in ${restaurant.neighborhood}.` );
    li.append(image);
  }
  return li;
}

// Add markers for current restaurants to the map.

addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    if(typeof restaurant.latlng != 'undefined' && restaurant.latlng != ""){
       // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url
      });
      self.markers.push(marker);
    }
  });
}

document.getElementById('neighborhoods-select').addEventListener('change',updateRestaurants);
document.getElementById('cuisines-select').addEventListener('change',updateRestaurants);


/* ============ LAZY LOAD IMGS  with requestAnimationFrame*/

function lazyload(){
  const lazyImagesList = document.getElementsByClassName('lazy');
  if(lazyImagesList.length > 0){
    for(let i = 0; (i<(lazyImagesList.length) && i<2 ); i++) { // getElementsByClassName keep update automatically object
      let image = lazyImagesList.item(i);
      if( image.getAttribute('data-loaded') === null){
        if (image && image.getAttribute('data-src') !== null) {
          image.setAttribute('src', image.getAttribute('data-src'));
          image.removeAttribute('data-src');
          image.classList.remove("lazy");
        }
        if (image.getAttribute('data-srcset') !== null) {
          image.setAttribute('srcset', image.getAttribute('data-srcset'));
          image.removeAttribute('data-srcset');
          image.classList.remove("lazy");
        }
        image.setAttribute('data-loaded', true);
      }
    }
    requestAnimationFrame(lazyload);
  }
  return false;
}

// Add event listeners to images
window.addEventListener('load', updateRestaurants);

function initMap(){
  //* Initialize Google map, called from HTML.
  if (typeof google === 'object' && typeof google.maps === 'object') {
    // Verify if already alert present and if remove it
    if( document.getElementById('alertmap') != null ){
      const alert = document.getElementById('alert');
      alert.parentNode.removeChild(alert);
    }
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };

    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
  } else {
    const newalert = document.createElement('div');
    newalert.classList.add("alert");
    newalert.classList.add("danger");
    newalert.setAttribute("id","alertmap");
    const par = document.createElement('p');
    par.innerHTML = "Please note no google map activate, maybe you are offline.";
    newalert.appendChild(par);
    document.getElementById('map').appendChild(newalert);
  }
}

// MAP
function showMap(){
  initMap();
  document.getElementById('showmap').style.display = "none";
  document.getElementById('map-container').style.display = "block";
  document.getElementById('filter').classList.remove("filterm");
  updateRestaurants();
  return false;
}
document.getElementById('showmap').addEventListener('click', (event) => {
  event.preventDefault();
  showMap();
  return false;
});

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

/* window.addEventListener('load',initFavorites); */
function initFavorites(){
  const favorites = document.getElementsByClassName("favorite");
  for (let i = 0; i < favorites.length; i++) {
    favorites[i].addEventListener('click', toogleFavorite, false);
  }
}

function handleConnectionChange(event){
  if(event.type == "offline"){
    const msg = "Please note you are OFFLINE, we will save eventually favorites on server when you will go back ONLINE.";
    console.log(msg);
    notify(msg, "warning");
  }
  if(event.type == "online"){
    const msg = "Your are ONLINE, we are saving your favorites on server."
    console.log(msg);
    notify(msg, "success");
    updateFavoritesInDB();
  }
}
window.addEventListener('online', handleConnectionChange);
window.addEventListener('offline', handleConnectionChange);
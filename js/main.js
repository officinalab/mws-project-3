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
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };

  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
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
      lazyload();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
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

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    if(typeof restaurant.name != 'undefined' && restaurant.name != ""){
      ul.append(createRestaurantHTML(restaurant));
    }
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.classList.add("restaurants-list-item");
  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);
  const neighborhood = document.createElement('h3');
  neighborhood.innerHTML = restaurant.neighborhood;
  //neighborhood.setAttribute("aria-label","Neighborhood");
  li.append(neighborhood);
  const address = document.createElement('h4');
  address.innerHTML = restaurant.address;
  //address.setAttribute("aria-label","Address");
  li.append(address);
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  //more.setAttribute("role","link");
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

/**
 * Add markers for current restaurants to the map.
 */
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


/* ============ LAZY LOAD IMGS */
function isImageInViewport(img){ // Test if image is in the viewport
  const rect = img.getBoundingClientRect();
  let res = false;
  if( rect.top >=0 && rect.top <= window.innerHeight &&
      rect.left >= 0 && rect.left <= window.innerWidth &&
      rect.right >=0 && rect.right <= window.innerWidth &&
      rect.bottom > 0 &&  (rect.bottom <= window.innerHeight + 200 )) {
    res = true;
  }
  return res;
}

function fadeInCustom(element){     // Create custom fading effect for showing images
  let elementOpacity = 0.1;// initial opacity
  element.style.display = 'block';
  const timer = setInterval(() => {
    if (elementOpacity >= 1){
      clearInterval(timer);
    }
    element.style.opacity = elementOpacity;
    element.style.filter = 'alpha(opacity=' + elementOpacity * 100 + ")";
    elementOpacity += elementOpacity * 0.1;
  }, 15);
  lazyload();
}

function lazyload(){
  const lazyImagesList = document.getElementsByClassName('lazy');
  for(let i = 0; i < lazyImagesList.length; i++) {
    let image = lazyImagesList.item(i);
    if (isImageInViewport(image)) {
      if (image.getAttribute('data-src') !== null) {
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
      fadeInCustom(image);
    }
  }
  return false;
}

// Add event listeners to images
window.addEventListener('DOMContentLoaded', lazyload);
window.addEventListener('load', lazyload);
window.addEventListener('resize', lazyload);
window.addEventListener('scroll', lazyload);


// MAP
function showMap(){
  document.getElementById('showmap').style.display = "none";
  document.getElementById('map').style.display = "block";
  return false;
}
document.getElementById('showmap').addEventListener('click', (event) => {
  event.preventDefault();
  showMap();
  updateRestaurants();
  lazyload();
});
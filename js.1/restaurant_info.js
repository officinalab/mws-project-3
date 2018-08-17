let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error("error", error);
    } else {
      fillBreadcrumb();
      if (typeof google === 'object' && typeof google.maps === 'object') {
        // Verify if already alert present and if remove it
        if( document.getElementById('alertmap') != null ){
          const alert = document.getElementById('alert');
          alert.parentNode.removeChild(alert);
        }
        self.map = new google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false
        });
        DBHelper.mapMarkerForRestaurant(restaurant, self.map);
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
  });
}

window.addEventListener('load', initMap);
/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL';
    console.log(error);
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  const favorite = document.createElement('a');
  favorite.classList.add('favorite');
  favorite.setAttribute('id', "favorite_restaurantid-"+ restaurant.id);
  favorite.setAttribute('aria-label',`Set ${restaurant.name} as favorite.`);
  if(restaurant.is_favorite == true){
    favorite.classList.add('isfavorite');
  }
  favorite.innerHTML = ' &hearts;';
  name.innerHTML = restaurant.name;
  name.append(favorite);
  favorite.addEventListener('click',toogleFavorite);
  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;


  if(typeof restaurant.photograph != 'undefined' && restaurant.photograph != ""){
    function createSrcs(str) {
      let labels = new Array();
      labels[ "small"] = 270;
      labels[ "medium"] = 460;
      labels[ "large"] = 768;
      labels[ "xlarge"] = 1000;

      let listSrc = new Array();
      const idx = image.src.indexOf(".");
      for(let label in labels){
        listSrc.push(`${str.slice(0, idx)}-${label}_${label}${str.slice(idx)} ${labels[label]}w`);
      }
      return listSrc.join();
    }

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.setAttribute('srcset', createSrcs(image.src) );
    image.setAttribute('sizes','(min-width: 769px) 50vw, 100vw' );
    image.setAttribute('alt', `${restaurant.name}, ${restaurant.cuisine_type} restaurant in ${restaurant.neighborhood}.` );
  }

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();

}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('div'); //tr
    row.setAttribute("role","row");
    row.setAttribute("aria-label",`Hours on`);

    const day = document.createElement('span');
    day.innerHTML = key;
    day.setAttribute("role","columnheader");
    row.appendChild(day);

    const time = document.createElement('span');
    time.innerHTML = operatingHours[key];
    time.setAttribute("role", "cell");
    row.appendChild(time);
    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  // Restaurant ID for form
  const inputrestaurantid = document.getElementById('restaurantid');
  inputrestaurantid.value = self.restaurant.id;
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.classList.add("review-customer");
  name.innerHTML = review.name;
  li.appendChild(name);

  const rating = document.createElement('p');
  rating.classList.add("review-rating");
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const date = document.createElement('p');
  date.classList.add("review-date");
  // "date": "October 26, 2016",
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
  const dateobj = new Date(review.createdAt);
  date.innerHTML = `${monthNames[dateobj.getMonth()]} ${dateobj.getDate()}, ${dateobj.getFullYear()}`;
  li.appendChild(date);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current","page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


 /* SHOW/HIDE FORM */
 const addreview = document.getElementById("addreview");

 addreview.addEventListener('click', function(){
   const form = document.getElementById("newreview");
   if(form.style.display == 'block'){
     form.style.display = 'none';
   }else{
     form.style.display = 'block';
   }
 });



/**** REVIEWS */
const submitreview = document.getElementById("submitreview");

submitreview.addEventListener('click', function(){
  if(document.getElementById('alert') != null && document.getElementById('alert').length ){
    const alert = document.getElementById('alert');
    alert.parentNode.removeChild(alert);
  }
  const now = Date.now();
  if( document.getElementById('name').value != "" && document.getElementById('comment').value != "" ){
    const review = {
      "restaurant_id": parseInt(document.getElementById('restaurantid').value),
      "name": document.getElementById('name').value,
      "rating":  parseInt(document.getElementById('rating').value),
      "comments": document.getElementById('comment').value,
      "createdAt": now,
      "updatedAt": now
    }
    addNewReview(review); // add to html page //OK
    addNewReviewInLocal(review); //add to idb
    if(navigator.onLine) { //Notify
      addNewReviewsInDB();
    } else {
      const msg = "Please note you are OFFLINE, we will save review on server when you will go back ONLINE.";
      notify(msg, "warning");
    }
  } else {
    const msg = "Please insert comment, name and rating before to send review.";
    notify(msg, "danger");
  }
});

function addNewReview(review){
  // ADD Review in HTML LIST
  const form = document.getElementById("newreview");
  form.style.display = 'none';
  form.reset();
  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(review));
  ul.lastChild.scrollIntoView();
}

function addNewReviewInLocal(review){
  // ADD Review in INDEXDB
  return dbPromise.then((dbr) => {
    const tx = dbr.transaction('reviews', 'readwrite');
    const reviewsStore = tx.objectStore('reviews');
    reviewsStore.put(review);
  }).catch(() => {
      throw Error('Reviews were not added to the store');
  });
}

function addNewReviewInDB(parameters){
  let reviewid = parameters.id;
  delete parameters.saved;
  delete parameters.id;
  const headers = new Headers({'Content-Type': 'application/json'});
  const body = JSON.stringify(parameters);
  // http://localhost:1337/reviews/?restaurant_id=<restaurant_id>
  const reviewsUrl =  `${document.getElementById('newreview').action}?restaurant_id=${parameters.restaurant_id}`;
  fetch(reviewsUrl, {
      method: 'POST',
      headers: headers,
      body: body
  }).then(() =>{
    dbPromise.then(db => {
      return db.transaction('restaurants').objectStore('restaurants').get( parseInt(parameters.restaurant_id));
    }).then( (restaurant) => {
      // ADD review to restaurant object
      restaurant.reviews.push(parameters);

      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        tx.objectStore('restaurants').put(restaurant, parameters.restaurant_id); // update restaurant in idb "restaurants" obj
        return tx.complete;
      }).then ( () => {
        // Delete item in reviews
        dbPromise.then(db => {
          const tx = db.transaction('reviews', 'readwrite');
          tx.objectStore('reviews').delete(reviewid); // delete review in idb "reviews" obj
          return tx.complete;
        });
      });
    });
  });
  return true;
}

function addNewReviewsInDB(){
  //get reviews from idb
  dbPromise.then( (db) => {
    return db.transaction('reviews').objectStore('reviews').getAll();
  }).then( (reviews) =>{
    if(reviews.length >0 ){
      for(let review of reviews ){
        review.restaurant_id = parseInt(review.restaurant_id);
        addNewReviewInDB(review);
      }
    }
  }).then( () => {
    return true;
  });
}

function handleConnectionChange(event){
  if(event.type == "offline"){
    const msg = "Please note you are OFFLINE, we will save eventually reviews/favorites on server when you will go back ONLINE.";
    console.log(msg);
    notify(msg, "warning");
  }
  if(event.type == "online"){
    const msg = "Your are ONLINE, we are saving your reviews/favorites on server."
    console.log(msg);
    notify(msg, "success");
    addNewReviewsInDB();
    updateFavoritesInDB();
  }
}
window.addEventListener('online', handleConnectionChange);
window.addEventListener('offline', handleConnectionChange);

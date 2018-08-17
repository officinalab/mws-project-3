/**
 * Common database helper functions.
 */


class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // load data from idb if data exists
    dbPromise.then(db => {
      return db.transaction('restaurants').objectStore('restaurants').getAll();
    }).then(restaurantList => {
      if(restaurantList.length >0 ){
        // END insert
        callback(null, restaurantList);
      }else{
        let myRequest = new Request(DBHelper.DATABASE_URL+'/restaurants');
        fetch(myRequest, { method: 'GET'}).then(function(response) {
          var contentType = response.headers.get("content-type");
          if(contentType && contentType.indexOf("application/json") !== -1) {
            return response.json().then(function(restaurants) {
                //Insert result in indexDB
                for(let restaurant of restaurants){
                  let myRequestReviews = new Request(DBHelper.DATABASE_URL+'/reviews/?restaurant_id='+ restaurant.id);
                  fetch(myRequestReviews, { method: 'GET'}).then(function(responseRev) {
                    var contentTypeRev = responseRev.headers.get("content-type");
                    if(contentTypeRev && contentTypeRev.indexOf("application/json") !== -1) {
                      return responseRev.json().then(function(reviews) {
                        let copyRestaurant = restaurant
                        copyRestaurant.reviews = reviews;
                        dbPromise.then(db => {
                          const tx = db.transaction('restaurants', 'readwrite');
                          tx.objectStore('restaurants').put(copyRestaurant, restaurant.id);
                          return tx.complete;
                        });
                      });
                    }else{
                      dbPromise.then(db => {
                        const tx = db.transaction('restaurants', 'readwrite');
                        tx.objectStore('restaurants').put(restaurant, restaurant.id);
                        return tx.complete;
                      });
                    }
                  }).catch( (error) =>{
                    console.log("Prbb fetch reviews", error);
                    dbPromise.then(db => {
                      const tx = db.transaction('restaurants', 'readwrite');
                      tx.objectStore('restaurants').put(restaurant, restaurant.id);
                      return tx.complete;
                    });
                  });
                }
                // END insert
                callback(null, restaurants);
            });
          } else {
            const error = (`Oops, not JSON data!`);
            callback(error, null);
          }
        });
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */



  static fetchRestaurantById(id, callback) {


    dbPromise.then( (db) => {

      db.transaction('restaurants').objectStore('restaurants').get( parseInt(id)).then( (restaurant) => {
        if(typeof restaurant !== 'undefined' ){
          var tx = db.transaction('reviews');
          var reviewsStore = tx.objectStore('reviews');
          var restaurantIndex = reviewsStore.index('restaurant_id');
          restaurantIndex.openCursor( parseInt(id) ).then( function listReviews(cursor) {
            if (!cursor) return;
            // I could also do things like:
            // cursor.update(newValue) to change the value, or
            // cursor.delete() to delete this entry
            restaurant.reviews.push(cursor.value);
            return cursor.continue().then(listReviews);
          }).then(function() {
            callback(null, restaurant);
          }).catch( () =>{
            console.log('Problem cursoring');
            callback(null, restaurant);
          });
        }else{
          let myRequest = new Request(DBHelper.DATABASE_URL+'/restaurants/'+id);
          fetch(myRequest, { method: 'GET'}).then(function(response) {
            let contentType = response.headers.get("content-type");
            if(contentType && contentType.indexOf("application/json") !== -1) {
              return response.json().then( function(restaurant) {
                // fetch reviews
                let myRequestr = new Request(DBHelper.DATABASE_URL+'/reviews/?restaurant_id='+id);
                fetch(myRequestr, { method: 'GET'}).then( function(response) {
                  let contentTyper = response.headers.get("content-type");
                  if(contentTyper && contentTyper.indexOf("application/json") !== -1) {
                    return response.json().then( function(reviews) {
                      restaurant.reviews = reviews;
                    });
                  }
                  return;
                }).then( () =>{
                  // Save new restaurant into indexedDb
                  dbPromise.then( (db) => {
                    const tx = db.transaction('restaurants', 'readwrite');
                    tx.objectStore('restaurants').put(restaurant, restaurant.id);
                    return tx.complete;
                  });
                  callback(null, restaurant);
                });
              });
            } else {
              const error = (`Restaurant does not exist!`);
              callback(error, null);
            }
          });
        }
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/images/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    if (typeof google === 'object' && typeof google.maps === 'object') {
      const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        icon: "../images/resto-icon.png",
        animation: google.maps.Animation.BOUCE}
      );
      return marker;
    }
    return false;

  }
}

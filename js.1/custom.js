//opens database

const dbPromise = self.idb.open('rr', 3, function(upgradeDb) {
  switch(upgradeDb.oldVersion) {
    case 0:
      const store = upgradeDb.createObjectStore('restaurants');
      store.createIndex('by-id', 'id');
    case 1:
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        const reviewsIdb = upgradeDb.createObjectStore('reviews', {keyPath: 'id', autoIncrement: "true" });
        //objectStore.createIndex(nomIndex, nomCle, parametresIndexOptionnel);
        reviewsIdb.createIndex('restaurant_id', 'restaurant_id', {unique: false});
      }
    case 2:
      if (!upgradeDb.objectStoreNames.contains('favorites')) {
        const favoritesIdb = upgradeDb.createObjectStore('favorites');
        //objectStore.createIndex(nomIndex, nomCle, parametresIndexOptionnel);
        favoritesIdb.createIndex('restaurant_id', 'restaurant_id');
      }
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


// Notification on screen
function notify(msg, type="danger"){
  // Verify if already alert present and if remove it
  if( document.getElementById('alert') != null ){
    const alert = document.getElementById('alert');
    alert.parentNode.removeChild(alert);
  }
  // NOTIFY USER THAT HE IS OFFLINE or with others message concerning form submit
  const classal = "alert-" + type;
  const newalert = document.createElement('div');
  newalert.classList.add("alert");
  newalert.classList.add(classal);
  if(type != "danger"){
    newalert.classList.add("absolute");
  }
  newalert.setAttribute("id","alert");
  const par = document.createElement('p');
  par.innerHTML = msg;
  newalert.appendChild(par);
  document.body.append(newalert);
  return true;
}

/* FAVORITE MANAGE */

function updateFavoriteInLocal(value,restaurantId){

    // put item in favorite
   return dbPromise.then(db => {
      const tx = db.transaction('favorites', 'readwrite');
      const parameters = {"restaurant_id": restaurantId, "is_favorite": value};
      tx.objectStore('favorites').put(parameters, restaurantId ); // delete review in idb "reviews" obj
      return tx.complete;
    }).then( ()=>{
      return dbPromise.then(db => {
        return db.transaction('restaurants').objectStore('restaurants').get( parseInt(restaurantId));
      }).then( (restaurant) => {
        // ADD review to restaurant object
        restaurant.is_favorite = value;
        dbPromise.then(db => {
          const tx = db.transaction('restaurants', 'readwrite');
          tx.objectStore('restaurants').put(restaurant,restaurantId); // update restaurant in idb "restaurants" obj
          return tx.complete;
        });
      });
    }).catch(() => {
      throw Error('Favorite were not added/update to the store');
    });
}

function updateFavoriteInDB(parameters){
  // http://localhost:1337/restaurants/<restaurant_id>/?is_favorite=false
  const url = `${DBHelper.DATABASE_URL}/restaurants/${parameters.restaurant_id}/?is_favorite=${parameters.is_favorite}`;
  const favoriteUrl = new Request(url);
  fetch(favoriteUrl,{
    method: 'PUT'
  }).then(() =>{
    dbPromise.then(db => {
      return db.transaction('restaurants').objectStore('restaurants').get( parseInt(parameters.restaurant_id));
    }).then( (restaurant) => {
      // ADD review to restaurant object
      restaurant.is_favorite = parameters.is_favorite;
      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        tx.objectStore('restaurants').put(restaurant, parameters.restaurant_id); // update restaurant in idb "restaurants" obj
        return tx.complete;
      }).then ( () => {
        // Delete item in reviews
        dbPromise.then(db => {
          const tx = db.transaction('favorites', 'readwrite');
          tx.objectStore('favorites').delete(parameters.restaurant_id); // delete review in idb "reviews" obj
          return tx.complete;
        });
      });
    });
  });
  return true;
}

function updateFavoritesInDB(){
  //get reviews from idb
  return dbPromise.then( (db) => {
    return db.transaction('favorites').objectStore('favorites').getAll();
  }).then( (favorites) =>{
    if(favorites.length >0 ){
      for(let favorite of favorites ){
        updateFavoriteInDB(favorite);
      }
    }
  });
}

var toogleFavorite = function() {
  const restaurantId = parseInt(this.id.slice(22)); // id == "favorite_restaurantid-{id}"
  let value;
  if(this.classList.contains('isfavorite')){
    this.classList.remove('isfavorite');
    value = false;
  }else{
    this.classList.add('isfavorite');
    value= true;
  }
  //change in idb
  updateFavoriteInLocal(value,restaurantId).then(()=>{
    //change in db
    if(navigator.onLine) { //Notify
      updateFavoritesInDB();
    } else {
      const msg = "Please note you are OFFLINE, we will save favorites on server when you will go back ONLINE.";
      notify(msg, "warning");
    }
  });
};
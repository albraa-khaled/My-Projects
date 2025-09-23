/* ========= Role-based CarPool App (client-side) =========
   - Users stored in localStorage under 'cp_users'
   - Trips stored in localStorage under 'cp_trips'
   - Current user stored under 'cp_current'
   - No server needed; works with browser-sync
*/

///// Helpers /////
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9); }

///// Initial data (only if not exist) /////
if(!localStorage.getItem('cp_users')){
  const demoUsers = {
    "admin": { password: "admin", role: "admin"},
    "driver1": { password: "pass", role: "driver"},
    "user1": { password: "pass", role: "passenger"}
  };
  localStorage.setItem('cp_users', JSON.stringify(demoUsers));
}
if(!localStorage.getItem('cp_trips')){
  const demoTrips = [
    { id: uid('t'), driver:"driver1", from:"Abdali", to:"Queen Alia Airport", datetime:"2025-08-15T08:30", seats:4, price:15, car:"Toyota Camry", plate:"AMM123"},
    { id: uid('t'), driver:"driver1", from:"Shmeisani", to:"Zarqa", datetime:"2025-08-15T09:00", seats:3, price:8, car:"Elantra", plate:"AMM567"},
  ];
  localStorage.setItem('cp_trips', JSON.stringify(demoTrips));
}

///// App state /////
let currentUser = JSON.parse(localStorage.getItem('cp_current')) || null;
const usersKey = 'cp_users';
const tripsKey = 'cp_trips';

///// Map setup /////
const map = L.map('map').setView([31.9539, 35.9106], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© OpenStreetMap contributors'
}).addTo(map);

let tripMarkers = [];

function clearTripMarkers(){
  tripMarkers.forEach(m => map.removeLayer(m));
  tripMarkers = [];
}

function renderTripsOnMap(trips){
  clearTripMarkers();
  trips.forEach(trip => {
    const m = L.marker([31.9539 + (Math.random()-0.5)*0.06, 35.9106 + (Math.random()-0.5)*0.06]).addTo(map);
    m.bindPopup(`
      <div class="marker-popup">
        <strong>${trip.from} → ${trip.to}</strong><br>
        Driver: ${trip.driver} • ${trip.car} ${trip.plate}<br>
        ${new Date(trip.datetime).toLocaleString()} • ${trip.seats} seats • ${trip.price} JOD<br>
        ${ currentUser && currentUser.role === 'passenger' && trip.seats>0 ? `<button data-trip="${trip.id}" class="reserve-btn">Reserve</button>` : '' }
      </div>
    `);
    tripMarkers.push(m);
  });
}

// Reserve button in marker: use event delegation on document (Leaflet popups added to DOM when opened)
document.addEventListener('click',(e)=>{
  if(e.target && e.target.matches('.reserve-btn')){
    const tripId = e.target.getAttribute('data-trip');
    doReserve(tripId);
  }
});

///// UI rendering /////
function updateHeader(){
  $('welcomeText').textContent = currentUser ? `${currentUser.username} (${currentUser.role})` : '';
  $('loginBtn').style.display = currentUser ? 'none' : '';
  $('signupBtn').style.display = currentUser ? 'none' : '';
  $('logoutBtn').style.display = currentUser ? '' : 'none';
  $('startBookingBtn').style.display = (currentUser && currentUser.role === 'passenger') ? '' : 'none';
}

function renderSidebar(){
  const sidebar = $('sidebar');
  sidebar.innerHTML = '';
  if(!currentUser){
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<h2>Welcome</h2><p class="small">Please login or create an account to start using the app.</p>`;
    sidebar.appendChild(card);
    return;
  }

  if(currentUser.role === 'passenger'){
    const t = document.getElementById('passengerTemplate').content.cloneNode(true);
    sidebar.appendChild(t);
    // set default date to today
    const dateInput = sidebar.querySelector('#searchDate');
    if(dateInput) dateInput.value = new Date().toISOString().slice(0,10);
    // wire search button
    sidebar.querySelector('#searchTripsBtn').addEventListener('click', passengerSearch);
    // initial fill of trips list
    passengerSearch();
  }

  if(currentUser.role === 'driver'){
    const t = document.getElementById('driverTemplate').content.cloneNode(true);
    sidebar.appendChild(t);
    // create trip handler
    sidebar.querySelector('#createTripBtn').addEventListener('click', ()=>{
      const from = sidebar.querySelector('#createFrom').value.trim();
      const to = sidebar.querySelector('#createTo').value.trim();
      const datetime = sidebar.querySelector('#createDateTime').value;
      const seats = parseInt(sidebar.querySelector('#createSeats').value)||1;
      const price = parseFloat(sidebar.querySelector('#createPrice').value)||0;
      const car = sidebar.querySelector('#createCar').value.trim()||'Car';
      const plate = sidebar.querySelector('#createPlate').value.trim()||'---';
      if(!from||!to||!datetime){ alert('Fill from, to and date/time'); return; }
      const trips = JSON.parse(localStorage.getItem(tripsKey) || '[]');
      const newTrip = { id: uid('t'), driver: currentUser.username, from, to, datetime, seats, price, car, plate };
      trips.push(newTrip);
      localStorage.setItem(tripsKey, JSON.stringify(trips));
      alert('Trip created');
      renderSidebar(); // re-render so driver sees own trips
      renderAllTripsOnMap();
    });
    // driver trip list
    const listEl = sidebar.querySelector('#driverTripList');
    const trips = JSON.parse(localStorage.getItem(tripsKey) || '[]').filter(t=>t.driver===currentUser.username);
    listEl.innerHTML = trips.length ? trips.map(t => tripCardHTML(t)).join('') : '<p class="small">No trips yet</p>';
    // add cancel trip actions
    listEl.querySelectorAll('.cancel-trip-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const tripId = btn.getAttribute('data-trip');
        let tripsAll = JSON.parse(localStorage.getItem(tripsKey) || '[]');
        tripsAll = tripsAll.filter(x=>x.id!==tripId);
        localStorage.setItem(tripsKey, JSON.stringify(tripsAll));
        renderSidebar();
        renderAllTripsOnMap();
      });
    });
  }

  if(currentUser.role === 'admin'){
    const t = document.getElementById('adminTemplate').content.cloneNode(true);
    sidebar.appendChild(t);

    // users management
    const usersObj = JSON.parse(localStorage.getItem(usersKey) || '{}');
    const usersArr = Object.keys(usersObj).map(u => ({ username: u, role: usersObj[u].role }));
    const adminUsers = sidebar.querySelector('#adminUsers');
    adminUsers.innerHTML = usersArr.map(u => `
      <div class="trip-card">
        <div><strong>${u.username}</strong> <span class="small">(${u.role})</span></div>
        <div style="margin-top:8px">
          <button class="btn btn-secondary delete-user" data-user="${u.username}">Delete</button>
        </div>
      </div>
    `).join('');
    adminUsers.querySelectorAll('.delete-user').forEach(b=>{
      b.addEventListener('click', ()=>{
        const uname = b.getAttribute('data-user');
        const users = JSON.parse(localStorage.getItem(usersKey) || '{}');
        delete users[uname];
        localStorage.setItem(usersKey, JSON.stringify(users));
        renderSidebar();
      });
    });

    // trips list for admin
    const adminTrips = sidebar.querySelector('#adminTrips');
    const allTrips = JSON.parse(localStorage.getItem(tripsKey) || '[]');
    adminTrips.innerHTML = allTrips.map(t => `
      <div class="trip-card">
        <div><strong>${t.from} → ${t.to}</strong></div>
        <div class="small">${t.datetime} • ${t.seats} seats • Driver: ${t.driver}</div>
        <div style="margin-top:8px"><button class="btn btn-secondary delete-trip" data-id="${t.id}">Delete Trip</button></div>
      </div>
    `).join('');
    adminTrips.querySelectorAll('.delete-trip').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = b.getAttribute('data-id');
        let all = JSON.parse(localStorage.getItem(tripsKey) || '[]');
        all = all.filter(x=>x.id!==id);
        localStorage.setItem(tripsKey, JSON.stringify(all));
        renderSidebar();
        renderAllTripsOnMap();
      });
    });
  }
}

function tripCardHTML(t){
  return `
    <div class="trip-card">
      <div><strong>${t.from} → ${t.to}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${t.price} JOD • ${t.car} ${t.plate}</div>
      <div style="margin-top:8px">
        <button class="btn btn-secondary cancel-trip-btn" data-trip="${t.id}">Cancel</button>
      </div>
    </div>
  `;
}

///// Passenger search & reserve /////
function passengerSearch(){
  const sidebar = $('sidebar');
  const from = sidebar.querySelector('#searchFrom').value.trim().toLowerCase();
  const to = sidebar.querySelector('#searchTo').value.trim().toLowerCase();
  const passengers = parseInt(sidebar.querySelector('#searchPassengers').value) || 1;
  const date = sidebar.querySelector('#searchDate').value;

  let trips = JSON.parse(localStorage.getItem(tripsKey) || '[]');
  // simple filter: match from/to text and seats >= passengers and same date if provided
  trips = trips.filter(t => {
    const matchesFrom = !from || t.from.toLowerCase().includes(from);
    const matchesTo = !to || t.to.toLowerCase().includes(to);
    const enoughSeats = (t.seats || 0) >= passengers;
    const matchesDate = !date || t.datetime.startsWith(date);
    return matchesFrom && matchesTo && enoughSeats && matchesDate;
  });

  // display list
  const listEl = $('tripList');
  listEl.innerHTML = trips.length ? trips.map(t=>`
    <div class="trip-card">
      <div><strong>${t.from} → ${t.to}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${t.price} JOD • Driver: ${t.driver}</div>
      <div style="margin-top:8px">
        <button class="btn reserve-local" data-id="${t.id}">Reserve</button>
      </div>
    </div>
  `).join('') : '<p class="small">No trips found</p>';

  // Reserve buttons
  listEl.querySelectorAll('.reserve-local').forEach(b=>{
    b.addEventListener('click', () => doReserve(b.getAttribute('data-id'), passengers));
  });

  // Map markers -> show only filtered trips
  renderTripsOnMap(trips);
}

function doReserve(tripId, seatsRequested=1){
  if(!currentUser || currentUser.role!=='passenger'){ alert('You must be a logged-in passenger to reserve'); return; }
  const trips = JSON.parse(localStorage.getItem(tripsKey) || '[]');
  const idx = trips.findIndex(t=>t.id===tripId);
  if(idx===-1){ alert('Trip not found'); return; }
  const t = trips[idx];
  if((t.seats||0) < seatsRequested){ alert('Not enough seats'); return; }
  // decrement seats and save reservation record
  trips[idx].seats = (t.seats - seatsRequested);
  localStorage.setItem(tripsKey, JSON.stringify(trips));

  // store reservation (simple)
  const reservations = JSON.parse(localStorage.getItem('cp_res') || '[]');
  reservations.push({ id: uid('r'), tripId, passenger: currentUser.username, seats: seatsRequested, time: new Date().toISOString() });
  localStorage.setItem('cp_res', JSON.stringify(reservations));

  alert('Reservation successful');
  passengerSearch(); // refresh listing and map
  renderAllTripsOnMap();
}

///// render all trips on map (for admin/driver view) /////
function renderAllTripsOnMap(){
  const all = JSON.parse(localStorage.getItem(tripsKey) || '[]');
  renderTripsOnMap(all);
}

///// Authentication UI and handlers /////
$('loginBtn').addEventListener('click', ()=>$('loginModal').style.display='flex');
$('signupBtn').addEventListener('click', ()=>$('registerModal').style.display='flex');
$('logoutBtn').addEventListener('click', ()=>{
  localStorage.removeItem('cp_current'); currentUser=null; updateHeader(); renderSidebar(); renderAllTripsOnMap();
});

// modal close buttons
document.querySelectorAll('.modal-close').forEach(b=>{
  b.addEventListener('click', ()=> b.closest('.modal').style.display='none');
});
$('toRegister').addEventListener('click', ()=>{ $('loginModal').style.display='none'; $('registerModal').style.display='flex';});
$('toLogin').addEventListener('click', ()=>{ $('registerModal').style.display='none'; $('loginModal').style.display='flex';});

// perform login
$('doLogin').addEventListener('click', ()=>{
  const username = $('loginUser').value.trim();
  const pass = $('loginPass').value;
  if(!username||!pass){ alert('Enter credentials'); return; }
  const users = JSON.parse(localStorage.getItem(usersKey) || '{}');
  if(!users[username] || users[username].password !== pass){ alert('Invalid'); return; }
  currentUser = { username, role: users[username].role };
  localStorage.setItem('cp_current', JSON.stringify(currentUser));
  $('loginModal').style.display='none';
  updateHeader(); renderSidebar(); renderAllTripsOnMap();
});

// register
$('doRegister').addEventListener('click', ()=>{
  const username = $('regUser').value.trim();
  const pass = $('regPass').value;
  const role = $('regRole').value;
  if(!username||!pass||!role){ alert('Fill fields'); return; }
  const users = JSON.parse(localStorage.getItem(usersKey) || '{}');
  if(users[username]){ alert('Username exists'); return; }
  users[username] = { password: pass, role };
  localStorage.setItem(usersKey, JSON.stringify(users));
  currentUser = { username, role };
  localStorage.setItem('cp_current', JSON.stringify(currentUser));
  $('registerModal').style.display='none';
  updateHeader(); renderSidebar(); renderAllTripsOnMap();
});

///// Startup /////
function boot(){
  currentUser = JSON.parse(localStorage.getItem('cp_current')) || null;
  updateHeader();
  renderSidebar();
  renderAllTripsOnMap();
}
boot();

/* Frontend AJAX -> PHP (api.php?action=...)
   - Auth: register, login, users, delete_user
   - Trips: get_trips, create_trip, delete_trip
   - Reservations: reserve
*/
const API = (action) => `api.php?action=${encodeURIComponent(action)}`;

// --- State ---
let currentUser = JSON.parse(localStorage.getItem("cp_current")) || null;
let allTrips = [];

// --- DOM helpers ---
const $ = id => document.getElementById(id);

// --- Map (MapTiler SDK with Arabic labels) ---
maptilersdk.config.apiKey = "nB486VHoOGhyah0cIYsQ"; // Replace with your MapTiler key
const map = new maptilersdk.Map({
  container: 'map',
  style: maptilersdk.MapStyle.STREETS,
  center: [35.9106, 31.9539], // Amman
  zoom: 12
});

map.on('load', function () {
  map.setLanguage(maptilersdk.Language.ARABIC);
});

let searchMarker = null;
let tripMarkers = [];
function clearTripMarkers(){ tripMarkers.forEach(m => m.remove()); tripMarkers = []; }
function renderTripsOnMap(trips){
  clearTripMarkers();
  // NOTE: sample uses jittered coordinates; you can geocode to real coords later
  trips.forEach(t => {
    const jitter = () => (Math.random()-0.5)*0.06;
    const marker = new maplibregl.Marker()
      .setLngLat([35.9106 + jitter(), 31.9539 + jitter()])
      .setPopup(new maplibregl.Popup().setHTML(`
        <div class="marker-popup">
          <strong>${t.origin} → ${t.destination}</strong><br/>
          Driver: ${t.driver_username} • ${t.car} ${t.plate}<br/>
          ${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${t.price} JOD<br/>
          ${(currentUser && currentUser.role==='passenger' && t.seats>0)
            ? `<button data-trip="${t.id}" class="reserve-btn">Reserve</button>` : ''}
        </div>
      `))
      .addTo(map);
    tripMarkers.push(marker);
  });
}
document.addEventListener('click',(e)=>{
  if(e.target && e.target.matches('.reserve-btn')){
    const tripId = e.target.getAttribute('data-trip');
    doReserve(tripId, 1);
  }
});

// --- Search (Nominatim) ---
$('searchBtn').addEventListener('click', searchLocation);
$('searchBox').addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchLocation(); });

function searchLocation() {
  const q = $('searchBox').value.trim();
  const list = $('searchResults');
  list.innerHTML = '';
  list.style.display = 'none';
  if (!q) { alert('Enter a location'); return; }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r=>r.json())
    .then(data=>{
      if (!Array.isArray(data) || data.length===0) { alert('No results'); return; }
      list.style.display = 'block';
      data.slice(0,8).forEach(place=>{
        const li = document.createElement('li');
        li.textContent = place.display_name;
        li.onclick = ()=> selectLocation(place);
        list.appendChild(li);
      });
    })
    .catch(err=>console.error(err));
}

function selectLocation(place) {
  const lon = parseFloat(place.lon), lat = parseFloat(place.lat);
  map.flyTo({ center:[lon,lat], zoom: 14 });
  if (searchMarker) searchMarker.remove();
  searchMarker = new maplibregl.Marker().setLngLat([lon,lat]).addTo(map);
  $('searchResults').style.display = 'none';
}

// --- Header / Modals ---
function updateHeader(){
  $('welcomeText').textContent = currentUser ? `${currentUser.username} (${currentUser.role})` : '';
  $('loginBtn').style.display  = currentUser ? 'none' : '';
  $('signupBtn').style.display = currentUser ? 'none' : '';
  $('logoutBtn').style.display = currentUser ? '' : 'none';
  $('startBookingBtn').style.display = (currentUser && currentUser.role==='passenger') ? '' : 'none';
}
$('loginBtn').addEventListener('click', ()=> $('loginModal').style.display='flex');
$('signupBtn').addEventListener('click', ()=> $('registerModal').style.display='flex');
$('logoutBtn').addEventListener('click', ()=>{
  currentUser=null; localStorage.removeItem('cp_current');
  updateHeader(); renderSidebar(); fetchTrips();
});
document.querySelectorAll('.modal-close').forEach(btn=>{
  btn.addEventListener('click', ()=> btn.closest('.modal').style.display='none');
});
$('toRegister').addEventListener('click', ()=>{ $('loginModal').style.display='none'; $('registerModal').style.display='flex'; });
$('toLogin').addEventListener('click', ()=>{ $('registerModal').style.display='none'; $('loginModal').style.display='flex'; });

// --- Auth AJAX ---
$('doLogin').addEventListener('click', async ()=>{
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  if(!username || !password){ alert('Enter credentials'); return; }
  const res = await fetch(API('login'), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error || 'Login failed'); return; }
  currentUser = data.user;
  localStorage.setItem('cp_current', JSON.stringify(currentUser));
  $('loginModal').style.display='none';
  updateHeader(); renderSidebar(); fetchTrips();
});

$('doRegister').addEventListener('click', async ()=>{
  const username = $('regUser').value.trim();
  const password = $('regPass').value;
  const role = $('regRole').value;
  if(!username || !password || !role){ alert('Fill all fields'); return; }
  const res = await fetch(API('register'), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password, role })
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error || 'Register failed'); return; }
  currentUser = data.user;
  localStorage.setItem('cp_current', JSON.stringify(currentUser));
  $('registerModal').style.display='none';
  updateHeader(); renderSidebar(); fetchTrips();
});

// --- Sidebar (role-based) ---
function renderSidebar(){
  const sb = $('sidebar');
  sb.innerHTML = '';
  if(!currentUser){
    sb.innerHTML = `<div class="card"><h2>Welcome</h2><p class="small">Please login or create an account.</p></div>`;
    return;
  }
  if(currentUser.role === 'passenger'){
    const t = $('passengerTemplate').content.cloneNode(true);
    sb.appendChild(t);
    const dateInput = sb.querySelector('#searchDate');
    if(dateInput) dateInput.value = new Date().toISOString().slice(0,10);
    sb.querySelector('#searchTripsBtn').addEventListener('click', passengerSearch);
    passengerSearch();
  }
  if(currentUser.role === 'driver'){
    const t = $('driverTemplate').content.cloneNode(true);
    sb.appendChild(t);
    sb.querySelector('#createTripBtn').addEventListener('click', createTrip);
    renderDriverTrips();
  }
  if(currentUser.role === 'admin'){
    const t = $('adminTemplate').content.cloneNode(true);
    sb.appendChild(t);
    renderAdmin();
  }
}

// --- Trips / Reservations ---
async function fetchTrips(){
  const res = await fetch(API('get_trips'));
  allTrips = await res.json();
  renderTripsOnMap(allTrips);
}

function passengerSearch(){
  const s = $('sidebar');
  const from = (s.querySelector('#searchFrom').value||'').trim().toLowerCase();
  const to = (s.querySelector('#searchTo').value||'').trim().toLowerCase();
  const passengers = parseInt(s.querySelector('#searchPassengers').value)||1;
  const date = s.querySelector('#searchDate').value;

  let trips = allTrips.slice().filter(t=>{
    const f = !from || t.origin.toLowerCase().includes(from);
    const tt = !to || t.destination.toLowerCase().includes(to);
    const seatsOk = (t.seats||0) >= passengers;
    const d = !date || (t.datetime||'').startsWith(date);
    return f && tt && seatsOk && d;
  });

  const list = $('tripList');
  list.innerHTML = trips.length ? trips.map(t => `
    <div class="trip-card">
      <div><strong>${t.origin} → ${t.destination}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${Number(t.price)} JOD • Driver: ${t.driver_username}</div>
      <div style="margin-top:8px">
        <button class="btn reserve-local" data-id="${t.id}" ${t.seats<=0?'disabled':''}>Reserve</button>
      </div>
    </div>
  `).join('') : '<p class="small">No trips found</p>';

  list.querySelectorAll('.reserve-local').forEach(b=>{
    b.addEventListener('click', ()=> doReserve(b.getAttribute('data-id'), passengers));
  });

  renderTripsOnMap(trips);
}

async function doReserve(tripId, seats=1){
  if(!currentUser || currentUser.role!=='passenger'){ alert('Login as passenger first'); return; }
  const res = await fetch(API('reserve'), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ tripId, passenger: currentUser.username, seats })
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error || 'Reservation failed'); return; }
  alert('Reservation successful');
  await fetchTrips();
  if (currentUser?.role === 'passenger') passengerSearch();
}

async function createTrip(){
  const s = $('sidebar');
  const payload = {
    driver: currentUser.username,
    from: s.querySelector('#createFrom').value.trim(),
    to: s.querySelector('#createTo').value.trim(),
    datetime: s.querySelector('#createDateTime').value,
    seats: parseInt(s.querySelector('#createSeats').value)||1,
    price: parseFloat(s.querySelector('#createPrice').value)||0,
    car: s.querySelector('#createCar').value.trim() || 'Car',
    plate: s.querySelector('#createPlate').value.trim() || '---'
  };
  if(!payload.from || !payload.to || !payload.datetime){ alert('Fill From, To and Date/Time'); return; }

  const res = await fetch(API('create_trip'), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error||'Failed to create'); return; }
  alert('Trip created');
  await fetchTrips();
  renderDriverTrips();
}

function renderDriverTrips(){
  const s = $('sidebar');
  const list = s.querySelector('#driverTripList');
  const myTrips = allTrips.filter(t => t.driver_username === (currentUser?.username));
  list.innerHTML = myTrips.length ? myTrips.map(t => `
    <div class="trip-card">
      <div><strong>${t.origin} → ${t.destination}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${Number(t.price)} JOD • ${t.car} ${t.plate}</div>
      <div style="margin-top:8px">
        <button class="btn btn-secondary" data-del="${t.id}">Cancel Trip</button>
      </div>
    </div>
  `).join('') : '<p class="small">No trips yet</p>';

  list.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const id = b.getAttribute('data-del');
      const res = await fetch(API('delete_trip'), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if(!res.ok){ alert(data.error||'Delete failed'); return; }
      await fetchTrips();
      renderDriverTrips();
    });
  });
}

// --- Admin ---
async function renderAdmin(){
  const s = $('sidebar');
  // users
  const usersRes = await fetch(API('users'));
  const users = await usersRes.json();
  const usersEl = s.querySelector('#adminUsers');
  usersEl.innerHTML = users.map(u => `
    <div class="trip-card">
      <div><strong>${u.username}</strong> <span class="small">(${u.role})</span></div>
      <div style="margin-top:8px"><button class="btn btn-secondary" data-user="${u.username}">Delete</button></div>
    </div>
  `).join('');
  usersEl.querySelectorAll('[data-user]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const uname = btn.getAttribute('data-user');
      const res = await fetch(API('delete_user'), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: uname })
      });
      const data = await res.json();
      if(!res.ok){ alert(data.error||'Delete failed'); return; }
      renderAdmin();
    });
  });

  // trips
  const tripsEl = s.querySelector('#adminTrips');
  tripsEl.innerHTML = allTrips.map(t => `
    <div class="trip-card">
      <div><strong>${t.origin} → ${t.destination}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • Driver: ${t.driver_username}</div>
      <div style="margin-top:8px"><button class="btn btn-secondary" data-del="${t.id}">Delete Trip</button></div>
    </div>
  `).join('');
  tripsEl.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-del');
      const res = await fetch(API('delete_trip'), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if(!res.ok){ alert(data.error||'Delete failed'); return; }
      await fetchTrips();
      renderAdmin();
    });
  });
}

// --- Boot ---
async function boot(){
  updateHeader();
  renderSidebar();
  await fetchTrips();
}
boot();

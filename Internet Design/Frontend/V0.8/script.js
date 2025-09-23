/* JSON-backed CarPool (AJAX + Express)
   - Users: /api/register, /api/login, /api/users
   - Trips: /api/trips (GET, POST, DELETE)
   - Reservations: /api/reserve (POST)
*/

const API = {
  login: "/api/login",
  register: "/api/register",
  users: "/api/users",
  trips: "/api/trips",
  reserve: "/api/reserve"
};

// --- State ---
let currentUser = JSON.parse(localStorage.getItem("cp_current")) || null;
let allTrips = [];

// --- DOM helpers ---
const $ = id => document.getElementById(id);

// --- Map ---
const map = L.map('map').setView([31.9539, 35.9106], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© OpenStreetMap contributors'
}).addTo(map);
let tripMarkers = [];
function clearTripMarkers(){ tripMarkers.forEach(m => map.removeLayer(m)); tripMarkers = []; }
function renderTripsOnMap(trips){
  clearTripMarkers();
  trips.forEach(trip => {
    const jitter = () => (Math.random()-0.5)*0.06;
    const m = L.marker([31.9539 + jitter(), 35.9106 + jitter()]).addTo(map);
    m.bindPopup(`
      <div class="marker-popup">
        <strong>${trip.from} → ${trip.to}</strong><br/>
        Driver: ${trip.driver} • ${trip.car} ${trip.plate}<br/>
        ${new Date(trip.datetime).toLocaleString()} • ${trip.seats} seats • ${trip.price} JOD<br/>
        ${ (currentUser && currentUser.role === 'passenger' && trip.seats>0)
            ? `<button data-trip="${trip.id}" class="reserve-btn">Reserve</button>` : '' }
      </div>
    `);
    tripMarkers.push(m);
  });
}
document.addEventListener('click',(e)=>{
  if(e.target && e.target.matches('.reserve-btn')){
    const tripId = e.target.getAttribute('data-trip');
    doReserve(tripId, 1);
  }
});

// --- UI header ---
function updateHeader(){
  $('welcomeText').textContent = currentUser ? `${currentUser.username} (${currentUser.role})` : '';
  $('loginBtn').style.display  = currentUser ? 'none' : '';
  $('signupBtn').style.display = currentUser ? 'none' : '';
  $('logoutBtn').style.display = currentUser ? '' : 'none';
  $('startBookingBtn').style.display = (currentUser && currentUser.role === 'passenger') ? '' : 'none';
}

// --- Sidebar (role-based) ---
function renderSidebar(){
  const sidebar = $('sidebar');
  sidebar.innerHTML = '';
  if(!currentUser){
    sidebar.innerHTML = `<div class="card"><h2>Welcome</h2><p class="small">Please login or create an account.</p></div>`;
    return;
  }

  if(currentUser.role === 'passenger'){
    const t = $('passengerTemplate').content.cloneNode(true);
    sidebar.appendChild(t);
    const dateInput = sidebar.querySelector('#searchDate');
    if(dateInput) dateInput.value = new Date().toISOString().slice(0,10);
    sidebar.querySelector('#searchTripsBtn').addEventListener('click', passengerSearch);
    passengerSearch();
  }

  if(currentUser.role === 'driver'){
    const t = $('driverTemplate').content.cloneNode(true);
    sidebar.appendChild(t);
    sidebar.querySelector('#createTripBtn').addEventListener('click', createTrip);
    renderDriverTrips();
  }

  if(currentUser.role === 'admin'){
    const t = $('adminTemplate').content.cloneNode(true);
    sidebar.appendChild(t);
    renderAdmin();
  }
}

// --- Data fetchers ---
async function fetchTrips(){
  const res = await fetch(API.trips);
  allTrips = await res.json();
  renderTripsOnMap(allTrips);
}

// --- Auth ---
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

$('doLogin').addEventListener('click', async ()=>{
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value;
  if(!username || !password){ alert('Enter credentials'); return; }
  const res = await fetch(API.login, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  if(!res.ok){ const e = await res.json(); alert(e.error||'Login failed'); return; }
  const data = await res.json();
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
  const res = await fetch(API.register, {
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

// --- Passenger ---
function passengerSearch(){
  const s = $('sidebar');
  const from = (s.querySelector('#searchFrom').value||'').trim().toLowerCase();
  const to = (s.querySelector('#searchTo').value||'').trim().toLowerCase();
  const passengers = parseInt(s.querySelector('#searchPassengers').value)||1;
  const date = s.querySelector('#searchDate').value;

  let trips = allTrips.slice();
  trips = trips.filter(t=>{
    const f = !from || t.from.toLowerCase().includes(from);
    const tt = !to || t.to.toLowerCase().includes(to);
    const seatsOk = (t.seats||0) >= passengers;
    const d = !date || (t.datetime||'').startsWith(date);
    return f && tt && seatsOk && d;
  });

  const list = $('tripList');
  list.innerHTML = trips.length ? trips.map(t => `
    <div class="trip-card">
      <div><strong>${t.from} → ${t.to}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${t.price} JOD • Driver: ${t.driver}</div>
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
  const res = await fetch(API.reserve, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ tripId, passenger: currentUser.username, seats })
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error || 'Reservation failed'); return; }
  alert('Reservation successful');
  await fetchTrips();
  if (currentUser?.role === 'passenger') passengerSearch();
}

// --- Driver ---
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

  const res = await fetch(API.trips, {
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
  const myTrips = allTrips.filter(t => t.driver === currentUser.username);
  list.innerHTML = myTrips.length ? myTrips.map(t => `
    <div class="trip-card">
      <div><strong>${t.from} → ${t.to}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • ${t.price} JOD • ${t.car} ${t.plate}</div>
      <div style="margin-top:8px">
        <button class="btn btn-secondary" data-del="${t.id}">Cancel Trip</button>
      </div>
    </div>
  `).join('') : '<p class="small">No trips yet</p>';

  list.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const id = b.getAttribute('data-del');
      const res = await fetch(`${API.trips}/${id}`, { method:'DELETE' });
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
  const usersRes = await fetch(API.users);
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
      const res = await fetch(`/api/users/${encodeURIComponent(uname)}`, { method:'DELETE' });
      const data = await res.json();
      if(!res.ok){ alert(data.error||'Delete failed'); return; }
      renderAdmin(); // refresh
    });
  });
  // trips
  const tripsEl = s.querySelector('#adminTrips');
  tripsEl.innerHTML = allTrips.map(t => `
    <div class="trip-card">
      <div><strong>${t.from} → ${t.to}</strong></div>
      <div class="small">${new Date(t.datetime).toLocaleString()} • ${t.seats} seats • Driver: ${t.driver}</div>
      <div style="margin-top:8px"><button class="btn btn-secondary" data-del="${t.id}">Delete Trip</button></div>
    </div>
  `).join('');
  tripsEl.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-del');
      const res = await fetch(`${API.trips}/${id}`, { method:'DELETE' });
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

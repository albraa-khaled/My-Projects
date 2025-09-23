// Fixed script.js with the refresh issue resolved

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
  trips.forEach(t => {
    const jitter = () => (Math.random()-0.5)*0.06;
    const marker = new maptilersdk.Marker()
      .setLngLat([35.9106 + jitter(), 31.9539 + jitter()])
      .setPopup(new maptilersdk.Popup()
        .setHTML(`
          <div class="marker-popup">
            <strong>${escapeHtml(t.origin)} → ${escapeHtml(t.destination)}</strong><br/>
            Driver: ${escapeHtml(t.driver_username)} • ${escapeHtml(t.car)} ${escapeHtml(t.plate)}<br/>
            ${formatDateTime(t.datetime)} • ${Number(t.seats)} seats • ${Number(t.price)} JOD<br/>
            ${(currentUser && currentUser.role==='passenger' && t.seats>0)
              ? `<button data-trip="${Number(t.id)}" class="reserve-btn">Reserve</button>` : ''}
          </div>
        `))
      .addTo(map);
    tripMarkers.push(marker);
  });
}
document.addEventListener('click',(e)=>{
  if(e.target && e.target.matches('.reserve-btn')){
    const tripId = e.target.getAttribute('data-trip');
    showSeatSelection(tripId);
  }
});

// --- Search (Nominatim) ---
$('searchBtn').addEventListener('click', searchLocation);
$('searchBox').addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchLocation(); });

function searchLocation() {
  const q = $('searchBox').value.trim();
  const list = $('searchResults');
  list.innerHTML = '';
  list.classList.remove('active');  // Hide results
  if (!q) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
    .then(r => r.json())
    .then(data => {
      if (data.length) {
        list.classList.add('active');  // Show results
        data.slice(0,8).forEach(place=>{
          const li = document.createElement('li');
          li.textContent = place.display_name;
          li.onclick = ()=> selectLocation(place);
          list.appendChild(li);
        });
      }
    })
    .catch(err => console.error(err));
}

// Hide results when clicking outside
document.addEventListener('click', (e) => {
  if (!$('search-container').contains(e.target)) {
    $('searchResults').classList.remove('active');
  }
});

function selectLocation(place) {
  const lon = parseFloat(place.lon), lat = parseFloat(place.lat);
  map.flyTo({ center:[lon,lat], zoom: 14 });
  if (searchMarker) searchMarker.remove();
  searchMarker = new maptilersdk.Marker()    // Changed from maplibregl to maptilersdk
    .setLngLat([lon,lat])
    .addTo(map);
  $('searchResults').style.display = 'none';
}

// --- Header / Modals ---
function updateHeader(){
  $('welcomeText').textContent = currentUser ? `${currentUser.username} (${currentUser.role})` : '';
  $('loginBtn').style.display  = currentUser ? 'none' : '';
  $('signupBtn').style.display = currentUser ? 'none' : '';
  $('logoutBtn').style.display = currentUser ? '' : 'none';
}

// Initialize event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
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
  
  // Add sidebar toggle functionality
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !sidebarToggle.contains(e.target) && 
        sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });
  
  // Close sidebar when map is clicked on mobile
  map.on('click', () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });
});

// --- Sidebar (role-based) ---
function renderSidebar(){
  const sb = $('sidebar');
  sb.innerHTML = '';
  if(!currentUser){
    sb.innerHTML = `
      <div class="card">
        <h2 style="color: blue">Welcome</h2>
        <p class="small">Please login or create an account.</p>
        <div style="margin-top: 20px">
          <h3>About CarPool</h3>
          <p>CarPool is your trusted ride-sharing platform that connects drivers and passengers.</p>
          <ul style="list-style: none; padding-left: 0; margin-top: 10px">
            <li>✓ Safe and reliable rides</li>
            <li>✓ Affordable pricing</li>
            <li>✓ Easy booking system</li>
            <li>✓ Verified drivers</li>
          </ul>
        </div>
      </div>`;
    return;
  }
  if(currentUser.role === 'passenger'){
    const t = $('passengerTemplate').content.cloneNode(true);
    sb.appendChild(t);
    const dateInput = sb.querySelector('#searchDate');
    if(dateInput) dateInput.value = new Date().toISOString().slice(0,10);
    // Call passengerSearch immediately to show all trips
    passengerSearch();
    // Add event listener for search button
    sb.querySelector('#searchTripsBtn').addEventListener('click', passengerSearch);
  }
  if(currentUser.role === 'driver'){
    const t = $('driverTemplate').content.cloneNode(true);
    sb.appendChild(t);
    // Set the driver username in the hidden field
    const driverInput = sb.querySelector('#createDriver');
    if (driverInput) {
      driverInput.value = currentUser.username;
    }
    // Add form submit handler
    const form = sb.querySelector('#createTripForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to create trip');
          alert('Trip created successfully');
          form.reset();
          await fetchTrips();
        } catch (error) {
          alert(error.message);
        }
      });
    }
  }
  if(currentUser.role === 'admin'){
    const t = $('adminTemplate').content.cloneNode(true);
    sb.appendChild(t);
  }
  fetchTrips(); // Fetch trips after rendering sidebar
}

// --- Trips / Reservations ---
async function fetchTrips(){
  try {
    const res = await fetch(API('get_trips'));
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format - expected array');
    }
    
    allTrips = data;
    
    // Render trips on map
    renderTripsOnMap(allTrips);
    
    // Render appropriate dashboard content
    if(currentUser){
      if(currentUser.role === 'passenger'){
        passengerSearch(); // This will now show all trips by default
        renderPassengerReservations();
      } else if(currentUser.role === 'driver'){
        renderDriverTrips();
        renderDriverReservations();
      } else if(currentUser.role === 'admin'){
        renderAdmin();
      }
    } else {
      // Show all trips on map even when not logged in
      renderTripsOnMap(allTrips);
    }
  } catch (error) {
    console.error('Error fetching trips:', error);
    alert(`Failed to load trips: ${error.message}`);
  }
}

function sortByLocaleString(a, b, key) {
  return a[key].localeCompare(b[key], ['en', 'ar'], {
    sensitivity: 'base',
    ignorePunctuation: true,
    numeric: true
  });
}

function passengerSearch(){
  const s = $('sidebar');
  const from = (s.querySelector('#searchFrom')?.value||'').trim().toLowerCase();
  const to = (s.querySelector('#searchTo')?.value||'').trim().toLowerCase();
  const passengers = parseInt(s.querySelector('#searchPassengers')?.value)||1;
  const date = s.querySelector('#searchDate')?.value;

  // If no search criteria are set, show all trips
  let trips;
  if (!from && !to && !date) {
    trips = allTrips.slice();
  } else {
    trips = allTrips.slice().filter(t=>{
      const f = !from || t.origin.toLowerCase().includes(from);
      const tt = !to || t.destination.toLowerCase().includes(to);
      const seatsOk = (t.seats||0) >= passengers;
      const d = !date || (t.datetime||'').startsWith(date);
      return f && tt && seatsOk && d;
    });
  }

  // Sort trips by date, then by origin/destination
  trips.sort((a, b) => {
    const dateCompare = new Date(a.datetime) - new Date(b.datetime);
    if (dateCompare !== 0) return dateCompare;
    
    const originCompare = sortByLocaleString(a, b, 'origin');
    return originCompare !== 0 ? originCompare : sortByLocaleString(a, b, 'destination');
  });

  const list = $('tripList');
  if (list) {
    list.innerHTML = trips.length ? trips.map(t => `
      <div class="trip-card">
        <div><strong>${escapeHtml(t.origin)} → ${escapeHtml(t.destination)}</strong></div>
        <div class="small">
          ${formatDateTime(t.datetime)} • ${t.seats} seats • ${Number(t.price)} JOD<br>
          Driver: ${escapeHtml(t.driver_username)} • ${escapeHtml(t.car)} ${escapeHtml(t.plate)}
        </div>
        ${t.seats > 0 ? `
          <div style="margin-top:8px">
            <button class="btn reserve-btn" data-trip="${t.id}">Select Seat</button>
          </div>
        ` : '<div class="small" style="color: #dc3545">No seats available</div>'}
      </div>
    `).join('') : '<p class="small">No trips found</p>';

    // Update event listeners to use the new seat selection system
    list.querySelectorAll('.reserve-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const tripId = this.getAttribute('data-trip');
        showSeatSelection(tripId);
      });
    });
  }
  
  renderTripsOnMap(trips);
}

// Show seat selection modal
async function showSeatSelection(tripId, seatNum = null) {
  if(!currentUser || currentUser.role!=='passenger'){ 
    alert('Login as passenger first'); 
    return; 
  }
  
  const trip = allTrips.find(t => t.id == tripId);
  if (!trip) return;

  // Get taken seats first
  try {
    const res = await fetch(API('get_taken_seats'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ tripId })
    });
    
    if (!res.ok) throw new Error('Failed to get taken seats');
    const data = await res.json();
    const takenSeats = new Set(data.taken_seats);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-card">
        <h3>Select Seats for ${trip.origin} → ${trip.destination}</h3>
        <p>Available seats: ${trip.seats}</p>
        <div class="seat-grid" style="margin: 16px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          ${Array.from({length: Math.min(trip.seats + takenSeats.size, 4)}, (_, i) => {
            const seatNumber = i + 1;
            const isTaken = takenSeats.has(seatNumber);
            const isSelected = seatNum == seatNumber && !isTaken;
            return `<div class="seat ${isTaken ? 'unavailable' : isSelected ? 'selected' : 'available'}" 
                        data-seat="${seatNumber}"
                        ${isTaken ? 'title="Seat already taken"' : ''}>
                     ${seatNumber}
                   </div>`;
          }).join('')}
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" id="confirmReservation">Confirm Reservation</button>
          <button class="modal-close">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let selectedSeat = seatNum && !takenSeats.has(parseInt(seatNum)) ? parseInt(seatNum) : null;
    
    modal.querySelectorAll('.seat.available').forEach(seat => {
      seat.addEventListener('click', function() {
        const seatNumber = parseInt(this.getAttribute('data-seat'));
        if (!takenSeats.has(seatNumber)) {
          modal.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
          this.classList.add('selected');
          selectedSeat = seatNumber;
        }
      });
    });
    
    modal.querySelector('#confirmReservation').addEventListener('click', () => {
      if (selectedSeat) {
        doReserve(tripId, 1, selectedSeat);
      } else {
        alert('Please select an available seat');
      }
    });
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

  } catch (error) {
    console.error('Error getting taken seats:', error);
    alert('Failed to load seat availability');
  }
}

async function doReserve(tripId, seats=1, seatNumber=null){
  if(!currentUser || currentUser.role!=='passenger'){ alert('Login as passenger first'); return; }
  const res = await fetch(API('reserve'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ 
      tripId, 
      passenger: currentUser.username, 
      seats,
      seatNumber 
    })
  });
  const data = await res.json();
  if(!res.ok){ alert(data.error || 'Reservation failed'); return; }
  alert('Reservation successful');
  await fetchTrips();
  if (currentUser?.role === 'passenger') passengerSearch();
  
  // Close any open modals
  document.querySelectorAll('.modal').forEach(modal => {
    if (modal.id !== 'loginModal' && modal.id !== 'registerModal') {
      document.body.removeChild(modal);
    }
  });
}

async function createTrip(event){
  event.preventDefault();
  const form = event.target.closest('form');
  
  // Validate form
  if (!form.checkValidity()) {
      form.reportValidity();
      return;
  }

  // Submit form using traditional form submission
  form.submit();
}

function renderDriverTrips(){
  console.log('Rendering driver trips:', allTrips);
  const s = $('sidebar');
  const list = s.querySelector('#driverTripList');
  if (!list) {
    console.error('Driver trip list element not found');
    return;
  }
  
  const myTrips = allTrips.filter(t => {
    const matches = t.driver_username === currentUser?.username;
    console.log('Trip:', t, 'Matches current user:', matches);
    return matches;
  });

  console.log('Filtered trips for current driver:', myTrips);
  
  list.innerHTML = myTrips.length ? myTrips.map(t => `
    <div class="trip-card">
      <div><strong>${t.origin} → ${t.destination}</strong></div>
      <div class="small">${formatDateTime(t.datetime)} • ${t.seats} seats • ${Number(t.price)} JOD • ${t.car} ${t.plate}</div>
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

// Render driver's reservations
async function renderDriverReservations() {
  if (!currentUser || currentUser.role !== 'driver') return;
  
  const s = $('sidebar');
  const list = s.querySelector('#driverReservationsList');
  if (!list) return;
  
  try {
    const res = await fetch(API('driver_reservations'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ driver: currentUser.username })
    });
    
    const reservations = await res.json();
    
    const sortedReservations = reservations.sort((a, b) => {
      // Sort by date first
      const dateCompare = new Date(a.datetime) - new Date(b.datetime);
      if (dateCompare !== 0) return dateCompare;
      
      // Then by passenger name
      const nameCompare = sortByLocaleString(a, b, 'passenger_name');
      if (nameCompare !== 0) return nameCompare;
      
      // Finally by origin/destination
      const originCompare = sortByLocaleString(a, b, 'origin');
      return originCompare !== 0 ? originCompare : sortByLocaleString(a, b, 'destination');
    });

    list.innerHTML = sortedReservations.length ? sortedReservations.map(r => `
      <div class="reservation-card">
        <div><strong>${r.passenger_name}</strong> reserved ${r.seats} seat(s)</div>
        <div class="small">${r.seat_number ? `Seat: ${r.seat_number} • ` : ''}Trip: ${r.origin} → ${r.destination}</div>
        <div class="small">${formatDateTime(r.datetime)}</div>
        <div class="small" style="margin-top:4px; color:#888;">Reserved on: ${formatDateTime(r.created_at)}</div>
      </div>
    `).join('') : '<p class="small">No reservations yet</p>';
  } catch (error) {
    console.error('Error fetching reservations:', error);
    list.innerHTML = '<p class="small">Error loading reservations</p>';
  }
}

// Add this new function
async function renderPassengerReservations() {
  if (!currentUser || currentUser.role !== 'passenger') return;
  
  const s = $('sidebar');
  const list = s.querySelector('#passengerReservationsList');
  if (!list) return;
  
  try {
    const res = await fetch(API('passenger_reservations'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ passenger: currentUser.username })
    });
    
    if (!res.ok) throw new Error('Failed to fetch reservations');
    const reservations = await res.json();
    
    const sortedReservations = reservations.sort((a, b) => {
      return new Date(a.datetime) - new Date(b.datetime);
    });

    list.innerHTML = sortedReservations.length ? sortedReservations.map(r => `
      <div class="reservation-card">
        <div><strong>${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</strong></div>
        <div class="small">
          Driver: ${escapeHtml(r.driver_name)} • ${escapeHtml(r.car)} ${escapeHtml(r.plate)}<br>
          ${formatDateTime(r.datetime)} • ${Number(r.seats)} seat(s)${r.seat_number ? ` • Seat #${Number(r.seat_number)}` : ''} • ${Number(r.price)} JOD
        </div>
        <div class="small" style="margin-top:4px; color:#888;">Reserved on: ${formatDateTime(r.created_at)}</div>
        <div style="margin-top:8px">
          <button class="btn btn-secondary" data-cancel-res="${Number(r.id)}">Cancel Reservation</button>
        </div>
      </div>
    `).join('') : '<p class="small">No reservations yet</p>';

    // Add event listeners for cancellation buttons
    list.querySelectorAll('[data-cancel-res]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this reservation?')) return;
        
        const id = btn.getAttribute('data-cancel-res');
        const res = await fetch(API('delete_reservation'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id })
        });
        
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to cancel reservation');
          return;
        }
        
        await fetchTrips(); // Refresh trips to update seats
        renderPassengerReservations(); // Refresh reservations list
        passengerSearch(); // Refresh available trips
      });
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    list.innerHTML = '<p class="small">Error loading reservations</p>';
  }
}

// --- Admin ---
async function renderAdmin(){
  const s = $('sidebar');
  
  // Add table operation listener
  $('tableOperation').addEventListener('change', (e) => {
    renderDbOperationForm(e.target.value);
  });
  
  try {
    const usersRes = await fetch(API('users'));
    const users = await usersRes.json();
    
    // Sort users by username
    const sortedUsers = users.sort((a, b) => 
      sortByLocaleString(a, b, 'username')
    );

    const usersEl = s.querySelector('#adminUsers');
    usersEl.innerHTML = sortedUsers.map(u => `
      <div class="trip-card">
        <div>
          <strong>${u.username}</strong>
          <select class="role-select" data-user="${u.username}">
            ${['passenger', 'driver', 'admin'].map(role => 
              `<option value="${role}" ${role === u.role ? 'selected' : ''}>${role}</option>`
            ).join('')}
          </select>
        </div>
        <div style="margin-top:8px">
          <button class="btn btn-secondary" data-user="${u.username}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add role change listeners
    usersEl.querySelectorAll('.role-select').forEach(select => {
      select.addEventListener('change', async () => {
        const username = select.getAttribute('data-user');
        const newRole = select.value;
        
        try {
          const res = await fetch(API('update_user'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, role: newRole })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          alert('User role updated');
        } catch (error) {
          alert(error.message);
          select.value = u.role; // Reset on error
        }
      });
    });

    // trips
    const tripsEl = s.querySelector('#adminTrips');
    // Sort trips by date, then origin/destination
    const sortedTrips = allTrips.sort((a, b) => {
      const dateCompare = new Date(a.datetime) - new Date(b.datetime);
      if (dateCompare !== 0) return dateCompare;
      
      const originCompare = sortByLocaleString(a, b, 'origin');
      return originCompare !== 0 ? originCompare : sortByLocaleString(a, b, 'destination');
    });

    tripsEl.innerHTML = sortedTrips.map(t => `
      <div class="trip-card">
        <div><strong>${t.origin} → ${t.destination}</strong></div>
        <div class="small">${formatDateTime(t.datetime)} • ${t.seats} seats • Driver: ${t.driver_username}</div>
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

    // Add reservations section
    const reservationsEl = s.querySelector('#adminReservations');
    const reservationsRes = await fetch(API('get_all_reservations'));
    const reservations = await reservationsRes.json();

    if (!reservationsRes.ok) throw new Error('Failed to fetch reservations');

    const sortedReservations = reservations.sort((a, b) => {
      const dateCompare = new Date(a.datetime) - new Date(b.datetime);
      if (dateCompare !== 0) return dateCompare;
      
      const passengerCompare = sortByLocaleString(a, b, 'passenger_name');
      if (passengerCompare !== 0) return passengerCompare;
      
      return sortByLocaleString(a, b, 'origin');
    });

    reservationsEl.innerHTML = sortedReservations.length ? sortedReservations.map(r => `
      <div class="reservation-card">
        <div>
          <strong>${r.passenger_name}</strong> → <strong>${r.driver_name}</strong>
        </div>
        <div class="small">
          ${r.origin} → ${r.destination}<br>
          ${formatDateTime(r.datetime)} • ${r.seats} seat(s)${r.seat_number ? ` • Seat #${r.seat_number}` : ''}
        </div>
        <div class="small" style="margin-top:4px; color:#888;">Reserved on: ${formatDateTime(r.created_at)}</div>
        <div style="margin-top:8px">
          <button class="btn btn-secondary" data-del-res="${r.id}">Cancel Reservation</button>
        </div>
      </div>
    `).join('') : '<p class="small">No reservations</p>';

    // Add event listeners for reservation deletion
    reservationsEl.querySelectorAll('[data-del-res]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to cancel this reservation?')) return;
        
        const id = btn.getAttribute('data-del-res');
        const res = await fetch(API('delete_reservation'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id })
        });
        
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to cancel reservation');
          return;
        }
        
        await fetchTrips(); // Refresh trips to update seats
        renderAdmin(); // Refresh admin view
      });
    });

    // Add this helper function for database operations
    function renderDbOperationForm(operation) {
      const form = $('dbOperationForm');
      
      switch(operation) {
        case 'createTable':
          form.innerHTML = `
            <div class="operation-inputs">
              <input type="text" id="tableName" placeholder="Table Name">
              <div id="columnInputs">
                <div class="column-input">
                  <input type="text" placeholder="Column Name" class="colName">
                  <select class="colType">
                    <option value="INT">Integer</option>
                    <option value="VARCHAR(255)">Text</option>
                    <option value="DECIMAL(10,2)">Decimal</option>
                    <option value="DATETIME">Date/Time</option>
                  </select>
                  <button class="btn-secondary removeCol">✕</button>
                </div>
              </div>
              <button class="btn" id="addColumnBtn">Add Column</button>
              <button class="btn" id="createTableBtn">Create Table</button>
            </div>
          `;
          
          // Add event listeners
          $('addColumnBtn').onclick = () => {
            const div = document.createElement('div');
            div.className = 'column-input';
            div.innerHTML = $('columnInputs').children[0].innerHTML;
            $('columnInputs').appendChild(div);
          };
          
          $('createTableBtn').onclick = async () => {
            const tableName = $('tableName').value.trim();
            const columns = [];
            document.querySelectorAll('.column-input').forEach(input => {
              columns.push({
                name: input.querySelector('.colName').value.trim(),
                type: input.querySelector('.colType').value
              });
            });
            
            try {
              const res = await fetch(API('db_operation'), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  operation: 'createTable',
                  tableName,
                  columns
                })
              });
              
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              alert(data.message);
            } catch (error) {
              alert(error.message);
            }
          };
          break;
          
        case 'deleteTable':
          form.innerHTML = `
            <div class="operation-inputs">
              <select id="tableToDelete"></select>
              <button class="btn" id="deleteTableBtn">Delete Table</button>
            </div>
          `;
          
          // Load tables
          fetch(API('db_operation'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ operation: 'showTables' })
          })
          .then(r => r.json())
          .then(data => {
            const select = $('tableToDelete');
            data.tables.forEach(table => {
              const option = document.createElement('option');
              option.value = table;
              option.textContent = table;
              select.appendChild(option);
            });
          });
          
          $('deleteTableBtn').onclick = async () => {
            const tableName = $('tableToDelete').value;
            if (!confirm(`Are you sure you want to delete table ${tableName}?`)) return;
            
            try {
              const res = await fetch(API('db_operation'), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  operation: 'deleteTable',
                  tableName
                })
              });
              
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              alert(data.message);
            } catch (error) {
              alert(error.message);
            }
          };
          break;
          
        case 'showTables':
          fetch(API('db_operation'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ operation: 'showTables' })
          })
          .then(r => r.json())
          .then(data => {
            form.innerHTML = `
              <div class="table-list">
                <h5>Database Tables:</h5>
                <ul>${data.tables.map(t => `<li>${t}</li>`).join('')}</ul>
              </div>
            `;
          });
          break;
          
        default:
          form.innerHTML = '';
      }
    }

    // Update trips section to allow editing
    tripsEl.innerHTML = sortedTrips.map(t => `
      <div class="trip-card">
      <div><strong>${t.origin} → ${t.destination}</strong></div>
      <div class="small">
        ${formatDateTime(t.datetime)} • Driver: ${t.driver_username}<br>
        <input type="number" class="seats-input" data-trip="${t.id}" 
           value="${t.seats}" min="0" style="width:80px"> seats • 
        <input type="number" class="price-input" data-trip="${t.id}" 
           value="${t.price}" min="0" step="0.01" style="width:80px"> JOD
      </div>
      <div style="margin-top:8px">
        <button class="btn btn-primary" data-save="${t.id}" style="margin:2px">Save Changes</button>
        <button class="btn btn-secondary" data-del="${t.id}" style="margin:2px">Delete Trip</button>
      </div>
      </div>
    `).join('');

    // Add save changes listeners
    tripsEl.querySelectorAll('[data-save]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-save');
        const seats = parseInt(tripsEl.querySelector(`.seats-input[data-trip="${id}"]`).value);
        const price = parseFloat(tripsEl.querySelector(`.price-input[data-trip="${id}"]`).value);
        
        try {
          const res = await fetch(API('update_trip'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, seats, price })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          alert('Trip updated');
          await fetchTrips();
          renderAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    console.error('Error in admin rendering:', error);
    s.innerHTML = '<p class="small">Error loading admin data</p>';
  }
}

// --- Add this function near the top after the API constant
async function checkFlashMessages() {
    try {
        const res = await fetch(API('get_flash'));
        const data = await res.json();
        if (data.flash) {
            if (data.flash.error) {
                alert(data.flash.error);
            } else if (data.flash.success) {
                alert(data.flash.success);
            }
        }
    } catch (error) {
        console.error('Error checking flash messages:', error);
    }
}

// --- Boot ---
let csrfToken = '';

async function boot(){
  try {
        await checkFlashMessages();
        const res = await fetch(API('get_csrf_token'));
        const data = await res.json();
        csrfToken = data.token;
        
        updateHeader();
        renderSidebar();
        await fetchTrips();
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}
// Start the application after DOM is fully loaded
document.addEventListener('DOMContentLoaded', boot);

// Add this helper function near the top of script.js after the API constant
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add this helper function near the top of script.js after the API constant
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date).replace(',', '');
}
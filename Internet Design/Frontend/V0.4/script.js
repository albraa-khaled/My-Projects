let map;
let userLocation = null;

navigator.geolocation.getCurrentPosition(position => {
  userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles © Esri, Maxar, Earthstar Geographics, and the GIS community'
    }
  );

  map = L.map('map', {
    center: [userLocation.lat, userLocation.lng],
    zoom: 14,
    layers: [streetLayer]
  });

  L.control.layers({
    "Streets": streetLayer,
    "Satellite": satelliteLayer
  }).addTo(map);

  L.marker([userLocation.lat, userLocation.lng])
    .addTo(map)
    .bindPopup("You are here")
    .openPopup();
});

// ========== Booking Form ==========

document.getElementById("startBooking").addEventListener("click", () => {
  document.getElementById("bookingForm").classList.remove("hidden");
});

function closeForm() {
  document.getElementById("bookingForm").classList.add("hidden");
}

// Toggle manual location input
document.querySelectorAll('input[name="startType"]').forEach(radio => {
  radio.addEventListener("change", () => {
    document.getElementById("customStart").disabled =
      document.querySelector('input[name="startType"]:checked').value !== "custom";
  });
});

document.getElementById("reservationForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const destination = document.getElementById("destination").value;
  const passengers = document.getElementById("passengers").value;
  const startType = document.querySelector('input[name="startType"]:checked').value;
  let startPoint = "";

  if (startType === "current") {
    startPoint = `Lat: ${userLocation.lat}, Lng: ${userLocation.lng}`;
  } else {
    startPoint = document.getElementById("customStart").value;
  }

  alert(`Finding cars from: ${startPoint} to ${destination} for ${passengers} passenger(s)...`);

  closeForm();

  // Load cars
  $.getJSON('cars.json', cars => {
    cars.forEach(car => {
      const marker = L.marker([car.lat, car.lng], {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
          iconSize: [30, 30]
        })
      }).addTo(map);

      marker.bindPopup(`
        <b>Car #${car.id}</b><br>
        Click to confirm booking<br>
        <button onclick="confirmBooking(${car.id})">Confirm</button>
      `);
    });
  });
});

function confirmBooking(carId) {
  alert(`Booking confirmed with Car #${carId}`);
}

// ====== LOGIN LOGIC ======
const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const userPanel = document.getElementById("userPanel");

function showLoginModal() {
  loginModal.classList.remove("hidden");
}

function closeLogin() {
  loginModal.classList.add("hidden");
}

loginBtn.addEventListener("click", showLoginModal);

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === "" || password === "") {
    alert("Please fill in all fields.");
    return;
  }

  // (For demo only – replace with real auth in production)
  if (username === "admin" && password === "1234") {
    localStorage.setItem("loggedInUser", username);
    updateLoginUI();
    closeLogin();
  } else {
    alert("Invalid credentials.");
  }
});

function updateLoginUI() {
  const user = localStorage.getItem("loggedInUser");

  if (user) {
    userPanel.innerHTML = `
      <span style="color:white;">Welcome, ${user}</span>
      <button onclick="logout()">Logout</button>
    `;
  } else {
    userPanel.innerHTML = `<button id="loginBtn">Login</button>`;
    document.getElementById("loginBtn").addEventListener("click", showLoginModal);
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  updateLoginUI();
}

// Initialize login state on page load
updateLoginUI();

// ======= REGISTER LOGIC =======
const registerModal = document.getElementById("registerModal");

function openRegister() {
  closeLogin();
  registerModal.classList.remove("hidden");
}

function closeRegister() {
  registerModal.classList.add("hidden");
}

document.getElementById("registerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;

  if (!username || !password || !role) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || {};

  if (users[username]) {
    alert("Username already exists.");
    return;
  }

  users[username] = { password, role };
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created successfully!");
  closeRegister();
  showLoginModal();
});

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

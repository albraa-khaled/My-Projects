let map;

navigator.geolocation.getCurrentPosition(position => {
  const userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  // Initialize map
  map = L.map('map').setView([userLocation.lat, userLocation.lng], 14);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Add user marker
  L.marker([userLocation.lat, userLocation.lng])
    .addTo(map)
    .bindPopup("You are here")
    .openPopup();

  // Fetch nearby cars and show them
  fetch('/cars')
    .then(res => res.json())
    .then(cars => {
      cars.forEach(car => {
        L.marker([car.lat, car.lng], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
            iconSize: [30, 30]
          })
        })
        .addTo(map)
        .bindPopup(`Car #${car.id}`);
      });
    });

  // Add search bar (Geocoder)
  L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Search for a location..."
  })
  .on('markgeocode', function(e) {
    const center = e.geocode.center;
    map.setView(center, 16);
    L.marker(center).addTo(map)
      .bindPopup(e.geocode.name)
      .openPopup();
  })
  .addTo(map);
});

function reserveSeats() {
  const destination = document.getElementById("destination").value;
  const seats = parseInt(document.getElementById("seats").value);

  fetch('/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, seats })
  })
  .then(res => res.json())
  .then(data => alert(data.message));
}

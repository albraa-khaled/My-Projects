let map;

navigator.geolocation.getCurrentPosition(position => {
  const userLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  map = L.map('map').setView([userLocation.lat, userLocation.lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  L.marker([userLocation.lat, userLocation.lng])
    .addTo(map)
    .bindPopup("You are here")
    .openPopup();

  // Fetch nearby cars (mock data from backend)
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

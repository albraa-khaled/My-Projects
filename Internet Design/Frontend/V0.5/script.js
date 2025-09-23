// Initialize the map
const map = L.map('map').setView([31.9539, 35.9106], 13); // Amman, Jordan coordinates

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Add a marker for Amman
L.marker([31.9539, 35.9106]).addTo(map)
    .bindPopup('Amman, Jordan')
    .openPopup();

// Mock data for available rides
const mockRides = [
    {
        id: 1,
        driver: "Mohammad Ali",
        from: "Abdali",
        to: "Queen Alia Airport",
        departure: "2023-08-10T08:30:00",
        seats: 4,
        price: 15,
        car: "Toyota Camry",
        plate: "AMM 1234"
    },
    {
        id: 2,
        driver: "Sara Ahmad",
        from: "Shmeisani",
        to: "Zarqa",
        departure: "2023-08-10T09:15:00",
        seats: 3,
        price: 8,
        car: "Hyundai Elantra",
        plate: "AMM 5678"
    },
    {
        id: 3,
        driver: "Khaled Hassan",
        from: "Jabal Al-Weibdeh",
        to: "Irbid",
        departure: "2023-08-10T10:00:00",
        seats: 2,
        price: 12,
        car: "Kia Sportage",
        plate: "AMM 9012"
    }
];

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const closeButtons = document.querySelectorAll('.close');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const registerSubmitBtn = document.getElementById('registerSubmitBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const searchBtn = document.getElementById('searchBtn');
const ridesList = document.getElementById('ridesList');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');

// Event Listeners
loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
registerBtn.addEventListener('click', () => registerModal.style.display = 'flex');

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
    });
});

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    registerModal.style.display = 'flex';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.style.display = 'none';
    loginModal.style.display = 'flex';
});

currentLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            // Reverse geocoding would be implemented here in a real app
            document.getElementById('from').value = "Current Location";
            map.setView([latitude, longitude], 15);
            L.marker([latitude, longitude]).addTo(map)
                .bindPopup('Your Location')
                .openPopup();
        }, () => {
            alert('Unable to retrieve your location');
        });
    } else {
        alert('Geolocation is not supported by your browser');
    }
});

searchBtn.addEventListener('click', () => {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const passengers = document.getElementById('passengers').value;
    
    if (!from || !to) {
        alert('Please enter both starting location and destination');
        return;
    }
    
    // In a real app, we would search for matching rides
    // For now, we'll just show mock data
    displayAvailableRides();
});

// User Authentication
loginSubmitBtn.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    // Simulate login
    localStorage.setItem('currentUser', JSON.stringify({
        name: "John Doe",
        email,
        role: "passenger"
    }));
    
    loginModal.style.display = 'none';
    updateAuthUI();
});

registerSubmitBtn.addEventListener('click', () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    if (!name || !email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    // Save user to localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    users.push({ name, email, password, role });
    localStorage.setItem('users', JSON.stringify(users));
    
    // Set as current user
    localStorage.setItem('currentUser', JSON.stringify({ name, email, role }));
    
    registerModal.style.display = 'none';
    updateAuthUI();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    updateAuthUI();
});

// Functions
function updateAuthUI() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        // Extract initials for avatar
        const initials = currentUser.name.split(' ').map(n => n[0]).join('');
        userAvatar.textContent = initials;
        userName.textContent = currentUser.name;
        userInfo.style.display = 'flex';
        loginBtn.parentElement.style.display = 'none';
    } else {
        userInfo.style.display = 'none';
        loginBtn.parentElement.style.display = 'flex';
    }
}

function displayAvailableRides() {
    ridesList.innerHTML = '';
    
    mockRides.forEach(ride => {
        const rideElement = document.createElement('div');
        rideElement.className = 'ride-card fade-in';
        
        // Create seat indicators
        const seatElements = [];
        for (let i = 0; i < 4; i++) {
            const seat = document.createElement('div');
            seat.className = `seat ${i < ride.seats ? 'available' : ''}`;
            seat.textContent = i+1;
            seatElements.push(seat.outerHTML);
        }
        
        rideElement.innerHTML = `
            <div class="ride-header">
                <div class="driver-info">
                    <div class="driver-avatar">${ride.driver.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                        <strong>${ride.driver}</strong>
                        <div>${ride.car} • ${ride.plate}</div>
                    </div>
                </div>
                <div class="price">${ride.price} JOD</div>
            </div>
            <div class="ride-details">
                <div class="dot"></div>
                <div>${ride.from}</div>
                <div class="dot" style="background-color: ${ride.seats > 0 ? '#e74c3c' : '#3498db'};"></div>
                <div>${ride.to}</div>
            </div>
            <div class="ride-footer">
                <div><i class="far fa-clock"></i> ${new Date(ride.departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div class="seats">
                    ${seatElements.join('')}
                </div>
            </div>
            <button class="btn btn-primary btn-block reserve-btn" data-id="${ride.id}" style="margin-top: 1rem;">
                <i class="fas fa-chair"></i> Reserve Seat
            </button>
        `;
        
        ridesList.appendChild(rideElement);
    });
    
    // Add event listeners to reservation buttons
    document.querySelectorAll('.reserve-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const rideId = this.getAttribute('data-id');
            const ride = mockRides.find(r => r.id === parseInt(rideId));
            
            if (ride) {
                alert(`Reservation confirmed! You've booked a seat in ${ride.driver}'s ${ride.car} from ${ride.from} to ${ride.to}. Price: ${ride.price} JOD.`);
            }
        });
    });
}

// Initialize the app
function initApp() {
    updateAuthUI();
    displayAvailableRides();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
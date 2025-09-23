document.addEventListener("DOMContentLoaded", function () {
    const startBookingBtn = document.getElementById("startBookingBtn");
    const bookingForm = document.getElementById("bookingForm");
    const loginForm = document.getElementById("loginForm");

    // Start booking
    startBookingBtn.addEventListener("click", () => {
        bookingForm.style.display = "block";
    });

    // Login functionality
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const role = document.getElementById("role").value;

        alert(`Logged in as ${username} (${role})`);

        // Hide auth section after login
        document.getElementById("authSection").style.display = "none";

        // Show role-specific content
        document.getElementById("passengerContent").style.display = "none";
        document.getElementById("driverContent").style.display = "none";
        document.getElementById("adminContent").style.display = "none";

        if (role === "passenger") {
            document.getElementById("passengerContent").style.display = "block";
        } else if (role === "driver") {
            document.getElementById("driverContent").style.display = "block";
        } else if (role === "admin") {
            document.getElementById("adminContent").style.display = "block";
        }
    });
});

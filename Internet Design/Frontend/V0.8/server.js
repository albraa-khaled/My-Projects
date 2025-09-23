const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

const USERS = path.join(__dirname, "users.json");
const TRIPS = path.join(__dirname, "trips.json");
const RES = path.join(__dirname, "reservations.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html, css, js

async function readJSON(p) {
  const data = await fs.readFile(p, "utf-8");
  return JSON.parse(data || "[]");
}
async function writeJSON(p, obj) {
  const data = JSON.stringify(obj, null, 2);
  await fs.writeFile(p, data, "utf-8");
}

// --- Users ---
app.get("/api/users", async (req, res) => {
  try {
    const users = await readJSON(USERS);
    res.json(users.map(u => ({ username: u.username, role: u.role })));
  } catch (e) { res.status(500).json({ error: "Failed to read users" }); }
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });
    const users = await readJSON(USERS);
    if (users.some(u => u.username === username)) {
      return res.status(409).json({ error: "User already exists" });
    }
    users.push({ username, password, role });
    await writeJSON(USERS, users);
    res.json({ message: "User registered", user: { username, role } });
  } catch (e) { res.status(500).json({ error: "Failed to register" }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readJSON(USERS);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login ok", user: { username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: "Failed to login" }); }
});

app.delete("/api/users/:username", async (req, res) => {
  try {
    const uname = req.params.username;
    let users = await readJSON(USERS);
    const before = users.length;
    users = users.filter(u => u.username !== uname);
    if (users.length === before) return res.status(404).json({ error: "User not found" });
    await writeJSON(USERS, users);
    res.json({ message: "User deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete user" }); }
});

// --- Trips ---
app.get("/api/trips", async (req, res) => {
  try {
    const trips = await readJSON(TRIPS);
    res.json(trips);
  } catch (e) { res.status(500).json({ error: "Failed to read trips" }); }
});

app.post("/api/trips", async (req, res) => {
  try {
    const { driver, from, to, datetime, seats, price, car, plate } = req.body;
    if (!driver || !from || !to || !datetime) return res.status(400).json({ error: "Missing fields" });
    const trips = await readJSON(TRIPS);
    const id = "t_" + Math.random().toString(36).slice(2, 9);
    const trip = { id, driver, from, to, datetime, seats: Number(seats)||1, price: Number(price)||0, car: car||"Car", plate: plate||"---" };
    trips.push(trip);
    await writeJSON(TRIPS, trips);
    res.json({ message: "Trip created", trip });
  } catch (e) { res.status(500).json({ error: "Failed to create trip" }); }
});

app.delete("/api/trips/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let trips = await readJSON(TRIPS);
    const before = trips.length;
    trips = trips.filter(t => t.id !== id);
    if (trips.length === before) return res.status(404).json({ error: "Trip not found" });
    await writeJSON(TRIPS, trips);
    res.json({ message: "Trip deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete trip" }); }
});

// --- Reservations ---
app.get("/api/reservations", async (req, res) => {
  try {
    const r = await readJSON(RES);
    res.json(r);
  } catch (e) { res.status(500).json({ error: "Failed to read reservations" }); }
});

app.post("/api/reserve", async (req, res) => {
  try {
    const { tripId, passenger, seats } = req.body;
    if (!tripId || !passenger) return res.status(400).json({ error: "Missing fields" });

    const nSeats = Number(seats) || 1;
    const trips = await readJSON(TRIPS);
    const idx = trips.findIndex(t => t.id === tripId);
    if (idx === -1) return res.status(404).json({ error: "Trip not found" });
    if ((trips[idx].seats || 0) < nSeats) return res.status(409).json({ error: "Not enough seats" });

    trips[idx].seats -= nSeats;
    await writeJSON(TRIPS, trips);

    const reservations = await readJSON(RES);
    const resv = { id: "r_" + Math.random().toString(36).slice(2, 9), tripId, passenger, seats: nSeats, time: new Date().toISOString() };
    reservations.push(resv);
    await writeJSON(RES, reservations);

    res.json({ message: "Reserved", reservation: resv, trip: trips[idx] });
  } catch (e) { res.status(500).json({ error: "Failed to reserve" }); }
});

app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT}/index.html`);
});

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

let cars = [
  { id: 1, lat: 31.951569, lng: 35.923963 },
  { id: 2, lat: 31.952500, lng: 35.921000 },
  { id: 3, lat: 31.950000, lng: 35.925500 }
];

app.get('/cars', (req, res) => {
  res.json(cars);
});

app.post('/reserve', (req, res) => {
  const { destination, seats } = req.body;
  console.log(`Reservation: ${seats} seat(s) to ${destination}`);
  res.json({ message: 'Reservation successful!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

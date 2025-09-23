-- Create database (do this once)
CREATE DATABASE IF NOT EXISTS carpoolv0_2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carpoolv0_2;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('passenger','driver','admin') NOT NULL DEFAULT 'passenger',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  datetime DATETIME NOT NULL,
  seats INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  car VARCHAR(120) DEFAULT 'Car',
  plate VARCHAR(40) DEFAULT '---',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_driver (driver_id),
  CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  passenger_id INT NOT NULL,
  seats INT NOT NULL DEFAULT 1,
  seat_number INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trip (trip_id),
  INDEX idx_passenger (passenger_id),
  CONSTRAINT fk_res_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_passenger FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed (optional)
INSERT INTO users (username, password_hash, role) VALUES
('admin',  '$2y$10$/aO8y7TgV4zvQ4Qn3JrGceT5r1c3k1.5b7m0mPp3TQf5Eo3N5N8Yy', 'admin'),  -- password: admin
('driver1','$2y$10$yYk.G1wD2oS8B4J9qUX8/OBdOSt9J0oW45G8Q8dny7jN1k2m3EJ4a', 'driver'), -- password: pass
('user1',  '$2y$10$yYk.G1wD2oS8B4J9qUX8/OBdOSt9J0oW45G8Q8dny7jN1k2m3EJ4a', 'passenger'); -- password: pass

-- Sample trips (owned by driver1)
INSERT INTO trips (driver_id, origin, destination, datetime, seats, price, car, plate) VALUES
((SELECT id FROM users WHERE username='driver1'), 'Abdali', 'Queen Alia Airport', '2025-08-20 08:30:00', 4, 15.00, 'Toyota Camry', 'AMM123'),
((SELECT id FROM users WHERE username='driver1'), 'Shmeisani', 'Zarqa', '2025-08-20 09:00:00',     3,  8.00, 'Hyundai Elantra', 'AMM567');
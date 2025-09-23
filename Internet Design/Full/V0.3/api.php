<?php
// api.php
session_start();

require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *'); // OK for local dev
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$action = $_GET['action'] ?? $_POST['action'] ?? '';

function validateUsername($username) {
    return preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username);
}

function validateRole($role) {
    return in_array($role, ['passenger', 'driver', 'admin'], true);
}

function validateTableName($tableName) {
    return preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/', $tableName);
}

function validateColumnName($columnName) {
    return preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/', $columnName);
}

function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken($token) {
    return isset($_SESSION['csrf_token']) && 
           hash_equals($_SESSION['csrf_token'], $token);
}

function redirect($url, $flashMessage = null) {
    if ($flashMessage) {
        $_SESSION['flash_message'] = $flashMessage;
    }
    header("Location: $url");
    exit;
}

try {
  switch ($action) {

    // -------- Auth --------
    case 'register': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $username = trim($input['username'] ?? '');
      $password = $input['password'] ?? '';
      $role     = $input['role'] ?? 'passenger';

      if (!validateUsername($username)) {
        json_response(['error' => 'Invalid username format'], 400);
      }
      if (strlen($password) < 6) {
        json_response(['error' => 'Password too short'], 400);
      }
      if (!validateRole($role)) {
        json_response(['error' => 'Invalid role'], 400);
      }

      $pdo = pdo();
      $pdo->beginTransaction();
      try {
          $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
          $stmt->execute([$username]);
          if ($stmt->fetch()) {
              $pdo->rollBack();
              json_response(['error'=>'User exists'], 409);
          }

          $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
          $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)');
          $stmt->execute([$username, $hash, $role]);
          
          $pdo->commit();
          json_response(['message'=>'User registered','user'=>['username'=>$username,'role'=>$role]]);
      } catch (Exception $e) {
          $pdo->rollBack();
          json_response(['error' => 'Registration failed'], 500);
      }
    }

    case 'login': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $username = trim($input['username'] ?? '');
      $password = $input['password'] ?? '';

      if (!$username || !$password) json_response(['error'=>'Missing credentials'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('SELECT id, password_hash, role FROM users WHERE username = ?');
      $stmt->execute([$username]);
      $row = $stmt->fetch();
      if (!$row || !password_verify($password, $row['password_hash'])) {
        json_response(['error'=>'Invalid credentials'], 401);
      }
      json_response(['message'=>'Login ok','user'=>['id'=>$row['id'],'username'=>$username,'role'=>$row['role']]]);
    }

    case 'users': { // admin listing (no auth layer; demo only)
      $pdo = pdo();
      $rows = $pdo->query('SELECT id, username, role, created_at FROM users ORDER BY id DESC')->fetchAll();
      json_response($rows);
    }

    case 'delete_user': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $username = trim($input['username'] ?? '');
      if (!$username) json_response(['error'=>'Missing username'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('DELETE FROM users WHERE username=?');
      $stmt->execute([$username]);
      if ($stmt->rowCount() === 0) json_response(['error'=>'User not found'], 404);
      json_response(['message'=>'User deleted']);
    }

    // -------- Trips --------
    case 'get_trips': {
      $pdo = pdo();
      $rows = $pdo->query('
        SELECT t.*, u.username AS driver_username
        FROM trips t
        JOIN users u ON t.driver_id = u.id
        ORDER BY datetime ASC
      ')->fetchAll();
      json_response($rows);
    }

    case 'create_trip': {
      if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['error' => 'Method not allowed'], 405);
      }

      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $driverUsername = trim($input['driver'] ?? '');
      $origin = trim($input['from'] ?? $input['origin'] ?? '');
      $destination = trim($input['to'] ?? $input['destination'] ?? '');
      $datetime = trim($input['datetime'] ?? '');
      $seats = (int)($input['seats'] ?? 1);
      $price = (float)($input['price'] ?? 0);
      $car = trim($input['car'] ?? 'Car');
      $plate = trim($input['plate'] ?? '---');

      if (!$driverUsername || !$origin || !$destination || !$datetime) {
        json_response(['error'=>'Missing fields'], 400);
      }

      $pdo = pdo();
      $stmt = $pdo->prepare('SELECT id FROM users WHERE username=? AND role="driver"');
      $stmt->execute([$driverUsername]);
      $driver = $stmt->fetch();
      if (!$driver) json_response(['error'=>'Driver not found or not a driver'], 404);

      $stmt = $pdo->prepare('
        INSERT INTO trips (driver_id, origin, destination, datetime, seats, price, car, plate)
        VALUES (?,?,?,?,?,?,?,?)
      ');
      $stmt->execute([$driver['id'], $origin, $destination, $datetime, $seats, $price, $car, $plate]);

      if (isset($input['redirect'])) {
        redirect('index.html#driver', ['success' => 'Trip created successfully']);
      } else {
        json_response(['message' => 'Trip created']);
      }
    }

    case 'delete_trip': {
      if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['error' => 'Method not allowed'], 405);
      }

      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $tripId = (int)($input['id'] ?? 0);
      if (!$tripId) json_response(['error'=>'Missing trip id'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('DELETE FROM trips WHERE id=?');
      $stmt->execute([$tripId]);
      if ($stmt->rowCount() === 0) json_response(['error'=>'Trip not found'], 404);
      json_response(['message'=>'Trip deleted']);
    }

    // -------- Reservations --------
    case 'reserve': {
      if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['error' => 'Method not allowed'], 405);
      }

      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $tripId = (int)($input['tripId'] ?? 0);
      $passengerUsername = trim($input['passenger'] ?? '');
      $seats = (int)($input['seats'] ?? 1);
      $seatNumber = (int)($input['seatNumber'] ?? 0);

      if (!$tripId || !$passengerUsername) {
        json_response(['error' => 'Missing fields'], 400);
      }

      $pdo = pdo();
      $pdo->beginTransaction();

      try {
          // Get passenger id
          $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? AND role = "passenger"');
          $stmt->execute([$passengerUsername]);
          $passenger = $stmt->fetch();
          
          if (!$passenger) {
              $pdo->rollBack();
              json_response(['error' => 'Passenger not found or not a passenger'], 404);
          }

          // Check if seat is already taken
          if ($seatNumber > 0) {
              $stmt = $pdo->prepare('
                  SELECT COUNT(*) as count 
                  FROM reservations 
                  WHERE trip_id = ? AND seat_number = ?
              ');
              $stmt->execute([$tripId, $seatNumber]);
              $seatTaken = $stmt->fetch()['count'] > 0;
              
              if ($seatTaken) {
                  $pdo->rollBack();
                  json_response(['error' => 'Seat already taken'], 409);
              }
          }

          // Get and lock trip for update
          $stmt = $pdo->prepare('
              SELECT seats, price 
              FROM trips 
              WHERE id = ? 
              FOR UPDATE
          ');
          $stmt->execute([$tripId]);
          $trip = $stmt->fetch();

          if (!$trip) {
              $pdo->rollBack();
              json_response(['error' => 'Trip not found'], 404);
          }

          if ((int)$trip['seats'] < $seats) {
              $pdo->rollBack();
              json_response(['error' => 'Not enough seats available'], 409);
          }

          // Update trip seats
          $stmt = $pdo->prepare('
              UPDATE trips 
              SET seats = seats - ? 
              WHERE id = ?
          ');
          $stmt->execute([$seats, $tripId]);

          // Create reservation
          $stmt = $pdo->prepare('
              INSERT INTO reservations 
              (trip_id, passenger_id, seats, seat_number, created_at) 
              VALUES (?, ?, ?, ?, NOW())
          ');
          $stmt->execute([
              $tripId,
              $passenger['id'],
              $seats,
              $seatNumber ?: null
          ]);

          // Commit transaction
          $pdo->commit();

          if (isset($input['redirect'])) {
              redirect('index.html#passenger', ['success' => 'Reservation successful']);
          } else {
              json_response(['message' => 'Reserved successfully']);
          }

      } catch (Exception $e) {
          $pdo->rollBack();
          json_response([
              'error' => 'Failed to create reservation',
              'detail' => $e->getMessage()
          ], 500);
      }
    }

    case 'reservations': {
      $pdo = pdo();
      $rows = $pdo->query('
        SELECT r.*, u.username AS passenger, t.origin, t.destination, t.datetime
        FROM reservations r
        JOIN users u ON r.passenger_id = u.id
        JOIN trips t ON r.trip_id = t.id
        ORDER BY r.id DESC
      ')->fetchAll();
      json_response($rows);
    }

    case 'driver_reservations': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $driverUsername = trim($input['driver'] ?? '');
      if (!$driverUsername) json_response(['error'=>'Missing driver username'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('
        SELECT r.*, u.username AS passenger_name, t.origin, t.destination, t.datetime
        FROM reservations r
        JOIN users u ON r.passenger_id = u.id
        JOIN trips t ON r.trip_id = t.id
        JOIN users d ON t.driver_id = d.id
        WHERE d.username = ?
        ORDER BY r.created_at DESC
      ');
      $stmt->execute([$driverUsername]);
      $reservations = $stmt->fetchAll();
      
      json_response($reservations);
    }

    case 'get_all_reservations': {
      $pdo = pdo();
      $stmt = $pdo->query('
        SELECT r.*, 
               u.username AS passenger_name,
               t.origin, t.destination, t.datetime,
               d.username AS driver_name,
               r.created_at
        FROM reservations r
        JOIN users u ON r.passenger_id = u.id
        JOIN trips t ON r.trip_id = t.id
        JOIN users d ON t.driver_id = d.id
        ORDER BY t.datetime DESC
      ');
      json_response($stmt->fetchAll());
    }

    case 'delete_reservation': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = (int)($input['id'] ?? 0);
      if (!$id) json_response(['error' => 'Missing reservation id'], 400);

      $pdo = pdo();
      $pdo->beginTransaction();
      try {
        // Get reservation details first
        $stmt = $pdo->prepare('SELECT trip_id, seats FROM reservations WHERE id = ?');
        $stmt->execute([$id]);
        $reservation = $stmt->fetch();
        
        if (!$reservation) {
          $pdo->rollBack();
          json_response(['error' => 'Reservation not found'], 404);
        }

        // Update trip seats (add back the reserved seats)
        $stmt = $pdo->prepare('UPDATE trips SET seats = seats + ? WHERE id = ?');
        $stmt->execute([$reservation['seats'], $reservation['trip_id']]);

        // Delete the reservation
        $stmt = $pdo->prepare('DELETE FROM reservations WHERE id = ?');
        $stmt->execute([$id]);

        $pdo->commit();
        json_response(['message' => 'Reservation deleted']);
      } catch (Exception $e) {
        $pdo->rollBack();
        json_response(['error' => 'Failed to delete reservation'], 500);
      }
    }

    case 'passenger_reservations': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $passengerUsername = trim($input['passenger'] ?? '');
      if (!$passengerUsername) json_response(['error'=>'Missing passenger username'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('
        SELECT r.*, 
               d.username AS driver_name,
               t.origin, t.destination, t.datetime,
               t.car, t.plate, t.price,
               r.created_at
        FROM reservations r
        JOIN trips t ON r.trip_id = t.id
        JOIN users d ON t.driver_id = d.id
        JOIN users p ON r.passenger_id = p.id
        WHERE p.username = ?
        ORDER BY t.datetime DESC
      ');
      $stmt->execute([$passengerUsername]);
      json_response($stmt->fetchAll());
    }

    // -------- New Case --------
    case 'get_taken_seats': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $tripId = (int)($input['tripId'] ?? 0);
      if (!$tripId) json_response(['error' => 'Missing trip id'], 400);

      $pdo = pdo();
      $stmt = $pdo->prepare('
        SELECT seat_number 
        FROM reservations 
        WHERE trip_id = ? AND seat_number IS NOT NULL
      ');
      $stmt->execute([$tripId]);
      $takenSeats = array_column($stmt->fetchAll(), 'seat_number');
      json_response(['taken_seats' => $takenSeats]);
    }

    // -------- DB Operations --------
    case 'db_operation': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $operation = $input['operation'] ?? '';
      
      if (!isset($_SESSION['currentUser']) || $_SESSION['currentUser']['role'] !== 'admin') {
        json_response(['error' => 'Unauthorized'], 403);
      }
      
      $pdo = pdo();
      
      switch($operation) {
        case 'createTable':
            $tableName = $input['tableName'] ?? '';
            $columns = $input['columns'] ?? [];
            
            if (!validateTableName($tableName)) {
                json_response(['error' => 'Invalid table name'], 400);
            }
            if (empty($columns)) {
                json_response(['error' => 'No columns specified'], 400);
            }
            
            $columnDefs = [];
            foreach ($columns as $col) {
                if (!validateColumnName($col['name'])) {
                    json_response(['error' => 'Invalid column name'], 400);
                }
                // Whitelist allowed column types
                $allowedTypes = ['INT', 'VARCHAR(255)', 'DECIMAL(10,2)', 'DATETIME'];
                if (!in_array($col['type'], $allowedTypes, true)) {
                    json_response(['error' => 'Invalid column type'], 400);
                }
                $columnDefs[] = "`{$col['name']}` {$col['type']}";
            }
            
            try {
                $sql = "CREATE TABLE IF NOT EXISTS `$tableName` (" . 
                       implode(', ', $columnDefs) . 
                       ", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)";
                $pdo->exec($sql);
                json_response(['message' => "Table $tableName created"]);
            } catch (Exception $e) {
                json_response(['error' => 'Failed to create table'], 500);
            }
            break;
            
        case 'deleteTable':
            $tableName = $input['tableName'] ?? '';
            if (!validateTableName($tableName)) {
                json_response(['error' => 'Invalid table name'], 400);
            }
            
            try {
                $stmt = $pdo->prepare('DROP TABLE IF EXISTS `' . str_replace('`', '', $tableName) . '`');
                $stmt->execute();
                json_response(['message' => "Table $tableName deleted"]);
            } catch (Exception $e) {
                json_response(['error' => 'Failed to delete table'], 500);
            }
            break;
            
        default:
          json_response(['error' => 'Invalid operation'], 400);
      }
    }

    case 'update_user': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $username = trim($input['username'] ?? '');
      $newRole = trim($input['role'] ?? '');
      
      if (!$username || !$newRole) {
        json_response(['error' => 'Missing fields'], 400);
      }
      
      $pdo = pdo();
      $stmt = $pdo->prepare('UPDATE users SET role = ? WHERE username = ?');
      $stmt->execute([$newRole, $username]);
      
      if ($stmt->rowCount() === 0) {
        json_response(['error' => 'User not found'], 404);
      }
      
      json_response(['message' => 'User updated']);
    }

    case 'update_trip': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $id = (int)($input['id'] ?? 0);
      $seats = (int)($input['seats'] ?? 0);
      $price = (float)($input['price'] ?? 0);
      
      if (!$id) json_response(['error' => 'Missing trip id'], 400);
      
      $pdo = pdo();
      $stmt = $pdo->prepare('UPDATE trips SET seats = ?, price = ? WHERE id = ?');
      $stmt->execute([$seats, $price, $id]);
      
      if ($stmt->rowCount() === 0) {
        json_response(['error' => 'Trip not found'], 404);
      }
      
      json_response(['message' => 'Trip updated']);
    }

    // Add flash message handling
    case 'get_flash': {
      $flash = $_SESSION['flash_message'] ?? null;
      unset($_SESSION['flash_message']);
      json_response(['flash' => $flash]);
    }

    default:
      json_response(['error'=>'Unknown action'], 400);
  }
} catch (Throwable $e) {
  json_response(['error'=>'Server error','detail'=>$e->getMessage()], 500);
}

// Add to all POST endpoints
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $headers = getallheaders();
    $token = $headers['X-CSRF-Token'] ?? '';
    if (!verifyCsrfToken($token)) {
        json_response(['error' => 'Invalid CSRF token'], 403);
    }
}
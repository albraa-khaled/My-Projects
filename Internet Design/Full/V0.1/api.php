<?php
// api.php
require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *'); // OK for local dev
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
  switch ($action) {

    // -------- Auth --------
    case 'register': {
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $username = trim($input['username'] ?? '');
      $password = $input['password'] ?? '';
      $role     = $input['role'] ?? 'passenger';

      if (!$username || !$password || !in_array($role, ['passenger','driver','admin'], true)) {
        json_response(['error' => 'Missing/invalid fields'], 400);
      }

      $pdo = pdo();
      // Check exists
      $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
      $stmt->execute([$username]);
      if ($stmt->fetch()) json_response(['error'=>'User exists'], 409);

      $hash = password_hash($password, PASSWORD_BCRYPT);
      $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)');
      $stmt->execute([$username, $hash, $role]);

      json_response(['message'=>'User registered','user'=>['username'=>$username,'role'=>$role]]);
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

      $id = pdo()->lastInsertId();
      json_response(['message'=>'Trip created','trip'=>[
        'id'=>$id,'driver'=>$driverUsername,'from'=>$origin,'to'=>$destination,
        'datetime'=>$datetime,'seats'=>$seats,'price'=>$price,'car'=>$car,'plate'=>$plate
      ]]);
    }

    case 'delete_trip': {
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
      $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
      $tripId = (int)($input['tripId'] ?? 0);
      $passengerUsername = trim($input['passenger'] ?? '');
      $seats = (int)($input['seats'] ?? 1);
      if (!$tripId || !$passengerUsername) json_response(['error'=>'Missing fields'], 400);

      $pdo = pdo();
      // passenger id
      $stmt = $pdo->prepare('SELECT id FROM users WHERE username=? AND role="passenger"');
      $stmt->execute([$passengerUsername]);
      $passenger = $stmt->fetch();
      if (!$passenger) json_response(['error'=>'Passenger not found or not a passenger'], 404);

      // get trip
      $pdo->beginTransaction();
      $stmt = $pdo->prepare('SELECT seats FROM trips WHERE id=? FOR UPDATE');
      $stmt->execute([$tripId]);
      $trip = $stmt->fetch();
      if (!$trip) { $pdo->rollBack(); json_response(['error'=>'Trip not found'], 404); }
      if ((int)$trip['seats'] < $seats) { $pdo->rollBack(); json_response(['error'=>'Not enough seats'], 409); }

      // reduce seats
      $stmt = $pdo->prepare('UPDATE trips SET seats = seats - ? WHERE id=?');
      $stmt->execute([$seats, $tripId]);

      // add reservation
      $stmt = $pdo->prepare('INSERT INTO reservations (trip_id, passenger_id, seats) VALUES (?,?,?)');
      $stmt->execute([$tripId, $passenger['id'], $seats]);

      $pdo->commit();
      json_response(['message'=>'Reserved']);
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

    default:
      json_response(['error'=>'Unknown action'], 400);
  }
} catch (Throwable $e) {
  json_response(['error'=>'Server error','detail'=>$e->getMessage()], 500);
}

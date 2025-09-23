<?php
// db.php
// Adjust credentials to your MAMP setup (default MAMP: user=root, pass=root, port=8889)
const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';        // MAMP MySQL default port
const DB_NAME = 'carpool';
const DB_USER = 'root';        // MAMP default
const DB_PASS = 'root';        // MAMP default

function pdo(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host='.DB_HOST.';port='.DB_PORT.';dbname='.DB_NAME.';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
  }
  return $pdo;
}

function json_response($data, int $status = 200) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

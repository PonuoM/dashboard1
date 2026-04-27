<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
include 'db.php';

$result = $conn->query("SELECT role, COUNT(*) as cnt FROM users GROUP BY role ORDER BY cnt DESC");
$roles = [];
while ($row = $result->fetch_assoc()) {
    $roles[] = $row;
}
echo json_encode(['roles' => $roles], JSON_UNESCAPED_UNICODE);
$conn->close();
?>

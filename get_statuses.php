<?php
require_once __DIR__ . '/public/api/db.php';
$result = $conn->query("SELECT order_status, COUNT(*) as c FROM orders GROUP BY order_status");
$data = [];
while($row = $result->fetch_assoc()) {
    $data[] = $row;
}
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>

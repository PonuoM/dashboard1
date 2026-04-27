<?php
require_once 'c:/AppServ/www/Dashboard/public/api/db.php';

$result = $conn->query("SELECT DISTINCT payment_status, COUNT(*) as cnt FROM orders GROUP BY payment_status ORDER BY cnt DESC LIMIT 20");
echo "=== payment_status values ===\n";
while ($row = $result->fetch_assoc()) {
    echo "'{$row['payment_status']}' => {$row['cnt']}\n";
}

$conn->close();

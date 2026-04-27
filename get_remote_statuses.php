<?php
$conn = new mysqli('202.183.192.218', 'primacom_bloguser', 'pJnL53Wkhju2LaGPytw8', 'primacom_mini_erp');
$conn->set_charset("utf8mb4");

$result = $conn->query("SELECT order_status, COUNT(*) as c FROM orders GROUP BY order_status");
while ($row = $result->fetch_assoc()) {
    echo "[" . $row['order_status'] . "] - " . $row['c'] . "\n";
}
$conn->close();
?>

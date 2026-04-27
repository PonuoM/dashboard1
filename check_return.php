<?php
$conn = new mysqli('202.183.192.218', 'primacom_bloguser', 'pJnL53Wkhju2LaGPytw8', 'primacom_mini_erp');
$conn->set_charset("utf8mb4");

$res = $conn->query("SELECT order_id, COUNT(*) as c FROM order_boxes GROUP BY order_id HAVING c > 1 LIMIT 5");
while ($row = $res->fetch_assoc()) {
    print_r($row);
}
$conn->close();
?>

<?php
include 'public/api/config.prod.php';
$conn = new mysqli($host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) { die("Connection failed"); }

$res = $conn->query("SELECT COUNT(*) as c FROM order_items WHERE creator_id IS NOT NULL AND creator_id != 0");
$row = $res->fetch_assoc();
echo "order_items with creator_id: " . $row['c'] . "\n";

$res2 = $conn->query("SELECT COUNT(DISTINCT o.id) as c FROM orders o JOIN order_items oi ON o.id = oi.parent_order_id WHERE oi.creator_id IS NOT NULL AND oi.creator_id != o.creator_id");
$row2 = $res2->fetch_assoc();
echo "orders with items having a different creator than the order: " . $row2['c'] . "\n";

$conn->close();
?>

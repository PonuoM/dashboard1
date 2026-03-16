<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include 'public/api/db.php';

// Get a sample order that is returned or cancelled
$sample = $conn->query("
    SELECT o.id, o.order_status 
    FROM orders o 
    WHERE o.order_status IN ('Returned','Cancelled') 
    LIMIT 3
");

echo "=== Sample orders ===\n";
while ($row = $sample->fetch_assoc()) {
    echo "ID: [" . $row['id'] . "] | Type: " . gettype($row['id']) . " | Status: " . $row['order_status'] . "\n";
}

// Get column info for order_items
echo "\n=== order_items columns ===\n";
$cols = $conn->query("SHOW COLUMNS FROM order_items");
while ($c = $cols->fetch_assoc()) {
    echo $c['Field'] . " (" . $c['Type'] . ")\n";
}

// Try a sample query
$test_order = $conn->query("SELECT id FROM orders WHERE order_status = 'Returned' LIMIT 1");
if ($test_order && $row = $test_order->fetch_assoc()) {
    $oid = $row['id'];
    echo "\n=== Testing order_items for order: [$oid] ===\n";
    
    $stmt = $conn->prepare("SELECT oi.*, p.name AS product_name, p.sku FROM order_items oi INNER JOIN products p ON oi.product_id = p.id WHERE oi.parent_order_id = ?");
    $stmt->bind_param("s", $oid);
    $stmt->execute();
    $result = $stmt->get_result();
    echo "Found " . $result->num_rows . " items\n";
    while ($item = $result->fetch_assoc()) {
        echo "  - " . $item['product_name'] . " | qty: " . $item['quantity'] . " | total: " . $item['net_total'] . "\n";
    }
    $stmt->close();
}

$conn->close();

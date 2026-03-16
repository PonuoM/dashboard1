<?php
$conn = new mysqli('202.183.192.218', 'primacom_bloguser', 'pJnL53Wkhju2LaGPytw8', 'primacom_mini_erp');
$conn->set_charset('utf8mb4');

echo "=== customers columns ===\n";
$r = $conn->query("SHOW COLUMNS FROM customers");
while ($row = $r->fetch_assoc()) {
    echo "  {$row['Field']} ({$row['Type']})\n";
}

echo "\n=== order_cancellations columns ===\n";
$r = $conn->query("SHOW COLUMNS FROM order_cancellations");
while ($row = $r->fetch_assoc()) {
    echo "  {$row['Field']} ({$row['Type']})\n";
}

echo "\n=== Test query ===\n";
$sql = "SELECT 
    o.id AS order_id,
    o.order_date,
    o.order_status,
    COALESCE(c.first_name, '') AS customer_name,
    COALESCE(c.phone, '') AS customer_phone,
    COALESCE(SUM(oi.net_total), 0) AS net_total,
    COALESCE(oc.notes, '') AS cancel_notes
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
INNER JOIN users u ON oi.creator_id = u.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_cancellations oc ON oc.order_id = o.id
WHERE 
    o.company_id = 1
    AND u.id = 1
    AND o.order_date >= '2026-03-01 00:00:00'
    AND o.order_date < '2026-04-01 00:00:00'
    AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
    AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
    AND o.order_status IN ('Cancelled', 'Returned', 'BadDebt')
    AND oc.cancellation_type_id = 1
GROUP BY o.id, o.order_date, o.order_status, c.first_name, c.phone, oc.notes
ORDER BY o.order_date DESC
LIMIT 5";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo "PREPARE ERROR: " . $conn->error . "\n";
} else {
    $stmt->execute();
    $result = $stmt->get_result();
    echo "Rows: " . $result->num_rows . "\n";
    while ($row = $result->fetch_assoc()) {
        echo "  Order #{$row['order_id']}: {$row['customer_name']} = {$row['net_total']}\n";
    }
    $stmt->close();
}
$conn->close();

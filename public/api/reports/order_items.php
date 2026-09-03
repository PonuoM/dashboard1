<?php
/**
 * Order Items Detail API
 * Returns product details for a specific order
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=utf-8");
        }
        echo json_encode(['success' => false, 'message' => 'Fatal: ' . $error['message']]);
    }
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    include '../db.php';
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$order_id = isset($_GET['order_id']) ? trim($_GET['order_id']) : '';

if (empty($order_id)) {
    echo json_encode(['success' => false, 'message' => 'order_id is required']);
    exit;
}

try {
    $sql = "
        SELECT 
            oi.id AS item_id,
            oi.product_id,
            oi.product_name,
            COALESCE(p.sku, '') AS product_sku,
            COALESCE(p.category, '') AS product_category,
            oi.quantity,
            oi.price_per_unit AS unit_price,
            oi.discount,
            oi.net_total,
            CASE WHEN oi.is_freebie = 1 THEN 1 ELSE 0 END AS is_freebie,
            oi.box_number,
            COALESCE(ob.collection_amount, 0) AS collection_amount,
            COALESCE(ob.waived_amount, 0) AS waived_amount,
            COALESCE(ob.status, '') AS box_status
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN order_boxes ob ON ob.order_id = oi.parent_order_id AND ob.box_number = oi.box_number
        WHERE oi.parent_order_id = ?
        ORDER BY oi.id ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare error: ' . $conn->error]);
        exit;
    }
    $stmt->bind_param("s", $order_id);
    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Execute error: ' . $stmt->error]);
        $stmt->close();
        exit;
    }
    $result = $stmt->get_result();

    $items = [];
    $total = 0;
    while ($row = $result->fetch_assoc()) {
        $row['quantity'] = intval($row['quantity']);
        $row['unit_price'] = floatval($row['unit_price']);
        $row['discount'] = floatval($row['discount']);
        $row['net_total'] = floatval($row['net_total']);
        $row['is_freebie'] = intval($row['is_freebie']);
        $row['box_number'] = $row['box_number'] !== null ? intval($row['box_number']) : null;
        $row['collection_amount'] = floatval($row['collection_amount']);
        $row['waived_amount'] = floatval($row['waived_amount']);
        $row['box_status'] = $row['box_status'] ?? '';
        $collection = $row['collection_amount'];
        $waived = $row['waived_amount'];
        $row['net_after_waive'] = ($collection > 0)
            ? $row['net_total'] * max(0, $collection - $waived) / $collection
            : $row['net_total'];
        $total += $row['net_total'];
        $items[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => [
            'items' => $items,
            'total_amount' => $total,
            'item_count' => count($items)
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

if (isset($conn)) $conn->close();

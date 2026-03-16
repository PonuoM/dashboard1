<?php
/**
 * Cancelled Orders Detail API
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=utf-8");
        }
        echo json_encode(['success' => false, 'message' => 'Fatal: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']]);
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
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$cancel_type_id = isset($_GET['cancel_type_id']) ? intval($_GET['cancel_type_id']) : -1;
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'cancelled';

if ($mode === 'returned') {
    // Returned mode: only need company_id + user_id
    if ($company_id <= 0 || $user_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'company_id and user_id are required']);
        exit;
    }
} else {
    if ($company_id <= 0 || $user_id <= 0 || $cancel_type_id < 0) {
        echo json_encode(['success' => false, 'message' => 'company_id, user_id, and cancel_type_id are required']);
        exit;
    }
}

// Calculate date range
if ($month === 0) {
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

try {
    // Build status + type filter based on mode
    if ($mode === 'returned') {
        $status_filter = "AND o.order_status = 'Returned'";
        $type_filter = "";
    } else {
        $status_filter = "AND o.order_status IN ('Cancelled', 'BadDebt')";
        if ($cancel_type_id === 0) {
            $type_filter = "AND oc.order_id IS NULL";
        } else {
            $type_filter = "AND oc.cancellation_type_id = " . intval($cancel_type_id);
        }
    }

    $sql = "
        SELECT 
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
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN order_cancellations oc ON oc.order_id = o.id
        WHERE 
            o.company_id = ?
            AND u.id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            {$status_filter}
            {$type_filter}
        GROUP BY o.id, o.order_date, o.order_status, c.first_name, c.phone, oc.notes
        ORDER BY o.order_date DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare error: ' . $conn->error]);
        exit;
    }
    $stmt->bind_param("iiss", $company_id, $user_id, $start_date, $end_date);
    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'message' => 'Execute error: ' . $stmt->error]);
        $stmt->close();
        exit;
    }
    $result = $stmt->get_result();

    $orders = [];
    $total_amount = 0;
    while ($row = $result->fetch_assoc()) {
        $row['net_total'] = floatval($row['net_total']);
        $total_amount += $row['net_total'];
        $orders[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => [
            'orders' => $orders,
            'total_amount' => $total_amount,
            'total_count' => count($orders)
        ],
        'filters' => [
            'company_id' => $company_id,
            'user_id' => $user_id,
            'month' => $month,
            'year' => $year,
            'cancel_type_id' => $cancel_type_id
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

if (isset($conn)) $conn->close();

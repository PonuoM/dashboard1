<?php
/**
 * Other Orders Detail API
 * Returns orders with status NOT IN (Delivered, Returned, Cancelled)
 * for a specific product and department
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

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$product_id = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
$department = isset($_GET['department']) ? $_GET['department'] : '';
$cancel_type_id = isset($_GET['cancel_type_id']) ? intval($_GET['cancel_type_id']) : 0;
$month_param = isset($_GET['month']) ? $_GET['month'] : date('n');
$year_param = isset($_GET['year']) ? $_GET['year'] : date('Y');
$status_type = isset($_GET['status_type']) ? $_GET['status_type'] : 'other'; // other, delivered, returned, cancelled, baddebt
$salesperson_id = isset($_GET['salesperson_id']) ? intval($_GET['salesperson_id']) : 0;

if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}

// Support comma-separated strings for multiple months/years
function parse_csv_to_ints($input) {
    if (is_array($input)) return array_map('intval', $input);
    if (is_string($input)) return array_map('intval', explode(',', $input));
    return [intval($input)];
}

$months = parse_csv_to_ints($month_param);
$years = parse_csv_to_ints($year_param);

$month_condition = "";
if (!in_array(0, $months)) {
    $month_list = implode(',', $months);
    $month_condition = "AND MONTH(o.order_date) IN ($month_list)";
}
$year_list = implode(',', $years);
$year_condition = "AND YEAR(o.order_date) IN ($year_list)";
$date_condition = "1=1 $month_condition $year_condition";

// Determine status filter
if ($status_type === 'delivered') {
    $status_condition = "o.order_status = 'Delivered'";
} elseif ($status_type === 'returned') {
    $status_condition = "o.order_status = 'Returned'";
} elseif ($status_type === 'cancelled') {
    $status_condition = "o.order_status = 'Cancelled'";
    if ($cancel_type_id > 0) {
        $status_condition .= " AND COALESCE(oc.cancellation_type_id, 0) = " . $cancel_type_id;
    }
} elseif ($status_type === 'baddebt') {
    $status_condition = "o.order_status = 'BadDebt'";
} elseif ($status_type === 'unpaid') {
    $status_condition = "o.order_status = 'Delivered' AND COALESCE(o.amount_paid, 0) < COALESCE(o.total_amount, 0) AND COALESCE(o.payment_status, '') <> 'Approved'";
} elseif (in_array($status_type, ['Pending', 'Preparing', 'Shipping', 'Confirmed', 'Packing', 'Processing'])) {
    $status_condition = "o.order_status = '" . $conn->real_escape_string($status_type) . "'";
} else {
    $status_condition = "o.order_status NOT IN ('Delivered', 'Returned', 'Cancelled', 'BadDebt')";
}

// Department filter
$dept_condition = "";
if ($department === 'Telesale') {
    $dept_condition = "AND u.role IN ('Telesale', 'Supervisor Telesale')";
} elseif ($department === 'Admin Page') {
    $dept_condition = "AND u.role = 'Admin Page'";
} elseif ($department === 'Others') {
    $dept_condition = "AND u.role NOT IN ('Telesale', 'Supervisor Telesale', 'Admin Page')";
}

// Product filter
$product_condition = "";
$bind_types = "i";
$bind_params = [$company_id];

if ($product_id > 0) {
    $product_condition .= " AND oi.product_id = ?";
    $bind_types .= "i";
    $bind_params[] = $product_id;
}

if ($salesperson_id > 0) {
    $product_condition .= " AND COALESCE(oi.creator_id, o.creator_id) = ?";
    $bind_types .= "i";
    $bind_params[] = $salesperson_id;
}

// 1. Get status summary
$summary_sql = "
    SELECT 
        o.order_status,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(oi.quantity) AS total_qty,
        COALESCE(SUM(oi.net_total), 0) AS total_sales
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.parent_order_id
    INNER JOIN users u ON COALESCE(oi.creator_id, o.creator_id) = u.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN order_cancellations oc ON o.id = oc.order_id
    WHERE 
        o.company_id = ?
        AND {$date_condition}
        AND {$status_condition}
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        {$dept_condition}
        {$product_condition}
    GROUP BY o.order_status
    ORDER BY total_qty DESC
";

$stmt = $conn->prepare($summary_sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Summary prepare error: ' . $conn->error]);
    exit;
}
$stmt->bind_param($bind_types, ...$bind_params);
$stmt->execute();
$summary_result = $stmt->get_result();

$status_summary = [];
while ($row = $summary_result->fetch_assoc()) {
    $status_summary[] = [
        'status' => $row['order_status'],
        'order_count' => intval($row['order_count']),
        'total_qty' => intval($row['total_qty']),
        'total_sales' => floatval($row['total_sales'])
    ];
}
$stmt->close();

// 2. Get order details — use subquery to get distinct order IDs first
// Build subquery-specific conditions with o2/u2 aliases
$sub_status = str_replace(
    ['o.order_status', 'o.amount_paid', 'o.total_amount', 'o.payment_status', 'oc.'],
    ['o2.order_status', 'o2.amount_paid', 'o2.total_amount', 'o2.payment_status', 'oc2.'],
    $status_condition
);
$sub_dept = str_replace('u.role', 'u2.role', $dept_condition);
$sub_product = str_replace('o.creator_id', 'o2.creator_id', $product_condition);
$sub_date = str_replace('o.order_date', 'o2.order_date', $date_condition);

$orders_sql = "
    SELECT
        o.id AS order_id,
        o.order_date,
        o.order_status,
        o.payment_method,
        o.payment_status,
        o.amount_paid,
        o.total_amount,
        o.notes AS order_notes,
        oc.notes AS cancel_notes,
        ct.label AS cancel_type_name,
        rb.return_statuses,
        rb.return_notes,
        rb.return_created_at,
        COALESCE(c.first_name, '') AS customer_name,
        COALESCE(c.phone, '') AS customer_phone,
        COALESCE(u.first_name, u.username) AS creator_name,
        u.role AS creator_role,
        sub.item_qty,
        sub.item_total
    FROM (
        SELECT
            oi.parent_order_id AS order_id,
            SUM(oi.quantity) AS item_qty,
            COALESCE(SUM(oi.net_total), 0) AS item_total
        FROM order_items oi
        INNER JOIN orders o2 ON oi.parent_order_id = o2.id
        INNER JOIN users u2 ON COALESCE(oi.creator_id, o2.creator_id) = u2.id
        LEFT JOIN order_cancellations oc2 ON o2.id = oc2.order_id
        WHERE
            o2.company_id = ?
            AND {$sub_date}
            AND {$sub_status}
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$sub_dept}
            {$sub_product}
        GROUP BY oi.parent_order_id
    ) sub
    INNER JOIN orders o ON sub.order_id = o.id
    LEFT JOIN users u ON o.creator_id = u.id
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN order_cancellations oc ON o.id = oc.order_id
    LEFT JOIN cancellation_types ct ON oc.cancellation_type_id = ct.id
    -- เหตุผลตีกลับถูกบันทึกที่ระดับกล่อง (order_boxes) ไม่ใช่ orders.notes
    -- ออเดอร์เดียวอาจมีหลายกล่องตีกลับ (partial return) จึงรวมเป็นข้อความเดียว
    LEFT JOIN (
        SELECT
            order_id,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(return_status), '') SEPARATOR ',') AS return_statuses,
            GROUP_CONCAT(DISTINCT NULLIF(TRIM(return_note), '') SEPARATOR ' | ') AS return_notes,
            MAX(return_created_at) AS return_created_at
        FROM order_boxes
        WHERE status = 'RETURNED'
        GROUP BY order_id
    ) rb ON rb.order_id = o.id
    ORDER BY o.order_date DESC
";

$stmt2 = $conn->prepare($orders_sql);
if (!$stmt2) {
    echo json_encode(['success' => false, 'message' => 'Orders prepare error: ' . $conn->error]);
    exit;
}
$stmt2->bind_param($bind_types, ...$bind_params);
$stmt2->execute();
$orders_result = $stmt2->get_result();

$orders = [];
$total_count = 0;
$total_amount = 0;
while ($row = $orders_result->fetch_assoc()) {
    $item_total = floatval($row['item_total']);
    $order_total = floatval($row['total_amount']);
    $paid = floatval($row['amount_paid'] ?? 0);
    // Proportional share of unpaid amount that belongs to this creator's items
    $unpaid_share = ($order_total > 0 && $paid < $order_total)
        ? $item_total * ($order_total - $paid) / $order_total
        : 0;

    $orders[] = [
        'order_id' => $row['order_id'],
        'order_date' => $row['order_date'],
        'order_status' => $row['order_status'],
        'payment_method' => $row['payment_method'] ?? '',
        'payment_status' => $row['payment_status'] ?? '',
        'amount_paid' => $paid,
        'customer_name' => $row['customer_name'],
        'customer_phone' => $row['customer_phone'],
        'creator_name' => $row['creator_name'],
        'creator_role' => $row['creator_role'],
        'item_qty' => intval($row['item_qty']),
        'item_total' => $item_total,
        'total_amount' => $order_total,
        'unpaid_share' => $unpaid_share,
        'order_notes' => $row['order_notes'] ?? '',
        'cancel_notes' => $row['cancel_notes'] ?? '',
        'cancel_type_name' => $row['cancel_type_name'] ?? '',
        'return_status' => $row['return_statuses'] ?? '',
        'return_note' => $row['return_notes'] ?? '',
        'return_date' => $row['return_created_at'] ?? ''
    ];
    $total_count++;
    // For unpaid view, summary = sum of unpaid shares; otherwise = sum of item totals
    $total_amount += ($status_type === 'unpaid') ? $unpaid_share : $item_total;
}
$stmt2->close();

echo json_encode([
    'success' => true,
    'data' => [
        'status_summary' => $status_summary,
        'orders' => $orders,
        'total_count' => $total_count,
        'total_amount' => $total_amount
    ]
], JSON_UNESCAPED_UNICODE);

$conn->close();

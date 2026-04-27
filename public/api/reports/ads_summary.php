<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include '../db.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');

if (!$company_id) {
    echo json_encode(['success' => false, 'error' => 'Missing company_id']);
    exit;
}

$start_date = sprintf('%04d-%02d-01', $year, $month);
$end_date = date('Y-m-t', strtotime($start_date)) . ' 23:59:59';

// 1. Get all active pages with sell_product_type and assigned user
$pages_sql = "
    SELECT 
        p.id AS page_id,
        p.name AS page_name,
        p.sell_product_type,
        p.active,
        GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) SEPARATOR ', ') AS assigned_users
    FROM pages p
    LEFT JOIN marketing_user_page mup ON mup.page_id = p.id
    LEFT JOIN users u ON u.id = mup.user_id
    WHERE p.company_id = ?
    GROUP BY p.id, p.name, p.sell_product_type, p.active
    ORDER BY p.name
";

$stmt = $conn->prepare($pages_sql);
$stmt->bind_param('i', $company_id);
$stmt->execute();
$result = $stmt->get_result();

$pages = [];
while ($row = $result->fetch_assoc()) {
    $pages[$row['page_id']] = [
        'page_id' => intval($row['page_id']),
        'page_name' => $row['page_name'],
        'sell_product_type' => $row['sell_product_type'] ?? '-',
        'assigned_user' => $row['assigned_users'] ?? '-',
        'active' => isset($row['active']) ? intval($row['active']) : 1,
    ];
}
$stmt->close();

if (empty($pages)) {
    echo json_encode(['success' => true, 'data' => ['rows' => [], 'totals' => []]]);
    exit;
}

$page_ids = array_keys($pages);
$page_ids_str = implode(',', $page_ids);

// 2. Get ads data per page
$ads_data = [];
$ads_sql = "
    SELECT 
        page_id,
        COALESCE(SUM(ads_cost), 0) AS ads_cost,
        COALESCE(SUM(clicks), 0) AS clicks
    FROM marketing_ads_log
    WHERE page_id IN ($page_ids_str)
        AND date BETWEEN ? AND ?
    GROUP BY page_id
";

$stmt = $conn->prepare($ads_sql);
if ($stmt) {
    $stmt->bind_param('ss', $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $ads_data[$row['page_id']] = $row;
    }
    $stmt->close();
}

// 3. Check if customer_type column exists in orders table
$has_customer_type = false;
$check = $conn->query("SHOW COLUMNS FROM orders LIKE 'customer_type'");
if ($check && $check->num_rows > 0) {
    $has_customer_type = true;
}

// 4. Get order/sales data per page, split by customer_type if available
$sales_data = [];
if ($has_customer_type) {
    $sales_sql = "
        SELECT 
            o.sales_channel_page_id AS page_id,
            COUNT(DISTINCT o.id) AS order_count,
            COUNT(DISTINCT o.customer_id) AS customer_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COALESCE(SUM(CASE WHEN o.customer_type = 'New Customer' THEN oi.net_total ELSE 0 END), 0) AS new_sales,
            COALESCE(SUM(CASE WHEN o.customer_type != 'New Customer' OR o.customer_type IS NULL THEN oi.net_total ELSE 0 END), 0) AS reorder_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE o.sales_channel_page_id IN ($page_ids_str)
            AND o.order_date BETWEEN ? AND ?
            AND o.order_status != 'Cancelled'
            AND o.company_id = ?
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY o.sales_channel_page_id
    ";
} else {
    $sales_sql = "
        SELECT 
            o.sales_channel_page_id AS page_id,
            COUNT(DISTINCT o.id) AS order_count,
            COUNT(DISTINCT o.customer_id) AS customer_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            0 AS new_sales,
            COALESCE(SUM(oi.net_total), 0) AS reorder_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE o.sales_channel_page_id IN ($page_ids_str)
            AND o.order_date BETWEEN ? AND ?
            AND o.order_status != 'Cancelled'
            AND o.company_id = ?
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY o.sales_channel_page_id
    ";
}

$stmt = $conn->prepare($sales_sql);
if ($stmt) {
    $stmt->bind_param('ssi', $start_date, $end_date, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $sales_data[$row['page_id']] = $row;
    }
    $stmt->close();
} else {
    // Debug: output the SQL error
    echo json_encode(['success' => false, 'error' => 'Sales query failed: ' . $conn->error]);
    exit;
}

// 4. Combine data
$rows = [];
$totals = [
    'ads_cost' => 0,
    'total_sales' => 0,
    'new_sales' => 0,
    'reorder_sales' => 0,
    'customer_count' => 0,
    'clicks' => 0,
    'order_count' => 0,
];

foreach ($pages as $page_id => $page) {
    $ads = $ads_data[$page_id] ?? ['ads_cost' => 0, 'clicks' => 0];
    $sales = $sales_data[$page_id] ?? ['order_count' => 0, 'customer_count' => 0, 'total_sales' => 0, 'new_sales' => 0, 'reorder_sales' => 0];

    // Skip inactive pages that have no sales and no ads cost in this selected month
    if ($page['active'] == 0 && floatval($sales['total_sales']) == 0 && floatval($ads['ads_cost']) == 0) {
        continue;
    }

    $row = [
        'page_id' => $page_id,
        'page_name' => $page['page_name'],
        'sell_product_type' => $page['sell_product_type'],
        'assigned_user' => $page['assigned_user'],
        'ads_cost' => floatval($ads['ads_cost']),
        'total_sales' => floatval($sales['total_sales']),
        'new_sales' => floatval($sales['new_sales']),
        'reorder_sales' => floatval($sales['reorder_sales']),
        'customer_count' => intval($sales['customer_count']),
        'clicks' => intval($ads['clicks']),
        'order_count' => intval($sales['order_count']),
    ];

    $rows[] = $row;

    $totals['ads_cost'] += $row['ads_cost'];
    $totals['total_sales'] += $row['total_sales'];
    $totals['new_sales'] += $row['new_sales'];
    $totals['reorder_sales'] += $row['reorder_sales'];
    $totals['customer_count'] += $row['customer_count'];
    $totals['clicks'] += $row['clicks'];
    $totals['order_count'] += $row['order_count'];
}

echo json_encode([
    'success' => true,
    'data' => [
        'rows' => $rows,
        'totals' => $totals,
    ],
    'meta' => [
        'month' => $month,
        'year' => $year,
        'company_id' => $company_id,
    ]
], JSON_UNESCAPED_UNICODE);

$conn->close();
?>

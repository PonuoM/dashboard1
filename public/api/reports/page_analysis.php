<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

include '../db.php';
require_once __DIR__ . '/../helpers/product_names.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if (!$company_id) {
    echo json_encode(['success' => false, 'error' => 'Missing company_id']);
    exit;
}

// Build access control filter based on user role
$access_filter = "";
$allowed_user_ids = [];

if ($user_id > 0) {
    // Fetch user role
    $role_stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $role_stmt->bind_param('i', $user_id);
    $role_stmt->execute();
    $role_result = $role_stmt->get_result();
    $user_role = '';
    if ($row = $role_result->fetch_assoc()) {
        $user_role = $row['role'];
    }
    $role_stmt->close();

    if ($user_role === 'Supervisor Telesale') {
        // Get subordinates
        $sub_stmt = $conn->prepare("SELECT id FROM users WHERE supervisor_id = ?");
        $sub_stmt->bind_param('i', $user_id);
        $sub_stmt->execute();
        $sub_result = $sub_stmt->get_result();
        $allowed_user_ids[] = $user_id;
        while ($sub_row = $sub_result->fetch_assoc()) {
            $allowed_user_ids[] = intval($sub_row['id']);
        }
        $sub_stmt->close();
        $ids_str = implode(',', $allowed_user_ids);
        $access_filter = " AND o.creator_id IN ($ids_str)";
    } elseif ($user_role === 'Telesale' || $user_role === 'Admin Page') {
        $access_filter = " AND o.creator_id = $user_id";
        $allowed_user_ids[] = $user_id;
    }
    // Admin Control or other roles: no filter (see all)
}

// Build date range
$start_date = sprintf('%04d-%02d-01', $year, $month);
$end_date = date('Y-m-t', strtotime($start_date));

// Optional explicit date range (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides month/year ถ้ามี
// หน้านี้ใช้รูปแบบวันที่ล้วน (Y-m-d) แล้วต่อท้าย ' 23:59:59' ตอน bind จึงตัดเอาเฉพาะส่วนวันที่
require_once __DIR__ . '/../helpers/date_filter.php';
$__r = resolve_date_range();
if ($__r) { $start_date = substr($__r['start'], 0, 10); $end_date = substr($__r['end_incl'], 0, 10); }

$response = [
    'success' => true,
    'meta' => [
        'company_id' => $company_id,
        'month' => $month,
        'year' => $year,
        'date_range' => [$start_date, $end_date]
    ],
    'data' => []
];

// 1. Get pages for this company with order stats
$pages_sql = "
    SELECT 
        p.id,
        p.name as page_name,
        p.platform,
        p.active,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.net_total), 0) as total_sales
    FROM pages p
    LEFT JOIN orders o ON o.sales_channel_page_id = p.id 
        AND o.order_date BETWEEN ? AND ?
        AND o.order_status != 'Cancelled'
        " . ($access_filter ? str_replace('o.creator_id', 'o.creator_id', $access_filter) : '') . "
    LEFT JOIN order_items oi ON oi.parent_order_id = o.id
    WHERE p.company_id = ?
    GROUP BY p.id, p.name, p.platform, p.active
    ORDER BY total_sales DESC
";

$stmt = $conn->prepare($pages_sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'SQL Error: ' . $conn->error]);
    exit;
}
$end_date_full = $end_date . ' 23:59:59';
$stmt->bind_param('ssi', $start_date, $end_date_full, $company_id);
$stmt->execute();
$result = $stmt->get_result();

$pages = [];
while ($row = $result->fetch_assoc()) {
    $pages[$row['id']] = $row;
}

// 2. Get order timeline (orders by hour for each page)
$timeline_sql = "
    SELECT 
        o.sales_channel_page_id as page_id,
        HOUR(o.order_date) as hour,
        COUNT(*) as order_count
    FROM orders o
    JOIN pages p ON o.sales_channel_page_id = p.id
    WHERE p.company_id = ?
        AND o.order_date BETWEEN ? AND ?
        AND o.order_status != 'Cancelled'
        $access_filter
    GROUP BY o.sales_channel_page_id, HOUR(o.order_date)
    ORDER BY o.sales_channel_page_id, hour
";

$stmt = $conn->prepare($timeline_sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'Timeline SQL Error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('iss', $company_id, $start_date, $end_date_full);
$stmt->execute();
$result = $stmt->get_result();

$timeline = [];
while ($row = $result->fetch_assoc()) {
    $page_id = $row['page_id'];
    if (!isset($timeline[$page_id])) {
        $timeline[$page_id] = array_fill(0, 24, 0); // 0-23 hours
    }
    $timeline[$page_id][$row['hour']] = intval($row['order_count']);
}

// 3. Get marketing ads data
$ads_sql = "
    SELECT 
        mal.page_id,
        SUM(mal.ads_cost) as total_ads_cost,
        SUM(mal.impressions) as total_impressions,
        SUM(mal.reach) as total_reach,
        SUM(mal.clicks) as total_clicks
    FROM marketing_ads_log mal
    JOIN pages p ON mal.page_id = p.id
    WHERE p.company_id = ?
        AND mal.date BETWEEN ? AND ?
    GROUP BY mal.page_id
";

$stmt = $conn->prepare($ads_sql);
$ads_data = [];
if ($stmt) {
    $stmt->bind_param('iss', $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $ads_data[$row['page_id']] = $row;
    }
}

// 4. Combine all data
$combined = [];
foreach ($pages as $page_id => $page) {
    $ads = $ads_data[$page_id] ?? [
        'total_ads_cost' => 0,
        'total_impressions' => 0,
        'total_reach' => 0,
        'total_clicks' => 0
    ];
    
    // Skip inactive pages that have no sales and no ads cost in this selected month
    if (isset($page['active']) && $page['active'] == 0 && floatval($page['total_sales']) == 0 && floatval($ads['total_ads_cost']) == 0) {
        continue;
    }
    
    $combined[] = [
        'page_id' => $page_id,
        'page_name' => $page['page_name'],
        'platform' => $page['platform'],
        'order_count' => intval($page['order_count']),
        'total_sales' => floatval($page['total_sales']),
        'ads_cost' => floatval($ads['total_ads_cost']),
        'impressions' => intval($ads['total_impressions']),
        'reach' => intval($ads['total_reach']),
        'clicks' => intval($ads['total_clicks']),
        'timeline' => $timeline[$page_id] ?? array_fill(0, 24, 0)
    ];
}

// 5. Calculate summary
$summary = [
    'total_pages' => count($combined),
    'total_orders' => array_sum(array_column($combined, 'order_count')),
    'total_sales' => array_sum(array_column($combined, 'total_sales')),
    'total_ads_cost' => array_sum(array_column($combined, 'ads_cost')),
    'total_impressions' => array_sum(array_column($combined, 'impressions')),
    'total_reach' => array_sum(array_column($combined, 'reach')),
    'total_clicks' => array_sum(array_column($combined, 'clicks'))
];

// Calculate overall timeline (all pages combined)
$overall_timeline = array_fill(0, 24, 0);
foreach ($timeline as $page_timeline) {
    for ($h = 0; $h < 24; $h++) {
        $overall_timeline[$h] += $page_timeline[$h];
    }
}

// 6. Get product sales breakdown by page (for pivot table)
$product_page_sql = "
    SELECT 
        o.sales_channel_page_id as page_id,
        pg.name as page_name,
        p.id as product_id,
        p.name as product_name,
        p.category as product_category,
        SUM(oi.quantity) as total_qty,
        COALESCE(SUM(oi.net_total), 0) as total_sales,
        COUNT(DISTINCT o.id) as order_count
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.parent_order_id
    INNER JOIN products p ON oi.product_id = p.id
    INNER JOIN pages pg ON o.sales_channel_page_id = pg.id
    WHERE pg.company_id = ?
        AND o.order_date BETWEEN ? AND ?
        AND o.order_status != 'Cancelled'
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        $access_filter
    GROUP BY o.sales_channel_page_id, pg.name, p.id, p.name, p.category
    ORDER BY pg.name, total_sales DESC
";

$product_by_page = [];
$all_products = [];
$stmt = $conn->prepare($product_page_sql);
if ($stmt) {
    $stmt->bind_param('iss', $company_id, $start_date, $end_date_full);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $product_by_page[] = [
            'page_id' => intval($row['page_id']),
            'page_name' => $row['page_name'],
            'product_id' => intval($row['product_id']),
            'product_name' => shorten_product_name($row['product_name']),
            'product_category' => $row['product_category'],
            'qty' => intval($row['total_qty']),
            'sales' => floatval($row['total_sales']),
            'orders' => intval($row['order_count'])
        ];
        // Collect unique products
        $pid = intval($row['product_id']);
        if (!isset($all_products[$pid])) {
            $all_products[$pid] = [
                'id' => $pid,
                'name' => shorten_product_name($row['product_name']),
                'category' => $row['product_category']
            ];
        }
    }
    $stmt->close();
}

$response['data'] = [
    'summary' => $summary,
    'pages' => $combined,
    'overall_timeline' => $overall_timeline,
    'product_by_page' => $product_by_page,
    'all_products' => array_values($all_products)
];

$conn->close();
echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>

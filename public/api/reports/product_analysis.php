<?php
/**
 * Product Analysis API
 * Provides product sales data grouped by category, customer type, and monthly breakdown
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include '../db.php';

// Get parameters
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 1;
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$department = isset($_GET['department']) ? $_GET['department'] : 'all';
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
// ดูเฉพาะรายบุคคล: เลือกพนักงานคนเดียว (creator_id) — 'all' หรือว่าง = ทุกคน
$salesperson = (isset($_GET['salesperson']) && $_GET['salesperson'] !== '' && $_GET['salesperson'] !== 'all')
    ? intval($_GET['salesperson'])
    : 0;

$start_date = "$year-01-01 00:00:00";
$end_date = "$year-12-31 23:59:59";

// Optional explicit date range (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides year ถ้ามี
require_once __DIR__ . '/../helpers/date_filter.php';
$__r = resolve_date_range();
if ($__r) {
    $start_date = $__r['start'];
    $end_date = $__r['end_incl']; // เงื่อนไขใช้ <= จึงใช้ end inclusive
}

// Build department filter based on user roles
$dept_filter = "";
if ($department === 'telesale') {
    $dept_filter = " AND u.role IN ('Telesale', 'Supervisor Telesale')";
} elseif ($department === 'admin') {
    $dept_filter = " AND u.role = 'Admin Page'";
} elseif ($department === 'others') {
    $dept_filter = " AND u.role NOT IN ('Telesale', 'Supervisor Telesale', 'Admin Page')";
}
// 'all' = no filter

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

// ดูเฉพาะรายบุคคล: จำกัดให้เหลือเฉพาะ creator_id ที่เลือก (ซ้อนบน access_filter เดิม จึงยังเคารพสิทธิ์การเข้าถึง)
if ($salesperson > 0) {
    $access_filter .= " AND o.creator_id = $salesperson";
}

// 1. Summary by Category
$summary_sql = "
    SELECT 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END AS category_group,
        SUM(oi.net_total) AS total_sales,
        SUM(oi.quantity) AS total_quantity
    FROM order_items oi
    INNER JOIN orders o ON oi.parent_order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON o.creator_id = u.id
    WHERE o.company_id = $company_id
        AND o.order_date >= '$start_date'
        AND o.order_date <= '$end_date'
        AND o.order_status != 'Cancelled'
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        $dept_filter
        $access_filter
    GROUP BY 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END
";

$result = $conn->query($summary_sql);
$summary_rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $summary_rows[] = $row;
    }
}

// Calculate summary
$bio_sales = 0;
$fertilizer_sales = 0;
$other_sales = 0;
foreach ($summary_rows as $row) {
    if ($row['category_group'] === 'ชีวภัณฑ์') {
        $bio_sales = floatval($row['total_sales']);
    } elseif ($row['category_group'] === 'ปุ๋ย') {
        $fertilizer_sales = floatval($row['total_sales']);
    } else {
        $other_sales = floatval($row['total_sales']);
    }
}
$total_sales = $bio_sales + $fertilizer_sales + $other_sales;

// 2. Sales by Customer Type (with monthly breakdown for frontend filtering)
$customer_type_sql = "
    SELECT 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END AS category,
        CASE 
            WHEN o.customer_type = 'New Customer' THEN 'new'
            ELSE 'reorder'
        END AS customer_type,
        MONTH(o.order_date) AS month_num,
        SUM(oi.net_total) AS sales,
        SUM(oi.quantity) AS qty
    FROM order_items oi
    INNER JOIN orders o ON oi.parent_order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON o.creator_id = u.id
    WHERE o.company_id = $company_id
        AND o.order_date >= '$start_date'
        AND o.order_date <= '$end_date'
        AND o.order_status != 'Cancelled'
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        $dept_filter
        $access_filter
    GROUP BY 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END,
        CASE 
            WHEN o.customer_type = 'New Customer' THEN 'new'
            ELSE 'reorder'
        END,
        MONTH(o.order_date)
";

$result = $conn->query($customer_type_sql);
$customer_type_rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $customer_type_rows[] = $row;
    }
}

// Build monthly customer type structure
$by_customer_type_monthly = [];
$categories = ['ชีวภัณฑ์', 'ปุ๋ย', 'อื่นๆ'];
foreach ($categories as $cat) {
    $by_customer_type_monthly[$cat] = [
        'category' => $cat,
        'new_monthly' => array_fill(0, 12, 0),
        'new_qty_monthly' => array_fill(0, 12, 0),
        'reorder_monthly' => array_fill(0, 12, 0),
        'reorder_qty_monthly' => array_fill(0, 12, 0),
    ];
}

foreach ($customer_type_rows as $row) {
    $cat = $row['category'];
    if (!isset($by_customer_type_monthly[$cat])) {
        $by_customer_type_monthly[$cat] = [
            'category' => $cat,
            'new_monthly' => array_fill(0, 12, 0),
            'new_qty_monthly' => array_fill(0, 12, 0),
            'reorder_monthly' => array_fill(0, 12, 0),
            'reorder_qty_monthly' => array_fill(0, 12, 0),
        ];
    }
    $month_idx = intval($row['month_num']) - 1;
    if ($month_idx < 0 || $month_idx >= 12) continue;
    
    if ($row['customer_type'] === 'new') {
        $by_customer_type_monthly[$cat]['new_monthly'][$month_idx] += floatval($row['sales']);
        $by_customer_type_monthly[$cat]['new_qty_monthly'][$month_idx] += intval($row['qty']);
    } else {
        $by_customer_type_monthly[$cat]['reorder_monthly'][$month_idx] += floatval($row['sales']);
        $by_customer_type_monthly[$cat]['reorder_qty_monthly'][$month_idx] += intval($row['qty']);
    }
}

// Build aggregated by_customer_type (full year) from monthly data
$by_customer_type = [];
foreach ($by_customer_type_monthly as $cat => $d) {
    $new_sales = array_sum($d['new_monthly']);
    $new_qty = array_sum($d['new_qty_monthly']);
    $reorder_sales = array_sum($d['reorder_monthly']);
    $reorder_qty = array_sum($d['reorder_qty_monthly']);
    if ($new_sales > 0 || $reorder_sales > 0) {
        $by_customer_type[] = [
            'category' => $cat,
            'new_sales' => $new_sales,
            'new_qty' => $new_qty,
            'reorder_sales' => $reorder_sales,
            'reorder_qty' => $reorder_qty,
        ];
    }
}
$by_customer_type_monthly = array_values($by_customer_type_monthly);

// 3. Monthly Sales by Product
$monthly_sql = "
    SELECT 
        COALESCE(p.name, oi.product_name) AS product_name,
        MONTH(o.order_date) AS month_num,
        SUM(oi.net_total) AS monthly_sales,
        SUM(oi.quantity) AS monthly_qty
    FROM order_items oi
    INNER JOIN orders o ON oi.parent_order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON o.creator_id = u.id
    WHERE o.company_id = $company_id
        AND o.order_date >= '$start_date'
        AND o.order_date <= '$end_date'
        AND o.order_status != 'Cancelled'
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        $dept_filter
        $access_filter
    GROUP BY COALESCE(p.name, oi.product_name), MONTH(o.order_date)
    ORDER BY product_name, month_num
";

$result = $conn->query($monthly_sql);
$monthly_rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $monthly_rows[] = $row;
    }
}

// Organize into pivot format
$products = [];
foreach ($monthly_rows as $row) {
    $name = $row['product_name'];
    if (!isset($products[$name])) {
        $products[$name] = [
            'product_name' => $name,
            'monthly' => array_fill(0, 12, 0),
            'monthly_qty' => array_fill(0, 12, 0),
            'total' => 0,
            'total_qty' => 0
        ];
    }
    $month_idx = intval($row['month_num']) - 1;
    $products[$name]['monthly'][$month_idx] += floatval($row['monthly_sales']);
    $products[$name]['monthly_qty'][$month_idx] += intval($row['monthly_qty']);
}

// Calculate totals from monthly arrays to ensure consistency
foreach ($products as &$prod) {
    $prod['total'] = array_sum($prod['monthly']);
    $prod['total_qty'] = array_sum($prod['monthly_qty']);
}
unset($prod);

// Sort by total sales and take top 20
usort($products, function($a, $b) {
    return $b['total'] - $a['total'];
});
$monthly_products = array_slice(array_values($products), 0, 50);

// 3b. Quantity Distribution per Order (จำนวนต่อออเดอร์) - with monthly breakdown
$dist_sql = "
    SELECT
        product_name,
        month_num,
        qty_per_order,
        COUNT(*) AS order_count
    FROM (
        SELECT
            COALESCE(p.name, oi.product_name) AS product_name,
            o.id AS order_id,
            MONTH(o.order_date) AS month_num,
            SUM(oi.quantity) AS qty_per_order
        FROM order_items oi
        INNER JOIN orders o ON oi.parent_order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN users u ON o.creator_id = u.id
        WHERE o.company_id = $company_id
            AND o.order_date >= '$start_date'
            AND o.order_date <= '$end_date'
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $dept_filter
            $access_filter
        GROUP BY COALESCE(p.name, oi.product_name), o.id, MONTH(o.order_date)
    ) AS order_products
    WHERE qty_per_order > 0
    GROUP BY product_name, month_num, qty_per_order
    ORDER BY product_name, month_num, qty_per_order
";

$result = $conn->query($dist_sql);
$qty_dist_monthly_map = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $name = $row['product_name'];
        $month = intval($row['month_num']);
        $qty = intval($row['qty_per_order']);
        $count = intval($row['order_count']);
        if ($qty < 1 || $month < 1 || $month > 12) continue;

        if (!isset($qty_dist_monthly_map[$name])) {
            $qty_dist_monthly_map[$name] = [];
            for ($m = 1; $m <= 12; $m++) {
                $qty_dist_monthly_map[$name][$m] = [
                    'qtys' => (object)[], // actual qty -> count (no bucket cap)
                    '_orders' => 0,
                    '_qty' => 0,
                ];
            }
        }
        // Convert qtys back to array for accumulation, will re-cast to object later
        if (is_object($qty_dist_monthly_map[$name][$month]['qtys'])) {
            $qty_dist_monthly_map[$name][$month]['qtys'] = (array)$qty_dist_monthly_map[$name][$month]['qtys'];
        }
        $key = (string)$qty;
        $existing = $qty_dist_monthly_map[$name][$month]['qtys'][$key] ?? 0;
        $qty_dist_monthly_map[$name][$month]['qtys'][$key] = $existing + $count;
        $qty_dist_monthly_map[$name][$month]['_orders'] += $count;
        $qty_dist_monthly_map[$name][$month]['_qty'] += ($qty * $count);
    }
}

// Build final structure for frontend with monthly breakdown
$qty_distribution = [];
foreach ($qty_dist_monthly_map as $name => $months) {
    $total_orders = 0;
    foreach ($months as $m_data) {
        $total_orders += $m_data['_orders'];
    }
    // Ensure qtys is always an object (even when empty) for consistent JSON
    foreach ($months as $m => &$m_data) {
        if (is_array($m_data['qtys']) && empty($m_data['qtys'])) {
            $m_data['qtys'] = (object)[];
        }
    }
    unset($m_data);
    $qty_distribution[] = [
        'product_name' => $name,
        'monthly' => $months,
        'total_orders' => $total_orders,
    ];
}
usort($qty_distribution, function($a, $b) {
    return $b['total_orders'] - $a['total_orders'];
});

// 4. Monthly performance for charts (last 6 months)
$perf_sql = "
    SELECT 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END AS category,
        MONTH(o.order_date) AS month_num,
        SUM(oi.net_total) AS sales
    FROM order_items oi
    INNER JOIN orders o ON oi.parent_order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON o.creator_id = u.id
    WHERE o.company_id = $company_id
        AND o.order_date >= '$start_date'
        AND o.order_date <= '$end_date'
        AND o.order_status != 'Cancelled'
        AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        $dept_filter
        $access_filter
    GROUP BY 
        CASE 
            WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
            WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
            ELSE 'อื่นๆ'
        END,
        MONTH(o.order_date)
    ORDER BY month_num
";

$result = $conn->query($perf_sql);
$perf_rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $perf_rows[] = $row;
    }
}

// Build category performance (with 12 months data)
$cat_perf = [
    'ชีวภัณฑ์' => ['category' => 'ชีวภัณฑ์', 'monthly_raw' => array_fill(0, 12, 0), 'monthly' => [], 'growth' => 0],
    'ปุ๋ย' => ['category' => 'ปุ๋ย', 'monthly_raw' => array_fill(0, 12, 0), 'monthly' => [], 'growth' => 0],
    'อื่นๆ' => ['category' => 'อื่นๆ', 'monthly_raw' => array_fill(0, 12, 0), 'monthly' => [], 'growth' => 0]
];

foreach ($perf_rows as $row) {
    $cat = $row['category'];
    $month_idx = intval($row['month_num']) - 1;
    if (isset($cat_perf[$cat]) && $month_idx >= 0 && $month_idx < 12) {
        $cat_perf[$cat]['monthly_raw'][$month_idx] = floatval($row['sales']);
    }
}

// Calculate growth (compare first month with data to last month with data)
foreach ($cat_perf as $cat => &$data) {
    // Find first and last non-zero values for growth calculation
    $nonZeroMonths = array_filter($data['monthly_raw'], function($v) { return $v > 0; });
    if (count($nonZeroMonths) >= 2) {
        $first = reset($nonZeroMonths);
        $last = end($nonZeroMonths);
        if ($first > 0) {
            $data['growth'] = round((($last - $first) / $first) * 100, 1);
        }
    }
    // Normalize to percentage for chart display (max = 100)
    $maxVal = max($data['monthly_raw']) ?: 1;
    $data['monthly'] = array_map(function($v) use ($maxVal) {
        return $maxVal > 0 ? round(($v / $maxVal) * 100) : 0;
    }, $data['monthly_raw']);
}
unset($data);

// 5. Get employees for filter (ดูเฉพาะรายบุคคล) — ปรับรายชื่อตามแผนกที่เลือก
$emp_role_filter = " AND role IN ('Telesale', 'Supervisor Telesale', 'Admin Page')"; // all = คนที่สร้างออเดอร์
if ($department === 'telesale') {
    $emp_role_filter = " AND role IN ('Telesale', 'Supervisor Telesale')";
} elseif ($department === 'admin') {
    $emp_role_filter = " AND role = 'Admin Page'";
} elseif ($department === 'others') {
    $emp_role_filter = " AND role NOT IN ('Telesale', 'Supervisor Telesale', 'Admin Page')";
}
// ถ้าผู้ใช้ถูกจำกัดสิทธิ์ (Telesale/Supervisor) ให้ลิสต์เฉพาะคนที่ตัวเองเข้าถึงได้
$emp_access_filter = "";
if (!empty($allowed_user_ids)) {
    $emp_access_filter = " AND id IN (" . implode(',', $allowed_user_ids) . ")";
}
$emp_sql = "
    SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS name
    FROM users
    WHERE company_id = $company_id
        AND status = 'active'
        $emp_role_filter
        $emp_access_filter
    ORDER BY first_name
";
$result = $conn->query($emp_sql);
$employees = [];
$employees[] = ['id' => 'all', 'name' => 'ทุกคน'];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $employees[] = $row;
    }
}

// Build response
$response = [
    'success' => true,
    'data' => [
        'summary' => [
            'bio_sales' => $bio_sales,
            'bio_growth' => $cat_perf['ชีวภัณฑ์']['growth'] ?? 0,
            'fertilizer_sales' => $fertilizer_sales,
            'fertilizer_growth' => $cat_perf['ปุ๋ย']['growth'] ?? 0,
            'other_sales' => $other_sales,
            'total_sales' => $total_sales
        ],
        'by_customer_type' => $by_customer_type,
        'by_customer_type_monthly' => $by_customer_type_monthly,
        'monthly_products' => $monthly_products,
        'qty_distribution' => $qty_distribution,
        'category_performance' => array_values($cat_perf),
        'employees' => $employees,
        'filters' => [
            'year' => $year,
            'department' => $department,
            'user_id' => $user_id,
            'salesperson' => $salesperson > 0 ? $salesperson : 'all'
        ]
    ]
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);

$conn->close();

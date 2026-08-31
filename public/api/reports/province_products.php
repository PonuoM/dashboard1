<?php
/**
 * Province Products API
 * Returns product breakdown (quantity + sales) for a single province.
 * Uses the same filters/access-control as regional_sales.php so totals match.
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
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$department = isset($_GET['department']) ? $_GET['department'] : 'all';
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$province = isset($_GET['province']) ? trim($_GET['province']) : '';

// Validate
if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}
if ($province === '') {
    echo json_encode(['success' => false, 'message' => 'province is required']);
    exit;
}

// Calculate date range
if ($month === 0) {
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

// Optional explicit date range (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides month/year ถ้ามี
require_once __DIR__ . '/../helpers/date_filter.php';
$__r = resolve_date_range();
if ($__r) { $start_date = $__r['start']; $end_date = $__r['end_excl']; }

// Department filter condition
$dept_condition = "";
if ($department === 'telesale') {
    $dept_condition = "AND u.role IN ('Telesale', 'Supervisor Telesale')";
} elseif ($department === 'admin') {
    $dept_condition = "AND u.role = 'Admin Page'";
} elseif ($department === 'others') {
    $dept_condition = "AND u.role NOT IN ('Telesale', 'Supervisor Telesale', 'Admin Page')";
}

// Build access control filter based on user role
$access_filter = "";
if ($user_id > 0) {
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
        $sub_stmt = $conn->prepare("SELECT id FROM users WHERE supervisor_id = ?");
        $sub_stmt->bind_param('i', $user_id);
        $sub_stmt->execute();
        $sub_result = $sub_stmt->get_result();
        $allowed_user_ids = [$user_id];
        while ($sub_row = $sub_result->fetch_assoc()) {
            $allowed_user_ids[] = intval($sub_row['id']);
        }
        $sub_stmt->close();
        $ids_str = implode(',', $allowed_user_ids);
        $access_filter = " AND o.creator_id IN ($ids_str)";
    } elseif ($user_role === 'Telesale' || $user_role === 'Admin Page') {
        $access_filter = " AND o.creator_id = $user_id";
    }
    // Admin Control or other roles: no filter (see all)
}

try {
    $sql = "
        SELECT
            COALESCE(p.name, oi.product_name) AS product_name,
            p.category AS category,
            COALESCE(SUM(oi.quantity), 0) AS total_qty,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COUNT(DISTINCT o.id) AS order_count
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN users u ON o.creator_id = u.id
        LEFT JOIN address_provinces ap ON (c.province = ap.name_en OR c.province = ap.name_th)
        WHERE
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND COALESCE(ap.name_th, c.province) = ?
            $dept_condition
            $access_filter
        GROUP BY product_name, p.category
        ORDER BY total_sales DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isss", $company_id, $start_date, $end_date, $province);
    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
    $total_sales = 0;
    $total_qty = 0;
    while ($row = $result->fetch_assoc()) {
        $sales = floatval($row['total_sales']);
        $qty = intval($row['total_qty']);
        $total_sales += $sales;
        $total_qty += $qty;
        $products[] = [
            'product_name' => $row['product_name'] ?: 'ไม่ระบุชื่อ',
            'category' => $row['category'],
            'total_qty' => $qty,
            'total_sales' => $sales,
            'order_count' => intval($row['order_count']),
        ];
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => [
            'province' => $province,
            'products' => $products,
            'total_sales' => $total_sales,
            'total_qty' => $total_qty,
            'product_count' => count($products),
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
            'department' => $department,
            'date_range' => ['start' => $start_date, 'end' => $end_date],
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>

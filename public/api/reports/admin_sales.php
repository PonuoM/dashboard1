<?php
/**
 * Admin Page Sales Report API
 * 
 * Parameters:
 * - company_id (required): Company ID to filter data
 * - month (required): Month (1-12)
 * - year (required): Year (e.g., 2026)
 * - include_cancelled (optional): 0 or 1, default 0
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include '../db.php';

// Get parameters
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$include_cancelled = isset($_GET['include_cancelled']) ? intval($_GET['include_cancelled']) : 0;
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

// Validate required parameters
if ($company_id <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'company_id is required'
    ]);
    exit;
}

if ($month < 0 || $month > 12) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid month (must be 0-12, 0 = full year)'
    ]);
    exit;
}

// Calculate date range
if ($month === 0) {
    // Full year
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    // Specific month
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

// Optional explicit date range (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides month/year ถ้ามี
require_once __DIR__ . '/../helpers/date_filter.php';
$__r = resolve_date_range();
if ($__r) {
    $start_date = $__r['start'];
    $end_date = $__r['end_excl'];
}

// Build cancelled filter
$cancelled_filter = $include_cancelled ? "" : "AND o.order_status != 'Cancelled'";

// Build access control filter based on user role
// Admin Page user sees only own data; Admin/other roles see all
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

    if ($user_role === 'Admin Page') {
        $access_filter = " AND u.id = $user_id";
    }
    // Admin and other roles: no filter (see all)
}

try {
    // Query 1: Summary by Product Type for Admin Page role
    $summary_sql = "
        SELECT 
            CASE 
                WHEN p.category LIKE '%ปุ๋ย%' THEN 'fertilizer'
                WHEN p.category = 'ชีวภัณฑ์' THEN 'bio'
                ELSE 'other'
            END AS product_type,
            COUNT(DISTINCT o.id) AS order_count,
            COUNT(DISTINCT o.customer_id) AS customer_count,
            COALESCE(SUM(oi.quantity), 0) AS total_quantity,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
            {$access_filter}
        GROUP BY product_type
        ORDER BY product_type
    ";

    $stmt = $conn->prepare($summary_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $summary_result = $stmt->get_result();
    
    $summary = [];
    while ($row = $summary_result->fetch_assoc()) {
        $summary[] = $row;
    }
    $stmt->close();

    // Query 2: Sales by Admin Page user (single flat list)
    $pivot_sql = "
        SELECT 
            u.id AS user_id,
            u.first_name AS salesperson_name,
            u.role AS role_name,
            COUNT(DISTINCT o.id) AS total_orders,
            COUNT(DISTINCT CASE WHEN p.category LIKE '%ปุ๋ย%' THEN o.id END) AS fertilizer_orders,
            COUNT(DISTINCT CASE WHEN p.category = 'ชีวภัณฑ์' THEN o.id END) AS bio_orders,
            COALESCE(SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' THEN oi.quantity ELSE 0 END), 0) AS fertilizer_qty,
            COALESCE(SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' THEN oi.net_total ELSE 0 END), 0) AS fertilizer_sales,
            COALESCE(SUM(CASE WHEN p.category = 'ชีวภัณฑ์' THEN oi.quantity ELSE 0 END), 0) AS bio_qty,
            COALESCE(SUM(CASE WHEN p.category = 'ชีวภัณฑ์' THEN oi.net_total ELSE 0 END), 0) AS bio_sales,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
            {$access_filter}
        GROUP BY u.id, u.first_name, u.role
        ORDER BY total_sales DESC
    ";

    $stmt = $conn->prepare($pivot_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $pivot_result = $stmt->get_result();
    
    $by_salesperson = [];
    while ($row = $pivot_result->fetch_assoc()) {
        $by_salesperson[] = $row;
    }
    $stmt->close();

    // Query 3: Get previous month sales by admin
    $prev_month = $month - 1;
    $prev_year = $year;
    if ($prev_month == 0) {
        $prev_month = 12;
        $prev_year = $year - 1;
    }
    $prev_start = sprintf('%04d-%02d-01 00:00:00', $prev_year, $prev_month);
    $prev_end = date('Y-m-d 00:00:00', strtotime($prev_start . ' +1 month'));

    $prev_sales = [];
    $prev_sql = "
        SELECT 
            u.id AS user_id,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status != 'Cancelled'
            {$access_filter}
        GROUP BY u.id
    ";
    $stmt = $conn->prepare($prev_sql);
    $stmt->bind_param("iss", $company_id, $prev_start, $prev_end);
    $stmt->execute();
    $prev_result = $stmt->get_result();
    while ($row = $prev_result->fetch_assoc()) {
        $prev_sales[$row['user_id']] = floatval($row['total_sales']);
    }
    $stmt->close();

    // Calculate days in month and days elapsed
    if ($__r) {
        // โหมดช่วงวัน: ใช้จำนวนวันจริงของช่วงที่เลือก
        $days_in_month = max(1, intval((strtotime($end_date) - strtotime($start_date)) / 86400));
        $days_elapsed = $days_in_month;
    } else {
        $days_in_month = intval(date('t', strtotime($start_date)));
        if ($year == date('Y') && $month == date('n')) {
            $days_elapsed = intval(date('j'));
        } else {
            $days_elapsed = $days_in_month;
        }
    }

    // Query 3b: Cancelled orders by user AND cancellation type
    $cancelled_by_type = [];
    $cancelled_amounts = [];
    $baddebt_amounts = [];
    $cancelled_sql = "
        SELECT
            u.id AS user_id,
            o.order_status,
            COALESCE(oc.cancellation_type_id, 0) AS cancel_type_id,
            COALESCE(SUM(oi.net_total), 0) AS cancelled_total,
            COUNT(DISTINCT o.id) AS cancelled_count
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        LEFT JOIN order_cancellations oc ON oc.order_id = o.id
        WHERE
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status IN ('Cancelled', 'BadDebt')
            {$access_filter}
        GROUP BY u.id, o.order_status, oc.cancellation_type_id
    ";
    $stmt = $conn->prepare($cancelled_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $cancelled_result = $stmt->get_result();
        while ($row = $cancelled_result->fetch_assoc()) {
            $uid = $row['user_id'];
            $status = $row['order_status'];
            $tid = intval($row['cancel_type_id']);

            if ($status === 'Cancelled') {
                if (!isset($cancelled_by_type[$uid])) $cancelled_by_type[$uid] = [];
                $cancelled_by_type[$uid][$tid] = [
                    'amount' => floatval($row['cancelled_total']),
                    'count' => intval($row['cancelled_count'])
                ];
                if (!isset($cancelled_amounts[$uid])) $cancelled_amounts[$uid] = 0;
                $cancelled_amounts[$uid] += floatval($row['cancelled_total']);
            } elseif ($status === 'BadDebt') {
                if (!isset($baddebt_amounts[$uid])) $baddebt_amounts[$uid] = 0;
                $baddebt_amounts[$uid] += floatval($row['cancelled_total']);
            }
        }
        $stmt->close();
    }

    // Query 3c: Cancellation types list
    $cancellation_types = [];
    $ct_result = $conn->query("SELECT id, label, description FROM cancellation_types WHERE is_active = 1 ORDER BY sort_order");
    if ($ct_result) {
        while ($row = $ct_result->fetch_assoc()) {
            $cancellation_types[] = $row;
        }
    }

    // Query 3d: Returned amounts by user
    $returned_amounts = [];
    $returned_counts = [];
    $returned_sql = "
        SELECT
            u.id AS user_id,
            COALESCE(SUM(oi.net_total), 0) AS returned_total,
            COUNT(DISTINCT o.id) AS returned_count
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status = 'Returned'
            {$access_filter}
        GROUP BY u.id
    ";
    $stmt = $conn->prepare($returned_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $ret_result = $stmt->get_result();
        while ($row = $ret_result->fetch_assoc()) {
            $returned_amounts[$row['user_id']] = floatval($row['returned_total']);
            $returned_counts[$row['user_id']] = intval($row['returned_count']);
        }
        $stmt->close();
    }

    // Query 3e: Total distinct orders (across all admins) — for SummaryTable consistency
    $total_orders_distinct = 0;
    $totals_sql = "
        SELECT COUNT(DISTINCT o.id) AS total_orders
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE
            o.company_id = ?
            AND u.role NOT IN ('Telesale','Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
            {$access_filter}
    ";
    $stmt = $conn->prepare($totals_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $totals_result = $stmt->get_result();
        if ($row = $totals_result->fetch_assoc()) {
            $total_orders_distinct = intval($row['total_orders']);
        }
        $stmt->close();
    }

    // Merge prev_month_sales + cancelled/returned/baddebt into by_salesperson
    foreach ($by_salesperson as &$person) {
        $uid = $person['user_id'];
        $person['target_amount'] = null; // No targets for Admin Page
        $person['prev_month_sales'] = isset($prev_sales[$uid]) ? $prev_sales[$uid] : 0;
        $person['cancelled_amount'] = isset($cancelled_amounts[$uid]) ? $cancelled_amounts[$uid] : 0;
        $person['baddebt_amount'] = isset($baddebt_amounts[$uid]) ? $baddebt_amounts[$uid] : 0;
        $person['returned_amount'] = isset($returned_amounts[$uid]) ? $returned_amounts[$uid] : 0;
        $person['returned_count'] = isset($returned_counts[$uid]) ? $returned_counts[$uid] : 0;
        $person['cancelled_by_type'] = isset($cancelled_by_type[$uid]) ? $cancelled_by_type[$uid] : new \stdClass();
        // supervisor_id = null because Admin Page has no hierarchy
        $person['supervisor_id'] = null;
    }
    unset($person);

    // Query 4: Sales by Platform
    $platform_sql = "
        SELECT 
            COALESCE(pg.platform, 'ไม่ระบุ') AS platform_name,
            COUNT(DISTINCT o.id) AS order_count,
            COUNT(DISTINCT o.customer_id) AS customer_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        LEFT JOIN pages pg ON o.sales_channel_page_id = pg.id
        WHERE 
            o.company_id = ?
            AND u.role = 'Admin Page'
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
        GROUP BY pg.platform
        ORDER BY total_sales DESC
    ";
    
    $by_platform = [];
    $stmt = $conn->prepare($platform_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $platform_result = $stmt->get_result();
        while ($row = $platform_result->fetch_assoc()) {
            $by_platform[] = $row;
        }
        $stmt->close();
    }

    // Query 5: Sales by Page
    $page_sql = "
        SELECT 
            COALESCE(pg.name, 'ไม่ระบุ') AS page_name,
            COALESCE(pg.platform, 'ไม่ระบุ') AS platform_name,
            COUNT(DISTINCT o.id) AS order_count,
            COUNT(DISTINCT o.customer_id) AS customer_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        LEFT JOIN pages pg ON o.sales_channel_page_id = pg.id
        WHERE 
            o.company_id = ?
            AND u.role = 'Admin Page'
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
        GROUP BY pg.id, pg.name, pg.platform
        ORDER BY total_sales DESC
    ";
    
    $by_page = [];
    $stmt = $conn->prepare($page_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $page_result = $stmt->get_result();
        while ($row = $page_result->fetch_assoc()) {
            $by_page[] = $row;
        }
        $stmt->close();
    }

    // Return response
    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => $summary,
            'by_salesperson' => $by_salesperson,
            'by_platform' => $by_platform,
            'by_page' => $by_page,
            'total_orders_distinct' => $total_orders_distinct,
            'cancellation_types' => $cancellation_types
        ],
        'meta' => [
            'days_in_month' => $days_in_month,
            'days_elapsed' => $days_elapsed,
            'prev_month' => $prev_month,
            'prev_year' => $prev_year
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
            'include_cancelled' => $include_cancelled,
            'date_range' => [
                'start' => $start_date,
                'end' => $end_date
            ]
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>

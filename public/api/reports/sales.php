<?php
/**
 * Sales Report API
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
if ($__r) { $start_date = $__r['start']; $end_date = $__r['end_excl']; }

// Build cancelled filter
// Returned is NOT filtered because it counts as shipped; only Cancelled/BadDebt are filtered
$cancelled_filter = $include_cancelled ? "" : "AND o.order_status NOT IN ('Cancelled', 'BadDebt')";

// Build access control filter based on user role
// Note: access_filter uses u.id which now references oi.creator_id -> users
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
        $access_filter = " AND u.id IN ($ids_str)";
    } elseif ($user_role === 'Telesale') {
        $access_filter = " AND u.id = $user_id";
        $allowed_user_ids[] = $user_id;
    }
    // Admin or other roles: no filter (see all)
}

try {
    // Query 1: Summary by Product Type
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
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status != 'Returned'
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

    // Query 2: Pivot by Salesperson
    $pivot_sql = "
        SELECT 
            u.id AS user_id,
            u.first_name AS salesperson_name,
            u.role AS role_name,
            u.supervisor_id,
            COALESCE(SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' AND o.order_status != 'Returned' THEN oi.quantity ELSE 0 END), 0) AS fertilizer_qty,
            COALESCE(SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' AND o.order_status != 'Returned' THEN oi.net_total ELSE 0 END), 0) AS fertilizer_sales,
            COUNT(DISTINCT CASE WHEN p.category LIKE '%ปุ๋ย%' AND o.order_status != 'Returned' THEN o.id END) AS fertilizer_orders,
            COALESCE(SUM(CASE WHEN p.category = 'ชีวภัณฑ์' AND o.order_status != 'Returned' THEN oi.quantity ELSE 0 END), 0) AS bio_qty,
            COALESCE(SUM(CASE WHEN p.category = 'ชีวภัณฑ์' AND o.order_status != 'Returned' THEN oi.net_total ELSE 0 END), 0) AS bio_sales,
            COUNT(DISTINCT CASE WHEN p.category = 'ชีวภัณฑ์' AND o.order_status != 'Returned' THEN o.id END) AS bio_orders,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COUNT(DISTINCT o.id) AS total_orders
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
            {$access_filter}
        GROUP BY u.id, u.first_name, u.role, u.supervisor_id
        ORDER BY total_sales DESC
    ";

    $stmt = $conn->prepare($pivot_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $pivot_result = $stmt->get_result();
    
    $by_salesperson = [];
    $seen_user_ids = [];
    while ($row = $pivot_result->fetch_assoc()) {
        $by_salesperson[] = $row;
        $seen_user_ids[intval($row['user_id'])] = true;
    }
    $stmt->close();

    // Query 2b: Add active salespersons who have no sales in this period
    // (so they still appear in the report with zero values).
    // Inactive users with sales are already included via the pivot above.
    $active_sql = "
        SELECT id AS user_id, first_name AS salesperson_name, role AS role_name, supervisor_id
        FROM users
        WHERE company_id = ?
          AND role IN ('Telesale', 'Supervisor Telesale')
          AND status = 'active'
    ";
    if (!empty($allowed_user_ids)) {
        $ids_str = implode(',', $allowed_user_ids);
        $active_sql .= " AND id IN ($ids_str)";
    }
    $stmt = $conn->prepare($active_sql);
    if ($stmt) {
        $stmt->bind_param("i", $company_id);
        $stmt->execute();
        $active_result = $stmt->get_result();
        while ($row = $active_result->fetch_assoc()) {
            $uid = intval($row['user_id']);
            if (isset($seen_user_ids[$uid])) continue;
            $by_salesperson[] = [
                'user_id' => $uid,
                'salesperson_name' => $row['salesperson_name'],
                'role_name' => $row['role_name'],
                'supervisor_id' => $row['supervisor_id'],
                'fertilizer_qty' => 0,
                'fertilizer_sales' => 0,
                'fertilizer_orders' => 0,
                'bio_qty' => 0,
                'bio_sales' => 0,
                'bio_orders' => 0,
                'total_sales' => 0,
                'total_orders' => 0,
            ];
        }
        $stmt->close();
    }

    // Query 3: Get targets for current month/year
    $targets = [];
    $target_sql = "SELECT user_id, target_amount FROM sales_targets WHERE month = ? AND year = ?";
    $stmt = $conn->prepare($target_sql);
    $stmt->bind_param("ii", $month, $year);
    $stmt->execute();
    $target_result = $stmt->get_result();
    while ($row = $target_result->fetch_assoc()) {
        $targets[$row['user_id']] = floatval($row['target_amount']);
    }
    $stmt->close();

    // Query 4: Get previous month sales by salesperson
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
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status NOT IN ('Cancelled', 'Returned', 'BadDebt')
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

    // Query 5: Get cancelled order amounts by salesperson AND cancellation type for current month
    $cancelled_by_type = []; // user_id => [ type_id => { amount, count } ]
    $cancelled_amounts = []; // user_id => total
    $baddebt_amounts = []; // user_id => total
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
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status IN ('Cancelled', 'BadDebt')
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

    // Query 5b: Get cancellation types list
    $cancellation_types = [];
    $ct_result = $conn->query("SELECT id, label, description FROM cancellation_types WHERE is_active = 1 ORDER BY sort_order");
    if ($ct_result) {
        while ($row = $ct_result->fetch_assoc()) {
            $cancellation_types[] = $row;
        }
    }

    // Query 5c: Get returned amounts by salesperson
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
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND o.order_status = 'Returned'
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

    // Calculate days in month and days elapsed
    $days_in_month = intval(date('t', strtotime($start_date)));
    $today = date('Y-m-d');
    $month_end = date('Y-m-d', strtotime($end_date . ' -1 day'));
    
    // If viewing current month, use today's date; otherwise use full month
    if ($year == date('Y') && $month == date('n')) {
        $days_elapsed = intval(date('j')); // Current day of month
    } else {
        $days_elapsed = $days_in_month; // Full month for past months
    }

    // Merge target, prev_month_sales, cancelled_amount, and cancelled_by_type into by_salesperson
    foreach ($by_salesperson as &$person) {
        $uid = $person['user_id'];
        $person['target_amount'] = isset($targets[$uid]) ? $targets[$uid] : null;
        $person['prev_month_sales'] = isset($prev_sales[$uid]) ? $prev_sales[$uid] : 0;
        $person['cancelled_amount'] = isset($cancelled_amounts[$uid]) ? $cancelled_amounts[$uid] : 0;
        $person['baddebt_amount'] = isset($baddebt_amounts[$uid]) ? $baddebt_amounts[$uid] : 0;
        $person['returned_amount'] = isset($returned_amounts[$uid]) ? $returned_amounts[$uid] : 0;
        $person['returned_count'] = isset($returned_counts[$uid]) ? $returned_counts[$uid] : 0;
        $person['cancelled_by_type'] = isset($cancelled_by_type[$uid]) ? $cancelled_by_type[$uid] : new \stdClass();
    }

    // Query 6: Get total distinct orders (to avoid double-counting)
    $total_orders_sql = "
        SELECT COUNT(DISTINCT o.id) AS total_orders
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND u.role IN ('Telesale', 'Supervisor Telesale')
            AND o.order_date >= ?
            AND o.order_date < ?
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            {$cancelled_filter}
            {$access_filter}
    ";
    $total_orders_distinct = 0;
    $stmt = $conn->prepare($total_orders_sql);
    if ($stmt) {
        $stmt->bind_param("iss", $company_id, $start_date, $end_date);
        $stmt->execute();
        $total_orders_result = $stmt->get_result();
        if ($row = $total_orders_result->fetch_assoc()) {
            $total_orders_distinct = intval($row['total_orders']);
        }
        $stmt->close();
    }

    // Return response
    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => $summary,
            'by_salesperson' => $by_salesperson,
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

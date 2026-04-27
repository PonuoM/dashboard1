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

// Build cancelled filter
$cancelled_filter = $include_cancelled ? "" : "AND o.order_status != 'Cancelled'";

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
    $days_in_month = intval(date('t', strtotime($start_date)));
    
    if ($year == date('Y') && $month == date('n')) {
        $days_elapsed = intval(date('j'));
    } else {
        $days_elapsed = $days_in_month;
    }

    // Merge prev_month_sales into by_salesperson
    foreach ($by_salesperson as &$person) {
        $uid = $person['user_id'];
        $person['target_amount'] = null; // No targets for Admin Page
        $person['prev_month_sales'] = isset($prev_sales[$uid]) ? $prev_sales[$uid] : 0;
        $person['cancelled_amount'] = 0;
    }

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
            'by_page' => $by_page
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

<?php
/**
 * Individual Sales Report API
 * 
 * Shows sales data for a selected user with breakdowns by
 * daily/monthly, platform, channel, and product.
 * 
 * Parameters:
 * - company_id (required): Company ID
 * - month (required): Month (0=full year, 1-12)
 * - year (required): Year
 * - selected_user_id (optional): filter to specific user
 * - view (optional): 'daily' or 'monthly' (default: daily)
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include '../db.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$selected_user_id = isset($_GET['selected_user_id']) ? intval($_GET['selected_user_id']) : 0;
$view = isset($_GET['view']) ? $_GET['view'] : 'daily';

if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}

// Date range depends on view mode
if ($view === 'monthly') {
    // Full year view
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    // Daily view: specific month
    if ($month === 0) { $month = intval(date('n')); }
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

// User filter
$user_filter = "";
if ($selected_user_id > 0) {
    $user_filter = " AND u.id = $selected_user_id";
}

require_once __DIR__ . '/../helpers/product_names.php';


try {
    // =============================================
    // 1. User list (all users with any sales this year)
    // =============================================
    $year_start = sprintf('%04d-01-01 00:00:00', $year);
    $year_end = sprintf('%04d-01-01 00:00:00', $year + 1);
    $users_sql = "
        SELECT DISTINCT
            u.id AS user_id,
            u.first_name,
            u.role
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON o.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
        ORDER BY u.first_name
    ";
    $stmt = $conn->prepare($users_sql);
    $stmt->bind_param("iss", $company_id, $year_start, $year_end);
    $stmt->execute();
    $result = $stmt->get_result();
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $stmt->close();

    // =============================================
    // 2. Time-series sales data (daily or monthly)
    // =============================================
    if ($view === 'monthly') {
        $timeseries_sql = "
            SELECT 
                MONTH(o.order_date) AS period,
                DATE_FORMAT(o.order_date, '%Y-%m') AS period_label,
                COUNT(DISTINCT o.id) AS order_count,
                COUNT(DISTINCT o.customer_id) AS customer_count,
                COALESCE(SUM(oi.net_total), 0) AS total_sales
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON o.creator_id = u.id
            WHERE 
                o.company_id = ?
                AND o.order_date >= ?
                AND o.order_date < ?
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
                $user_filter
            GROUP BY MONTH(o.order_date), DATE_FORMAT(o.order_date, '%Y-%m')
            ORDER BY period
        ";
    } else {
        $timeseries_sql = "
            SELECT 
                DAY(o.order_date) AS period,
                DATE(o.order_date) AS period_label,
                COUNT(DISTINCT o.id) AS order_count,
                COUNT(DISTINCT o.customer_id) AS customer_count,
                COALESCE(SUM(oi.net_total), 0) AS total_sales
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON o.creator_id = u.id
            WHERE 
                o.company_id = ?
                AND o.order_date >= ?
                AND o.order_date < ?
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
                $user_filter
            GROUP BY DAY(o.order_date), DATE(o.order_date)
            ORDER BY period
        ";
    }
    $stmt = $conn->prepare($timeseries_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $timeseries = [];
    while ($row = $result->fetch_assoc()) {
        $timeseries[] = $row;
    }
    $stmt->close();

    // =============================================
    // 3. Summary totals for selected period+user
    // =============================================
    $summary_sql = "
        SELECT 
            COUNT(DISTINCT o.id) AS total_orders,
            COUNT(DISTINCT o.customer_id) AS total_customers,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COALESCE(SUM(oi.quantity), 0) AS total_quantity
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON o.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $user_filter
    ";
    $stmt = $conn->prepare($summary_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $summary = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // =============================================
    // 4. Platform breakdown
    // =============================================
    $platform_sql = "
        SELECT 
            COALESCE(pg.platform, 'ไม่ระบุ') AS platform,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON o.creator_id = u.id
        LEFT JOIN pages pg ON o.sales_channel_page_id = pg.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $user_filter
        GROUP BY pg.platform
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($platform_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $by_platform = [];
    while ($row = $result->fetch_assoc()) { $by_platform[] = $row; }
    $stmt->close();

    // =============================================
    // 5. Channel breakdown
    // =============================================
    $channel_sql = "
        SELECT 
            COALESCE(NULLIF(o.sales_channel, ''), 'ไม่ระบุ') AS channel,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON o.creator_id = u.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $user_filter
        GROUP BY channel
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($channel_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $by_channel = [];
    while ($row = $result->fetch_assoc()) { $by_channel[] = $row; }
    $stmt->close();

    // =============================================
    // 6. Product breakdown
    // =============================================
    $product_sql = "
        SELECT 
            p.id AS product_id,
            p.name AS product_name,
            p.category AS product_category,
            SUM(oi.quantity) AS total_quantity,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON o.creator_id = u.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $user_filter
        GROUP BY p.id, p.name, p.category
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($product_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $by_product = [];
    while ($row = $result->fetch_assoc()) {
        $by_product[] = [
            'product_id' => $row['product_id'],
            'product_name' => shorten_product_name($row['product_name']),
            'product_category' => $row['product_category'],
            'quantity' => intval($row['total_quantity']),
            'sales' => floatval($row['total_sales'])
        ];
    }
    $stmt->close();

    // =============================================
    // 7. Product × Time pivot data
    // =============================================
    if ($view === 'monthly') {
        $pivot_sql = "
            SELECT 
                MONTH(o.order_date) AS period,
                p.id AS product_id,
                p.name AS product_name,
                COALESCE(SUM(oi.net_total), 0) AS total_sales,
                SUM(oi.quantity) AS total_quantity
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON o.creator_id = u.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE 
                o.company_id = ?
                AND o.order_date >= ?
                AND o.order_date < ?
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
                $user_filter
            GROUP BY MONTH(o.order_date), p.id, p.name
            ORDER BY period, total_sales DESC
        ";
    } else {
        $pivot_sql = "
            SELECT 
                DAY(o.order_date) AS period,
                p.id AS product_id,
                p.name AS product_name,
                COALESCE(SUM(oi.net_total), 0) AS total_sales,
                SUM(oi.quantity) AS total_quantity
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON o.creator_id = u.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE 
                o.company_id = ?
                AND o.order_date >= ?
                AND o.order_date < ?
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
                $user_filter
            GROUP BY DAY(o.order_date), p.id, p.name
            ORDER BY period, total_sales DESC
        ";
    }
    $stmt = $conn->prepare($pivot_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $product_timeseries = [];
    while ($row = $result->fetch_assoc()) {
        $product_timeseries[] = [
            'period' => intval($row['period']),
            'product_id' => $row['product_id'],
            'product_name' => shorten_product_name($row['product_name']),
            'sales' => floatval($row['total_sales']),
            'quantity' => intval($row['total_quantity'])
        ];
    }
    $stmt->close();

    // =============================================
    // Response
    // =============================================
    echo json_encode([
        'success' => true,
        'data' => [
            'users' => $users,
            'summary' => $summary,
            'timeseries' => $timeseries,
            'by_platform' => $by_platform,
            'by_channel' => $by_channel,
            'by_product' => $by_product,
            'product_timeseries' => $product_timeseries
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
            'view' => $view,
            'selected_user_id' => $selected_user_id,
            'date_range' => ['start' => $start_date, 'end' => $end_date]
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

<?php
/**
 * Dashboard Overview API
 * Returns summary data for company dashboard
 */

require_once __DIR__ . '/../helpers/product_names.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../db.php';

// Get parameters
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');

// Validate
if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}

// Calculate date range
if ($month === 0) {
    // Full year
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

try {
    // =============================================
    // 1. Summary totals
    // =============================================
    $summary_sql = "
        SELECT 
            COUNT(DISTINCT o.id) AS total_orders,
            COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COUNT(DISTINCT o.customer_id) AS total_customers
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
    ";
    $stmt = $conn->prepare($summary_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $summary = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // =============================================
    // 2. Sales by Department (role-based)
    // =============================================
    $dept_sql = "
        SELECT 
            CASE 
                WHEN u.role IN ('Telesale', 'Supervisor Telesale') THEN 'Telesale'
                WHEN u.role = 'Admin Page' THEN 'Admin Page'
                ELSE 'Others'
            END AS department,
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
        GROUP BY department
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($dept_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $dept_result = $stmt->get_result();
    $by_department = [];
    while ($row = $dept_result->fetch_assoc()) {
        $by_department[] = $row;
    }
    $stmt->close();

    // =============================================
    // 2.5 Department Product Details (for drill-down)
    // =============================================
    $dept_detail_sql = "
        SELECT 
            CASE 
                WHEN u.role IN ('Telesale', 'Supervisor Telesale') THEN 'Telesale'
                WHEN u.role = 'Admin Page' THEN 'Admin Page'
                ELSE 'Others'
            END AS department,
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
        GROUP BY department, p.id, p.name, p.category
        ORDER BY department, total_sales DESC
    ";
    $stmt = $conn->prepare($dept_detail_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $dept_detail_result = $stmt->get_result();
    $department_details = [];
    while ($row = $dept_detail_result->fetch_assoc()) {
        $dept = $row['department'];
        if (!isset($department_details[$dept])) {
            $department_details[$dept] = [];
        }
        $department_details[$dept][] = [
            'product_id' => $row['product_id'],
            'product_name' => shorten_product_name($row['product_name']),
            'product_category' => $row['product_category'],
            'quantity' => intval($row['total_quantity']),
            'sales' => floatval($row['total_sales'])
        ];
    }
    $stmt->close();

    // =============================================
    // 3. Sales by Channel
    // =============================================
    $channel_sql = "
        SELECT 
            COALESCE(NULLIF(o.sales_channel, ''), 'ไม่ระบุ') AS channel,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY channel
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($channel_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $channel_result = $stmt->get_result();
    $by_channel = [];
    while ($row = $channel_result->fetch_assoc()) {
        $by_channel[] = $row;
    }
    $stmt->close();

    // =============================================
    // 3.5 Sales by Product Category
    // =============================================
    $category_sql = "
        SELECT 
            CASE 
                WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
                WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
                ELSE 'อื่นๆ'
            END AS category_name,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY category_name
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($category_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $category_result = $stmt->get_result();
    $by_category = [];
    while ($row = $category_result->fetch_assoc()) {
        $by_category[] = $row;
    }
    $stmt->close();

    // =============================================
    // 3.6 Category Product Details (for modal)
    // =============================================
    $cat_detail_sql = "
        SELECT 
            CASE 
                WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย'
                WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์'
                ELSE 'อื่นๆ'
            END AS category_name,
            p.id AS product_id,
            p.name AS product_name,
            p.category AS original_category,
            SUM(oi.quantity) AS total_quantity,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY category_name, p.id, p.name, p.category
        ORDER BY category_name, total_sales DESC
    ";
    $stmt = $conn->prepare($cat_detail_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $cat_detail_result = $stmt->get_result();
    $category_details = [];
    while ($row = $cat_detail_result->fetch_assoc()) {
        $cat = $row['category_name'];
        if (!isset($category_details[$cat])) {
            $category_details[$cat] = [];
        }
        $category_details[$cat][] = [
            'product_id' => $row['product_id'],
            'product_name' => shorten_product_name($row['product_name']),
            'original_category' => $row['original_category'],
            'quantity' => intval($row['total_quantity']),
            'sales' => floatval($row['total_sales'])
        ];
    }
    $stmt->close();

    // (Region and Province queries removed — moved to RegionalSales page)
    // =============================================
    // 6. Previous Month Summary (for growth calculation)
    // =============================================
    $prev_summary = ['total_sales' => 0, 'total_orders' => 0, 'total_customers' => 0];
    
    if ($month > 0) {
        // Calculate previous month
        $prev_month = $month - 1;
        $prev_year = $year;
        if ($prev_month == 0) {
            $prev_month = 12;
            $prev_year = $year - 1;
        }
        $prev_start = sprintf('%04d-%02d-01 00:00:00', $prev_year, $prev_month);
        $prev_end = date('Y-m-d 00:00:00', strtotime($prev_start . ' +1 month'));
        
        $prev_sql = "
            SELECT 
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(oi.net_total), 0) AS total_sales,
                COUNT(DISTINCT o.customer_id) AS total_customers
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE 
                o.company_id = ?
                AND o.order_date >= ?
                AND o.order_date < ?
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        ";
        $stmt = $conn->prepare($prev_sql);
        if ($stmt) {
            $stmt->bind_param("iss", $company_id, $prev_start, $prev_end);
            $stmt->execute();
            $prev_summary = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        }
    }

    // =============================================
    // 7. Monthly Sales (12 months for the selected year)
    // =============================================
    $monthly_sql = "
        SELECT 
            MONTH(o.order_date) AS month_num,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE 
            o.company_id = ?
            AND YEAR(o.order_date) = ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
        GROUP BY MONTH(o.order_date)
        ORDER BY month_num
    ";
    $stmt = $conn->prepare($monthly_sql);
    $stmt->bind_param("ii", $company_id, $year);
    $stmt->execute();
    $monthly_result = $stmt->get_result();
    
    // Initialize all 12 months with 0
    $monthly_sales = [];
    for ($m = 1; $m <= 12; $m++) {
        $monthly_sales[$m] = ['month' => $m, 'order_count' => 0, 'total_sales' => 0];
    }
    // Fill in actual data
    while ($row = $monthly_result->fetch_assoc()) {
        $m = intval($row['month_num']);
        $monthly_sales[$m] = [
            'month' => $m,
            'order_count' => intval($row['order_count']),
            'total_sales' => floatval($row['total_sales'])
        ];
    }
    $stmt->close();
    
    // Convert to indexed array
    $monthly_sales = array_values($monthly_sales);

    // Return response
    echo json_encode([
        'success' => true,
        'data' => [
            'summary' => $summary,
            'prev_summary' => $prev_summary,
            'monthly_sales' => $monthly_sales,
            'by_department' => $by_department,
            'department_details' => $department_details,
            'by_channel' => $by_channel,
            'by_category' => $by_category,
            'category_details' => $category_details
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
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

<?php
/**
 * Regional Sales API - Detailed Province Breakdown
 * Returns sales data per province with customer types, product categories, and channels
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../db.php';

// Get parameters
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$department = isset($_GET['department']) ? $_GET['department'] : 'all';
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

// Validate
if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
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
    // Main query - Province breakdown with all metrics
    $sql = "
        SELECT 
            COALESCE(ap.name_th, c.province) AS province_name,
            ag.name AS region_name,
            COUNT(DISTINCT o.id) AS order_count,
            
            -- New vs Reorder customers (simplified: check if customer has orders before this period)
            COALESCE(SUM(CASE 
                WHEN (SELECT COUNT(*) FROM orders o2 
                      WHERE o2.customer_id = o.customer_id 
                      AND o2.company_id = o.company_id
                      AND o2.order_date < ? 
                      AND o2.order_status != 'Cancelled') = 0 
                THEN oi.net_total ELSE 0 END), 0) AS new_customer_sales,
            COALESCE(SUM(CASE 
                WHEN (SELECT COUNT(*) FROM orders o2 
                      WHERE o2.customer_id = o.customer_id 
                      AND o2.company_id = o.company_id
                      AND o2.order_date < ? 
                      AND o2.order_status != 'Cancelled') > 0 
                THEN oi.net_total ELSE 0 END), 0) AS reorder_customer_sales,
            
            -- Product categories
            COALESCE(SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' THEN oi.net_total ELSE 0 END), 0) AS fertilizer_sales,
            COALESCE(SUM(CASE WHEN p.category = 'ชีวภัณฑ์' THEN oi.net_total ELSE 0 END), 0) AS bio_sales,
            COALESCE(SUM(CASE WHEN p.category NOT LIKE '%ปุ๋ย%' AND p.category != 'ชีวภัณฑ์' THEN oi.net_total ELSE 0 END), 0) AS other_category_sales,
            
            -- Sales channels
            COALESCE(SUM(CASE WHEN LOWER(o.sales_channel) LIKE '%phone%' OR LOWER(o.sales_channel) LIKE '%โทร%' THEN oi.net_total ELSE 0 END), 0) AS channel_phone,
            COALESCE(SUM(CASE WHEN LOWER(o.sales_channel) LIKE '%facebook%' OR LOWER(o.sales_channel) LIKE '%fb%' OR LOWER(o.sales_channel) LIKE '%เฟส%' THEN oi.net_total ELSE 0 END), 0) AS channel_facebook,
            COALESCE(SUM(CASE WHEN LOWER(o.sales_channel) LIKE '%line%' OR LOWER(o.sales_channel) LIKE '%ไลน์%' THEN oi.net_total ELSE 0 END), 0) AS channel_line,
            COALESCE(SUM(CASE WHEN LOWER(o.sales_channel) LIKE '%tiktok%' OR LOWER(o.sales_channel) LIKE '%ติ๊กต๊อก%' THEN oi.net_total ELSE 0 END), 0) AS channel_tiktok,
            
            -- Total sales
            COALESCE(SUM(oi.net_total), 0) AS total_sales
            
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN users u ON o.creator_id = u.id
        LEFT JOIN address_provinces ap ON (c.province = ap.name_en OR c.province = ap.name_th)
        LEFT JOIN address_geographies ag ON ap.geography_id = ag.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND c.province IS NOT NULL 
            AND c.province != ''
            $dept_condition
            $access_filter
        GROUP BY province_name, region_name
        ORDER BY total_sales DESC
    ";
    
    $stmt = $conn->prepare($sql);
    // Bind: start_date (for new customer check), start_date (for reorder check), company_id, start_date, end_date
    $stmt->bind_param("ssiss", $start_date, $start_date, $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $provinces = [];
    while ($row = $result->fetch_assoc()) {
        // Calculate channel_other as total minus known channels
        $known_channels = floatval($row['channel_phone']) + floatval($row['channel_facebook']) + 
                         floatval($row['channel_line']) + floatval($row['channel_tiktok']);
        $channel_other = floatval($row['total_sales']) - $known_channels;
        if ($channel_other < 0) $channel_other = 0;
        
        $provinces[] = [
            'province_name' => $row['province_name'],
            'region_name' => $row['region_name'],
            'order_count' => intval($row['order_count']),
            'new_customer_sales' => floatval($row['new_customer_sales']),
            'reorder_customer_sales' => floatval($row['reorder_customer_sales']),
            'fertilizer_sales' => floatval($row['fertilizer_sales']),
            'bio_sales' => floatval($row['bio_sales']),
            'other_category_sales' => floatval($row['other_category_sales']),
            'total_sales' => floatval($row['total_sales']),
            'channels' => [
                'phone' => floatval($row['channel_phone']),
                'facebook' => floatval($row['channel_facebook']),
                'line' => floatval($row['channel_line']),
                'tiktok' => floatval($row['channel_tiktok']),
                'other' => $channel_other
            ]
        ];
    }
    $stmt->close();
    
    // Also get region totals
    $region_sql = "
        SELECT 
            ag.name AS region_name,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN users u ON o.creator_id = u.id
        LEFT JOIN address_provinces ap ON (c.province = ap.name_en OR c.province = ap.name_th)
        LEFT JOIN address_geographies ag ON ap.geography_id = ag.id
        WHERE 
            o.company_id = ?
            AND o.order_date >= ?
            AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $dept_condition
            $access_filter
        GROUP BY ag.id, ag.name
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($region_sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $region_result = $stmt->get_result();
    $regions = [];
    while ($row = $region_result->fetch_assoc()) {
        $regions[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => [
            'provinces' => $provinces,
            'regions' => $regions
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
            'department' => $department,
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

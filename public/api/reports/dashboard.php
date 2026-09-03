<?php
/**
 * Dashboard Overview API
 * Returns summary data for company dashboard
 */

require_once __DIR__ . '/../helpers/product_names.php';
require_once __DIR__ . '/../helpers/sales_buckets.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../db.php';

// Get parameters
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month_param = isset($_GET['month']) ? $_GET['month'] : strval(date('n'));
$year_param = isset($_GET['year']) ? $_GET['year'] : strval(date('Y'));
$salesperson_id = isset($_GET['salesperson_id']) ? intval($_GET['salesperson_id']) : 0;

// Validate
if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}

// Calculate date range for multi-select
$months = array_filter(array_map('intval', explode(',', $month_param)));
$years = array_filter(array_map('intval', explode(',', $year_param)));

if (empty($years)) {
    $years = [intval(date('Y'))];
}
$year_in = implode(',', $years);

if (empty($months) || in_array(0, $months)) {
    $is_all_year = true;
    $date_condition = "YEAR(o.order_date) IN ($year_in)";
} else {
    $is_all_year = false;
    $month_in = implode(',', $months);
    $date_condition = "YEAR(o.order_date) IN ($year_in) AND MONTH(o.order_date) IN ($month_in)";
}

// Optional explicit date range (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides ปี/เดือน ถ้ามี
require_once __DIR__ . '/../helpers/date_filter.php';
$__r = resolve_date_range();
if ($__r) {
    $date_condition = "o.order_date >= '{$__r['start']}' AND o.order_date < '{$__r['end_excl']}'";
    $is_all_year = false;
    // ให้กราฟยอดขายรายเดือนอิงปีของช่วงที่เลือก
    $years = [intval(substr($__r['start'], 0, 4))];
    $year_in = implode(',', $years);
}

// Viewer-based access control — resolve role server-side from user_id
// Telesale / Admin Page: forced to own data
// Supervisor Telesale: own data by default; may pick a subordinate via salesperson_id
// Admin Control / others: unrestricted (salesperson_id honored as-is)
$viewer_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$team_members = null;
if ($viewer_id > 0) {
    $role_stmt = $conn->prepare("SELECT role, first_name FROM users WHERE id = ?");
    $role_stmt->bind_param('i', $viewer_id);
    $role_stmt->execute();
    $viewer = $role_stmt->get_result()->fetch_assoc();
    $role_stmt->close();
    $viewer_role = strtolower($viewer['role'] ?? '');

    if ($viewer_role === 'telesale' || $viewer_role === 'admin page') {
        $salesperson_id = $viewer_id;
    } elseif ($viewer_role === 'supervisor telesale') {
        $team_members = [['id' => $viewer_id, 'name' => $viewer['first_name'] ?? '', 'is_self' => true]];
        $allowed_ids = [$viewer_id];
        $sub_stmt = $conn->prepare("SELECT id, first_name FROM users WHERE supervisor_id = ? AND (status IS NULL OR status = 'active')");
        $sub_stmt->bind_param('i', $viewer_id);
        $sub_stmt->execute();
        $sub_result = $sub_stmt->get_result();
        while ($sub_row = $sub_result->fetch_assoc()) {
            $allowed_ids[] = intval($sub_row['id']);
            $team_members[] = ['id' => intval($sub_row['id']), 'name' => $sub_row['first_name'], 'is_self' => false];
        }
        $sub_stmt->close();
        // Only allow viewing self or a direct subordinate; default to self
        if (!in_array($salesperson_id, $allowed_ids)) {
            $salesperson_id = $viewer_id;
        }
    }
    // Admin Control / other roles: no restriction
}

// Salesperson filter — filter by oi.creator_id (item-level seller)
$salesperson_condition = "";
if ($salesperson_id > 0) {
    $salesperson_condition = "AND COALESCE(oi.creator_id, o.creator_id) = $salesperson_id";
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
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
    ";
    $stmt = $conn->prepare($summary_sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $summary = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // =============================================
    // 1.5 Overall Status Summary
    // =============================================
    $overall_status_sql = "
        SELECT 
            o.order_status,
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(oi.net_total), 0) AS total_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        WHERE 
            o.company_id = ?
            AND $date_condition
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY o.order_status
        ORDER BY order_count DESC
    ";
    $stmt = $conn->prepare($overall_status_sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $status_result = $stmt->get_result();
    $overall_status_summary = [];
    while ($row = $status_result->fetch_assoc()) {
        $overall_status_summary[] = [
            'status' => $row['order_status'],
            'order_count' => intval($row['order_count']),
            'total_sales' => floatval($row['total_sales'])
        ];
    }
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
        INNER JOIN users u ON COALESCE(oi.creator_id, o.creator_id) = u.id
        WHERE 
            o.company_id = ?
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY department
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($dept_sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $dept_result = $stmt->get_result();
    $by_department = [];
    while ($row = $dept_result->fetch_assoc()) {
        $by_department[] = $row;
    }
    $stmt->close();

    // =============================================
    // 2.5 Department Product Details (with Status Breakdown)
    //
    // ใช้ sales_buckets helper ชุดเดียวกับตารางรายบุคคล (section 2.6)
    // เพื่อให้ยอด สำเร็จ/ตีกลับ/อื่นๆ ของสองตารางนี้นิยามตรงกัน
    // =============================================
    $box_join_dd    = sales_box_join();
    $b_dd_delivered = sales_bucket('delivered');
    $b_dd_returned  = sales_bucket('returned');
    // ตารางนี้มีแค่ 3 คอลัมน์ และ total_sales รวมทุกสถานะที่ไม่ใช่ Cancelled
    // จึงต้องให้ อื่นๆ เป็นถังรองรับที่เหลือทั้งหมด (รวม BadDebt ที่ไม่มีคอลัมน์ของตัวเอง)
    // กันกล่อง CANCELLED ออกด้วย ไม่งั้นชิ้นที่ยกเลิกกล่องจะไปโผล่จำนวนในอื่นๆ
    // เพื่อให้ สำเร็จ + ตีกลับ + อื่นๆ = total_sales เสมอ
    $b_dd_other     = "(NOT $b_dd_delivered AND NOT $b_dd_returned AND UPPER(COALESCE(obx.status, '')) <> 'CANCELLED')";
    $item_net_dd    = sales_box_net_amount();
    // ตีกลับไม่สเกลตาม waive ส่วนสำเร็จ/อื่นๆ สเกล — total ต้องเป็นผลรวมชุดเดียวกัน
    // กล่อง CANCELLED ไม่อยู่ในสามคอลัมน์นี้ จึงไม่นับใน total ด้วย
    $not_box_cancel = "UPPER(COALESCE(obx.status, '')) <> 'CANCELLED'";
    $item_total_dd  = "(CASE WHEN $b_dd_returned THEN COALESCE(oi.net_total, 0) ELSE $item_net_dd END)";

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
            SUM(CASE WHEN $not_box_cancel THEN oi.quantity ELSE 0 END) AS total_quantity,
            COALESCE(SUM(CASE WHEN $not_box_cancel THEN $item_total_dd ELSE 0 END), 0) AS total_sales,
            SUM(CASE WHEN $b_dd_delivered THEN oi.quantity ELSE 0 END) AS delivered_qty,
            COALESCE(SUM(CASE WHEN $b_dd_delivered THEN $item_net_dd ELSE 0 END), 0) AS delivered_sales,
            SUM(CASE WHEN $b_dd_returned THEN oi.quantity ELSE 0 END) AS returned_qty,
            COALESCE(SUM(CASE WHEN $b_dd_returned THEN oi.net_total ELSE 0 END), 0) AS returned_sales,
            SUM(CASE WHEN $b_dd_other THEN oi.quantity ELSE 0 END) AS other_qty,
            COALESCE(SUM(CASE WHEN $b_dd_other THEN $item_net_dd ELSE 0 END), 0) AS other_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON COALESCE(oi.creator_id, o.creator_id) = u.id
        LEFT JOIN products p ON oi.product_id = p.id
        $box_join_dd
        WHERE 
            o.company_id = ?
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY department, p.id, p.name, p.category
        ORDER BY department, total_sales DESC
    ";
    $stmt = $conn->prepare($dept_detail_sql);
    $stmt->bind_param("i", $company_id);
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
            'sales' => floatval($row['total_sales']),
            'delivered_qty' => intval($row['delivered_qty']),
            'delivered_sales' => floatval($row['delivered_sales']),
            'returned_qty' => intval($row['returned_qty']),
            'returned_sales' => floatval($row['returned_sales']),
            'other_qty' => intval($row['other_qty']),
            'other_sales' => floatval($row['other_sales'])
        ];
    }
    $stmt->close();

    // =============================================
    // 2.6 Department Salesperson Details (with Status Breakdown)
    //
    // จัดกลุ่มด้วย sales_buckets helper ซึ่งแยกยอดตีกลับที่ระดับกล่อง
    // ออเดอร์ที่ตีกลับบางกล่องจะกระจายยอดลงทั้ง returned และ delivered/other
    // ตามกล่องจริง จึงปรากฏในหลายคอลัมน์พร้อมกัน (ยอดบวกกันได้ จำนวนบวกไม่ได้)
    // =============================================
    $box_join    = sales_box_join();
    $waived_join = sales_order_waived_join();
    $b_total     = sales_bucket('total');
    $b_delivered = sales_bucket('delivered');
    $b_returned  = sales_bucket('returned');
    $b_cancelled = sales_bucket('cancelled');
    $b_baddebt   = sales_bucket('baddebt');
    $b_other     = sales_bucket('other');
    $item_net    = sales_box_net_amount();
    $outstanding = sales_outstanding();

    $r_good      = sales_return_reason('good');
    $r_damaged   = sales_return_reason('damaged');
    $r_returning = sales_return_reason('returning');
    $r_lost      = sales_return_reason('lost');
    $r_other     = sales_return_reason('other');

    // ค้างชำระ = ส่งสำเร็จแต่ยังเก็บเงินไม่ครบ จึงเป็นสับเซตของคอลัมน์ สำเร็จ
    // หักยอด waive ของออเดอร์ออกจากช่องว่าง amount_paid กันกล่องที่ตีกลับด้วย
    $unpaid_cond = sales_unpaid_condition();
    $unpaid_denom = "NULLIF(COALESCE(o.total_amount, 0) - COALESCE(ow.waived_total, 0), 0)";

    $salesperson_sql = "
        SELECT 
            CASE 
                WHEN u.role IN ('Telesale', 'Supervisor Telesale') THEN 'Telesale'
                WHEN u.role = 'Admin Page' THEN 'Admin Page'
                ELSE 'Others'
            END AS department,
            u.id AS user_id,
            u.first_name,
            u.last_name,
            COUNT(DISTINCT CASE WHEN $b_total THEN o.id END) AS total_orders,
            COALESCE(SUM(CASE WHEN $b_total THEN $item_net ELSE 0 END), 0) AS total_sales,
            
            COUNT(DISTINCT CASE WHEN $b_delivered THEN o.id END) AS delivered_orders,
            COALESCE(SUM(CASE WHEN $b_delivered THEN $item_net ELSE 0 END), 0) AS delivered_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned THEN o.id END) AS returned_orders,
            COALESCE(SUM(CASE WHEN $b_returned THEN oi.net_total ELSE 0 END), 0) AS returned_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned AND $r_good THEN o.id END) AS returned_good_orders,
            COALESCE(SUM(CASE WHEN $b_returned AND $r_good THEN oi.net_total ELSE 0 END), 0) AS returned_good_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned AND $r_damaged THEN o.id END) AS returned_damaged_orders,
            COALESCE(SUM(CASE WHEN $b_returned AND $r_damaged THEN oi.net_total ELSE 0 END), 0) AS returned_damaged_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned AND $r_returning THEN o.id END) AS returned_returning_orders,
            COALESCE(SUM(CASE WHEN $b_returned AND $r_returning THEN oi.net_total ELSE 0 END), 0) AS returned_returning_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned AND $r_lost THEN o.id END) AS returned_lost_orders,
            COALESCE(SUM(CASE WHEN $b_returned AND $r_lost THEN oi.net_total ELSE 0 END), 0) AS returned_lost_sales,
            
            COUNT(DISTINCT CASE WHEN $b_returned AND $r_other THEN o.id END) AS returned_other_orders,
            COALESCE(SUM(CASE WHEN $b_returned AND $r_other THEN oi.net_total ELSE 0 END), 0) AS returned_other_sales,
            
            COUNT(DISTINCT CASE WHEN $b_cancelled THEN o.id END) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN $b_cancelled THEN oi.net_total ELSE 0 END), 0) AS cancelled_sales,
            
            COUNT(DISTINCT CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 1 THEN o.id END) AS cancelled_type1_orders,
            COALESCE(SUM(CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 1 THEN oi.net_total ELSE 0 END), 0) AS cancelled_type1_sales,
            
            COUNT(DISTINCT CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 2 THEN o.id END) AS cancelled_type2_orders,
            COALESCE(SUM(CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 2 THEN oi.net_total ELSE 0 END), 0) AS cancelled_type2_sales,
            
            COUNT(DISTINCT CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 3 THEN o.id END) AS cancelled_type3_orders,
            COALESCE(SUM(CASE WHEN $b_cancelled AND COALESCE(oc.cancellation_type_id, 0) = 3 THEN oi.net_total ELSE 0 END), 0) AS cancelled_type3_sales,
            
            COUNT(DISTINCT CASE WHEN $b_baddebt THEN o.id END) AS baddebt_orders,
            COALESCE(SUM(CASE WHEN $b_baddebt THEN oi.net_total ELSE 0 END), 0) AS baddebt_sales,

            COUNT(DISTINCT CASE WHEN $unpaid_cond THEN o.id END) AS unpaid_orders,
            COALESCE(SUM(CASE
                WHEN $unpaid_cond AND $unpaid_denom IS NOT NULL
                THEN $item_net * ($outstanding) / $unpaid_denom
                ELSE 0
            END), 0) AS unpaid_sales,

            COUNT(DISTINCT CASE WHEN $b_other THEN o.id END) AS other_orders,
            COALESCE(SUM(CASE WHEN $b_other THEN $item_net ELSE 0 END), 0) AS other_sales
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.parent_order_id
        INNER JOIN users u ON COALESCE(oi.creator_id, o.creator_id) = u.id
        LEFT JOIN order_cancellations oc ON o.id = oc.order_id
        $box_join
        $waived_join
        WHERE 
            o.company_id = ?
            AND $date_condition
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY department, u.id, u.first_name, u.last_name
        ORDER BY department, total_sales DESC
    ";
    $stmt = $conn->prepare($salesperson_sql);
    if (!$stmt) {
        throw new Exception('Salesperson SQL error: ' . $conn->error . "\nSQL: " . substr($salesperson_sql, 0, 500));
    }
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $salesperson_result = $stmt->get_result();
    $salesperson_details = [];
    while ($row = $salesperson_result->fetch_assoc()) {
        $dept = $row['department'];
        if (!isset($salesperson_details[$dept])) {
            $salesperson_details[$dept] = [];
        }
        $salesperson_details[$dept][] = [
            'user_id' => $row['user_id'],
            'name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'total_orders' => intval($row['total_orders']),
            'total_sales' => floatval($row['total_sales']),
            
            'delivered_orders' => intval($row['delivered_orders']),
            'delivered_sales' => floatval($row['delivered_sales']),
            
            'returned_orders' => intval($row['returned_orders']),
            'returned_sales' => floatval($row['returned_sales']),
            
            'returned_good_orders' => intval($row['returned_good_orders']),
            'returned_good_sales' => floatval($row['returned_good_sales']),
            
            'returned_damaged_orders' => intval($row['returned_damaged_orders']),
            'returned_damaged_sales' => floatval($row['returned_damaged_sales']),
            
            'returned_returning_orders' => intval($row['returned_returning_orders']),
            'returned_returning_sales' => floatval($row['returned_returning_sales']),
            
            'returned_lost_orders' => intval($row['returned_lost_orders']),
            'returned_lost_sales' => floatval($row['returned_lost_sales']),
            
            'returned_other_orders' => intval($row['returned_other_orders']),
            'returned_other_sales' => floatval($row['returned_other_sales']),
            
            'cancelled_orders' => intval($row['cancelled_orders']),
            'cancelled_sales' => floatval($row['cancelled_sales']),
            
            'cancelled_type1_orders' => intval($row['cancelled_type1_orders']),
            'cancelled_type1_sales' => floatval($row['cancelled_type1_sales']),
            
            'cancelled_type2_orders' => intval($row['cancelled_type2_orders']),
            'cancelled_type2_sales' => floatval($row['cancelled_type2_sales']),
            
            'cancelled_type3_orders' => intval($row['cancelled_type3_orders']),
            'cancelled_type3_sales' => floatval($row['cancelled_type3_sales']),
            
            'baddebt_orders' => intval($row['baddebt_orders']),
            'baddebt_sales' => floatval($row['baddebt_sales']),

            'unpaid_orders' => intval($row['unpaid_orders']),
            'unpaid_sales' => floatval($row['unpaid_sales']),

            'other_orders' => intval($row['other_orders']),
            'other_sales' => floatval($row['other_sales'])
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
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY channel
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($channel_sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $channel_result = $stmt->get_result();
    $by_channel = [];
    while ($row = $channel_result->fetch_assoc()) {
        $by_channel[] = $row;
    }
    $stmt->close();

    // =============================================
    // 3.4 Channel Product Details (for modal)
    // =============================================
    $channel_detail_sql = "
        SELECT
            COALESCE(NULLIF(o.sales_channel, ''), 'ไม่ระบุ') AS channel,
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
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY channel, p.id, p.name, p.category
        ORDER BY channel, total_sales DESC
    ";
    $stmt = $conn->prepare($channel_detail_sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $channel_detail_result = $stmt->get_result();
    $channel_details = [];
    while ($row = $channel_detail_result->fetch_assoc()) {
        $ch = $row['channel'];
        if (!isset($channel_details[$ch])) {
            $channel_details[$ch] = [];
        }
        $channel_details[$ch][] = [
            'product_id' => $row['product_id'],
            'product_name' => shorten_product_name($row['product_name']),
            'original_category' => $row['original_category'],
            'quantity' => intval($row['total_quantity']),
            'sales' => floatval($row['total_sales'])
        ];
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
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY category_name
        ORDER BY total_sales DESC
    ";
    $stmt = $conn->prepare($category_sql);
    $stmt->bind_param("i", $company_id);
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
            AND $date_condition
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY category_name, p.id, p.name, p.category
        ORDER BY category_name, total_sales DESC
    ";
    $stmt = $conn->prepare($cat_detail_sql);
    $stmt->bind_param("i", $company_id);
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
    // Previous period summary (for growth — only when single month selected)
    $prev_summary = ['total_sales' => 0, 'total_orders' => 0, 'total_customers' => 0];
    
    if (count($months) === 1 && !$__r) {
        $single_month = reset($months);
        $single_year = count($years) === 1 ? reset($years) : intval(date('Y'));
        $prev_month = $single_month - 1;
        $prev_year = $single_year;
        if ($prev_month == 0) {
            $prev_month = 12;
            $prev_year = $single_year - 1;
        }
        $prev_date_cond = "YEAR(o.order_date) = $prev_year AND MONTH(o.order_date) = $prev_month";
        $prev_sql = "
            SELECT 
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(oi.net_total), 0) AS total_sales,
                COUNT(DISTINCT o.customer_id) AS total_customers
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE 
                o.company_id = ?
                AND $prev_date_cond
                AND o.order_status != 'Cancelled'
                AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
                AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
                $salesperson_condition
        ";
        $stmt = $conn->prepare($prev_sql);
        if ($stmt) {
            $stmt->bind_param("i", $company_id);
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
            AND YEAR(o.order_date) IN ($year_in)
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $salesperson_condition
        GROUP BY MONTH(o.order_date)
        ORDER BY month_num
    ";
    $stmt = $conn->prepare($monthly_sql);
    $stmt->bind_param("i", $company_id);
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
            'overall_status_summary' => $overall_status_summary,
            'prev_summary' => $prev_summary,
            'monthly_sales' => $monthly_sales,
            'by_department' => $by_department,
            'department_details' => $department_details,
            'by_channel' => $by_channel,
            'channel_details' => $channel_details,
            'by_category' => $by_category,
            'category_details' => $category_details,
            'salesperson_details' => $salesperson_details,
            'team_members' => $team_members
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month_param,
            'year' => $year_param,
            'salesperson_id' => $salesperson_id
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

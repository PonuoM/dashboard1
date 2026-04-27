<?php
/**
 * Executive Summary API
 * Aggregates data from all reports for executive scrollytelling page
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

include '../db.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');

if ($company_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'company_id is required']);
    exit;
}

$start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
$end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));

// Previous month
$prev_month = $month - 1;
$prev_year = $year;
if ($prev_month == 0) { $prev_month = 12; $prev_year = $year - 1; }
$prev_start = sprintf('%04d-%02d-01 00:00:00', $prev_year, $prev_month);
$prev_end = date('Y-m-d 00:00:00', strtotime($prev_start . ' +1 month'));

$months_th = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

$response = ['month_name' => $months_th[$month] ?? '', 'month' => $month, 'year' => $year];

try {
    // ===== 1. SALES SUMMARY (current + prev) =====
    $sql = "SELECT COUNT(DISTINCT o.id) AS total_orders, COALESCE(SUM(oi.net_total), 0) AS total_sales,
            COUNT(DISTINCT o.customer_id) AS total_customers
            FROM orders o INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $current = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $prev_start, $prev_end);
    $stmt->execute();
    $prev = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $response['sales'] = [
        'total_sales' => floatval($current['total_sales']),
        'total_orders' => intval($current['total_orders']),
        'total_customers' => intval($current['total_customers']),
        'prev_sales' => floatval($prev['total_sales']),
        'prev_orders' => intval($prev['total_orders']),
        'prev_customers' => intval($prev['total_customers']),
        'sales_growth' => $prev['total_sales'] > 0 ? round(($current['total_sales'] - $prev['total_sales']) / $prev['total_sales'] * 100, 1) : 0,
        'orders_growth' => $prev['total_orders'] > 0 ? round(($current['total_orders'] - $prev['total_orders']) / $prev['total_orders'] * 100, 1) : 0,
    ];

    // ===== 2. MONTHLY TREND (12 months) =====
    $sql = "SELECT MONTH(o.order_date) AS m, COALESCE(SUM(oi.net_total), 0) AS sales, COUNT(DISTINCT o.id) AS orders
            FROM orders o INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE o.company_id = ? AND YEAR(o.order_date) = ? AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL) GROUP BY MONTH(o.order_date) ORDER BY m";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $company_id, $year);
    $stmt->execute();
    $result = $stmt->get_result();
    $monthly = [];
    for ($m = 1; $m <= 12; $m++) $monthly[$m] = ['month' => $m, 'label' => $months_th[$m], 'sales' => 0, 'orders' => 0];
    while ($row = $result->fetch_assoc()) {
        $m = intval($row['m']);
        $monthly[$m]['sales'] = floatval($row['sales']);
        $monthly[$m]['orders'] = intval($row['orders']);
    }
    $stmt->close();
    $response['monthly_trend'] = array_values($monthly);

    // ===== 3. TOP SALESPERSON — split by department =====
    $seller_sql = "SELECT u.id, u.first_name AS name, u.role, COALESCE(SUM(oi.net_total), 0) AS sales,
            COUNT(DISTINCT o.id) AS orders, COUNT(DISTINCT o.customer_id) AS customers
            FROM orders o INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON oi.creator_id = u.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status NOT IN ('Cancelled','BadDebt') AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND u.role IN (ROLES_PLACEHOLDER)
            GROUP BY u.id, u.first_name, u.role ORDER BY sales DESC LIMIT 5";

    // Telesale + Supervisor Telesale
    $sql_ts = str_replace('ROLES_PLACEHOLDER', "'Telesale', 'Supervisor Telesale'", $seller_sql);
    $stmt = $conn->prepare($sql_ts);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['top_sellers_telesale'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['top_sellers_telesale'][] = [
            'name' => $row['name'], 'role' => $row['role'],
            'sales' => floatval($row['sales']), 'orders' => intval($row['orders']),
            'customers' => intval($row['customers']),
        ];
    }
    $stmt->close();

    // Admin Page
    $sql_ap = str_replace('ROLES_PLACEHOLDER', "'Admin Page'", $seller_sql);
    $stmt = $conn->prepare($sql_ap);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['top_sellers_admin'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['top_sellers_admin'][] = [
            'name' => $row['name'], 'role' => $row['role'],
            'sales' => floatval($row['sales']), 'orders' => intval($row['orders']),
            'customers' => intval($row['customers']),
        ];
    }
    $stmt->close();

    // Keep combined for backward compat
    $response['top_sellers'] = array_merge($response['top_sellers_telesale'], $response['top_sellers_admin']);

    // ===== 4. BY CHANNEL =====
    $sql = "SELECT COALESCE(NULLIF(o.sales_channel, ''), 'ไม่ระบุ') AS channel,
            COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.net_total), 0) AS sales
            FROM orders o INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            GROUP BY channel ORDER BY sales DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['by_channel'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['by_channel'][] = ['channel' => $row['channel'], 'orders' => intval($row['orders']), 'sales' => floatval($row['sales'])];
    }
    $stmt->close();

    // ===== 5. BY CATEGORY =====
    $sql = "SELECT CASE WHEN p.category LIKE '%ปุ๋ย%' THEN 'ปุ๋ย' WHEN p.category = 'ชีวภัณฑ์' THEN 'ชีวภัณฑ์' ELSE 'อื่นๆ' END AS cat,
            COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.net_total), 0) AS sales
            FROM orders o INNER JOIN order_items oi ON o.id = oi.parent_order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            GROUP BY cat ORDER BY sales DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['by_category'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['by_category'][] = ['category' => $row['cat'], 'orders' => intval($row['orders']), 'sales' => floatval($row['sales'])];
    }
    $stmt->close();

    // ===== 6. ACCOUNTING SUMMARY =====
    $acct = ['statement_total' => 0, 'matched' => 0, 'unmatched' => 0, 'unmatched_amount' => 0, 'match_rate' => 0];
    $sql = "SELECT COUNT(DISTINCT sl.id) as total,
            COUNT(DISTINCT CASE WHEN srl.id IS NOT NULL THEN sl.id END) as matched,
            COUNT(DISTINCT CASE WHEN srl.id IS NULL THEN sl.id END) as unmatched,
            COALESCE(SUM(CASE WHEN srl.id IS NULL THEN sl.amount ELSE 0 END), 0) as unmatched_amount
            FROM statement_logs sl INNER JOIN statement_batchs sb ON sl.batch_id = sb.id
            LEFT JOIN statement_reconcile_logs srl ON srl.statement_log_id = sl.id
            WHERE sl.created_at >= ? AND sl.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param("ss", $start_date, $end_date);
        $stmt->execute();
        $r = $stmt->get_result()->fetch_assoc();
        $acct['statement_total'] = intval($r['total']);
        $acct['matched'] = intval($r['matched']);
        $acct['unmatched'] = intval($r['unmatched']);
        $acct['unmatched_amount'] = floatval($r['unmatched_amount']);
        $acct['match_rate'] = $acct['statement_total'] > 0 ? round($acct['matched'] / $acct['statement_total'] * 100, 1) : 0;
        $stmt->close();
    }
    $response['accounting'] = $acct;

    // ===== 7. ORDER STATUS SUMMARY =====
    $sql = "SELECT order_status, COUNT(*) as cnt FROM orders
            WHERE company_id = ? AND order_date >= ? AND order_date < ? GROUP BY order_status ORDER BY cnt DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['order_status'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['order_status'][] = ['status' => $row['order_status'], 'count' => intval($row['cnt'])];
    }
    $stmt->close();

    // ===== 7B. SALES BY DEPARTMENT (role) =====
    $sql = "SELECT
            CASE
                WHEN u.role IN ('Telesale','Supervisor Telesale') THEN 'Telesale'
                WHEN u.role = 'Admin Page' THEN 'Admin Page'
                ELSE COALESCE(NULLIF(u.role,''), 'อื่นๆ')
            END AS dept,
            COALESCE(SUM(oi.net_total), 0) AS sales,
            COUNT(DISTINCT o.id) AS orders,
            COUNT(DISTINCT o.customer_id) AS customers
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN users u ON oi.creator_id = u.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            GROUP BY dept ORDER BY sales DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['by_department'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['by_department'][] = [
            'department' => $row['dept'],
            'sales' => floatval($row['sales']),
            'orders' => intval($row['orders']),
            'customers' => intval($row['customers']),
        ];
    }
    $stmt->close();

    // ===== 7C. SALES BY PAGE =====
    $sql = "SELECT pg.name AS page_name, pg.platform,
            COALESCE(SUM(oi.net_total), 0) AS sales,
            COUNT(DISTINCT o.id) AS orders
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN pages pg ON o.sales_channel_page_id = pg.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            GROUP BY pg.id, pg.name, pg.platform ORDER BY sales DESC LIMIT 10";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['by_page'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['by_page'][] = [
            'page_name' => $row['page_name'],
            'platform' => $row['platform'] ?? '',
            'sales' => floatval($row['sales']),
            'orders' => intval($row['orders']),
        ];
    }
    $stmt->close();

    // ===== 7D. TOP PRODUCTS =====
    $sql = "SELECT p.name AS product_name, p.category,
            COALESCE(SUM(oi.net_total), 0) AS sales,
            SUM(oi.quantity) AS qty,
            COUNT(DISTINCT o.id) AS orders
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            GROUP BY p.id, p.name, p.category ORDER BY sales DESC LIMIT 10";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['top_products'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['top_products'][] = [
            'product_name' => $row['product_name'],
            'category' => $row['category'] ?? '',
            'sales' => floatval($row['sales']),
            'qty' => intval($row['qty']),
            'orders' => intval($row['orders']),
        ];
    }
    $stmt->close();

    // ===== 7E. SALES BY REGION =====
    $sql = "SELECT ag.name AS region_name,
            COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(oi.net_total), 0) AS sales
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN address_provinces ap ON (c.province = ap.name_en OR c.province = ap.name_th)
            LEFT JOIN address_geographies ag ON ap.geography_id = ag.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND ag.name IS NOT NULL
            GROUP BY ag.id, ag.name ORDER BY sales DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['by_region'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['by_region'][] = [
            'region' => $row['region_name'],
            'sales' => floatval($row['sales']),
            'orders' => intval($row['orders']),
        ];
    }
    $stmt->close();

    // ===== 7F. TOP PROVINCES =====
    $sql = "SELECT COALESCE(ap.name_th, c.province) AS province_name,
            ag.name AS region_name,
            COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(oi.net_total), 0) AS sales
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            INNER JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN address_provinces ap ON (c.province = ap.name_en OR c.province = ap.name_th)
            LEFT JOIN address_geographies ag ON ap.geography_id = ag.id
            WHERE o.company_id = ? AND o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled' AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            AND c.province IS NOT NULL AND c.province != ''
            GROUP BY province_name, region_name ORDER BY sales DESC LIMIT 15";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['top_provinces'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['top_provinces'][] = [
            'province' => $row['province_name'],
            'region' => $row['region_name'] ?? '',
            'sales' => floatval($row['sales']),
            'orders' => intval($row['orders']),
        ];
    }
    $stmt->close();

    // ===== 8. SMART INSIGHTS (rich, detailed) =====
    $insights = [];
    $prevMonthName = $months_th[$prev_month] ?? '';
    $curMonthName = $months_th[$month] ?? '';
    $salesDiff = $response['sales']['total_sales'] - $response['sales']['prev_sales'];
    $g = $response['sales']['sales_growth'];

    // 1. Sales growth
    if ($g > 0) {
        $insights[] = [
            'type' => 'positive',
            'icon' => 'growth',
            'title' => 'ยอดขายเติบโต',
            'text' => "ยอดขายเดือน{$curMonthName} เพิ่มขึ้น {$g}% เมื่อเทียบกับเดือน{$prevMonthName}",
            'detail' => "ยอดขายเดือนก่อน ฿" . number_format($response['sales']['prev_sales']) . " → เดือนนี้ ฿" . number_format($response['sales']['total_sales']) . " เพิ่มขึ้น ฿" . number_format(abs($salesDiff)),
            'metric' => "+{$g}%",
            'metric_label' => 'Growth'
        ];
    } elseif ($g < 0) {
        $insights[] = [
            'type' => 'negative',
            'icon' => 'decline',
            'title' => 'ยอดขายลดลง',
            'text' => "ยอดขายเดือน{$curMonthName} ลดลง " . abs($g) . "% เมื่อเทียบกับเดือน{$prevMonthName}",
            'detail' => "ยอดขายเดือนก่อน ฿" . number_format($response['sales']['prev_sales']) . " → เดือนนี้ ฿" . number_format($response['sales']['total_sales']) . " ลดลง ฿" . number_format(abs($salesDiff)),
            'metric' => "{$g}%",
            'metric_label' => 'Growth'
        ];
    }

    // 2. Top seller spotlight
    if (!empty($response['top_sellers'])) {
        $top = $response['top_sellers'][0];
        $topPct = $response['sales']['total_sales'] > 0 ? round($top['sales'] / $response['sales']['total_sales'] * 100, 1) : 0;
        $insights[] = [
            'type' => 'info',
            'icon' => 'seller',
            'title' => 'เซลส์ยอดเยี่ยม',
            'text' => "{$top['name']} ทำยอดสูงสุดประจำเดือนที่ ฿" . number_format($top['sales']),
            'detail' => "คิดเป็น {$topPct}% ของยอดขายทั้งหมด จาก {$top['orders']} ออเดอร์ {$top['customers']} ลูกค้า ตำแหน่ง {$top['role']}",
            'metric' => "{$topPct}%",
            'metric_label' => 'สัดส่วน'
        ];
    }

    // 3. Best channel
    if (!empty($response['by_channel'])) {
        $bestCh = $response['by_channel'][0];
        $chTotal = array_sum(array_column($response['by_channel'], 'sales'));
        $chPct = $chTotal > 0 ? round($bestCh['sales'] / $chTotal * 100, 1) : 0;
        $insights[] = [
            'type' => 'info',
            'icon' => 'channel',
            'title' => 'ช่องทางหลัก',
            'text' => "ช่องทาง \"{$bestCh['channel']}\" สร้างยอดขายสูงสุด ฿" . number_format($bestCh['sales']),
            'detail' => "คิดเป็น {$chPct}% ของยอดขายทุกช่องทาง จากทั้งหมด " . count($response['by_channel']) . " ช่องทาง",
            'metric' => "{$chPct}%",
            'metric_label' => 'Market Share'
        ];
    }

    // 4. Category leader
    if (!empty($response['by_category'])) {
        $bestCat = $response['by_category'][0];
        $catTotal = array_sum(array_column($response['by_category'], 'sales'));
        $catPct = $catTotal > 0 ? round($bestCat['sales'] / $catTotal * 100, 1) : 0;
        $insights[] = [
            'type' => 'info',
            'icon' => 'product',
            'title' => 'สินค้าหลัก',
            'text' => "หมวด \"{$bestCat['category']}\" เป็นสินค้าขายดีที่สุด ยอด ฿" . number_format($bestCat['sales']),
            'detail' => "คิดเป็น {$catPct}% ของยอดขาย จาก {$bestCat['orders']} ออเดอร์",
            'metric' => "{$catPct}%",
            'metric_label' => 'สัดส่วน'
        ];
    }

    // 5. Order completion rate
    if (!empty($response['order_status'])) {
        $totalOrders = array_sum(array_column($response['order_status'], 'count'));
        $delivered = 0;
        $cancelled = 0;
        foreach ($response['order_status'] as $os) {
            if ($os['status'] === 'Delivered') $delivered = $os['count'];
            if ($os['status'] === 'Cancelled') $cancelled = $os['count'];
        }
        $deliverRate = $totalOrders > 0 ? round($delivered / $totalOrders * 100, 1) : 0;
        $cancelRate = $totalOrders > 0 ? round($cancelled / $totalOrders * 100, 1) : 0;
        if ($deliverRate > 0) {
            $insights[] = [
                'type' => $deliverRate >= 70 ? 'positive' : ($deliverRate >= 50 ? 'info' : 'warning'),
                'icon' => 'delivery',
                'title' => 'อัตราจัดส่งสำเร็จ',
                'text' => "ออเดอร์จัดส่งสำเร็จ {$deliverRate}% จากทั้งหมด {$totalOrders} ออเดอร์",
                'detail' => "จัดส่งแล้ว {$delivered} รายการ ยกเลิก {$cancelled} รายการ ({$cancelRate}%)",
                'metric' => "{$deliverRate}%",
                'metric_label' => 'Completion'
            ];
        }
    }

    // 6. Accounting health
    if ($acct['statement_total'] > 0) {
        $matchType = $acct['match_rate'] >= 95 ? 'positive' : ($acct['match_rate'] >= 80 ? 'info' : 'warning');
        $matchLabel = $acct['match_rate'] >= 95 ? 'ดีเยี่ยม' : ($acct['match_rate'] >= 80 ? 'พอใช้ ควรเร่งตรวจ' : 'ต้องปรับปรุงเร่งด่วน');
        $insights[] = [
            'type' => $matchType,
            'icon' => 'accounting',
            'title' => 'สุขภาพบัญชี',
            'text' => "อัตราจับคู่ Statement {$acct['match_rate']}% — {$matchLabel}",
            'detail' => "จับคู่แล้ว {$acct['matched']} จากทั้งหมด {$acct['statement_total']} รายการ ค้าง {$acct['unmatched']} รายการ ยอดค้าง ฿" . number_format($acct['unmatched_amount']),
            'metric' => "{$acct['match_rate']}%",
            'metric_label' => 'Match Rate'
        ];
    }

    // 7. Takeaway / recommendation
    $recs = [];
    if ($acct['unmatched'] > 10) $recs[] = "เร่งตรวจสอบ Statement ค้างจับคู่ {$acct['unmatched']} รายการ";
    if ($g < 0) $recs[] = "ทบทวนกลยุทธ์การขาย ยอดลดลงจากเดือนก่อน";
    if (isset($cancelRate) && $cancelRate > 10) $recs[] = "ตรวจสอบสาเหตุยกเลิกออเดอร์ ({$cancelRate}%)";
    if ($g > 10) $recs[] = "รักษา momentum — ยอดขายเติบโตดี";
    if (!empty($recs)) {
        $insights[] = [
            'type' => 'warning',
            'icon' => 'recommend',
            'title' => 'สิ่งที่ควรทำ',
            'text' => count($recs) . ' สิ่งที่ต้องดำเนินการ',
            'items' => $recs,
            'detail' => 'คำแนะนำจากระบบวิเคราะห์ข้อมูลอัตโนมัติ',
            'metric' => count($recs),
            'metric_label' => 'Action Items'
        ];
    }

    $response['insights'] = $insights;

    echo json_encode(['success' => true, 'data' => $response]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>

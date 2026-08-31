<?php
/**
 * Returned Orders Investigation Report API
 * 
 * Returns all returned orders grouped by salesperson,
 * with matched call logs from call_import_logs for voice recording reference.
 * 
 * Parameters:
 * - company_id (required)
 * - month (required, 1-12, 0 = full year)
 * - year (required)
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) {
            header("Content-Type: application/json; charset=utf-8");
        }
        echo json_encode(['success' => false, 'message' => 'Fatal: ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']]);
    }
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Normalize phone: "0812345678" → "66812345678", "812345678" → "66812345678"
function normalizePhone($phone) {
    if (empty($phone)) return '';
    $phone = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($phone) >= 9) {
        if (substr($phone, 0, 2) === '66') return $phone;
        if (substr($phone, 0, 1) === '0') return '66' . substr($phone, 1);
        return '66' . $phone;
    }
    return $phone;
}

// Get last 9 digits for LIKE matching
function phoneSuffix($phone) {
    $normalized = normalizePhone($phone);
    if (strlen($normalized) >= 9) return substr($normalized, -9);
    return '';
}

try {
    include '../db.php';
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

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

// Build access control filter based on user role
// Supervisor Telesale: self + subordinates | Telesale: self only | Admin Control/others: all
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
        $access_filter = " AND COALESCE(oi.creator_id, o.creator_id) IN ($ids_str)";
    } elseif ($user_role === 'Telesale' || $user_role === 'Admin Page') {
        $access_filter = " AND COALESCE(oi.creator_id, o.creator_id) = $user_id";
    }
    // Admin Control or other roles: no filter (see all)
}

try {
    // ──────────────────────────────────────────
    // Query 1: Get all returned BOXES with details
    //
    // ตีกลับถูกบันทึกที่ระดับ "กล่อง" (order_boxes.status='RETURNED')
    // ไม่ใช่ระดับออเดอร์ — ออเดอร์ที่มีหลายกล่องอาจรับบางกล่อง/คืนบางกล่อง
    // (partial return) และบางออเดอร์ order_status ยังเป็น 'Delivered'
    // ทั้งที่มีกล่องตีกลับ. เราจึงไล่จาก order_boxes แล้ว map สินค้าใน
    // กล่องด้วย box_number (order_items.box_number = order_boxes.box_number).
    // ยอดเงินตีกลับ = COD ของกล่องที่คืน (ob.cod_amount).
    // ──────────────────────────────────────────
    $sql = "
        SELECT
            o.id AS order_id,
            ob.id AS box_id,
            ob.box_number,
            ob.return_status,
            ob.return_created_at,
            o.order_status,
            o.order_date,
            o.delivery_date,
            o.customer_id,
            COALESCE(c.first_name, '') AS customer_name,
            COALESCE(c.phone, o.recipient_phone, '') AS customer_phone,
            o.recipient_phone,
            COALESCE(oi.creator_id, o.creator_id) AS creator_id,
            u.first_name AS sales_name,
            u.phone AS sales_phone,
            u.supervisor_id,
            GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) ORDER BY p.name SEPARATOR ', ') AS products,
            COALESCE(ob.cod_amount, 0) AS net_total,
            COALESCE(SUM(oi.net_total), 0) AS box_item_total
        FROM order_boxes ob
        INNER JOIN orders o ON o.id = ob.order_id
        INNER JOIN order_items oi ON oi.parent_order_id = ob.order_id AND oi.box_number = ob.box_number
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON COALESCE(oi.creator_id, o.creator_id) = u.id
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        WHERE
            o.company_id = ?
            AND ob.status = 'RETURNED'
            AND o.order_date >= ?
            AND o.order_date < ?
            AND u.role IN ('Telesale', 'Supervisor Telesale', 'Admin Page')
            AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            AND (oi.is_promotion_parent = 0 OR oi.is_promotion_parent IS NULL)
            $access_filter
        GROUP BY ob.id, ob.box_number, ob.return_status, ob.return_created_at, ob.cod_amount,
                 o.id, o.order_status, o.order_date, o.delivery_date, o.customer_id,
                 c.first_name, c.phone, o.recipient_phone, COALESCE(oi.creator_id, o.creator_id),
                 u.first_name, u.phone, u.supervisor_id
        ORDER BY u.first_name, o.order_date DESC, ob.box_number
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['success' => false, 'message' => 'Prepare error Q1: ' . $conn->error]);
        exit;
    }
    $stmt->bind_param("iss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $row['net_total'] = floatval($row['net_total']);
        $row['box_item_total'] = floatval($row['box_item_total']);
        $orders[] = $row;
    }
    $stmt->close();

    // ──────────────────────────────────────────
    // Query 2: Match call logs for each order (±3 days)
    // ──────────────────────────────────────────
    foreach ($orders as &$order) {
        $order['call_matches'] = [];
        
        $suffix = phoneSuffix($order['customer_phone']);
        if (empty($suffix)) {
            // Try recipient_phone
            $suffix = phoneSuffix($order['recipient_phone']);
        }
        if (empty($suffix)) continue;
        
        // Search ±3 days around order_date
        $order_ts = strtotime($order['order_date']);
        $search_start = date('Y-m-d', $order_ts - (3 * 86400));
        $search_end = date('Y-m-d', $order_ts + (3 * 86400));
        $phone_like = '%' . $suffix;
        
        // Use matched_user_id to filter to the salesperson who created the order
        $creator_id = intval($order['creator_id']);
        
        $call_sql = "
            SELECT 
                cil.call_date,
                cil.start_time,
                cil.duration,
                cil.agent_phone,
                cil.call_origination,
                cil.call_termination,
                cil.charging_group,
                cil.status,
                cil.matched_user_id
            FROM call_import_logs cil
            WHERE cil.call_date >= ?
              AND cil.call_date <= ?
              AND cil.status = 1
              AND cil.duration != '00:00:00'
              AND (cil.call_termination LIKE ? OR cil.call_origination LIKE ?)
              AND cil.matched_user_id = ?
            ORDER BY cil.call_date DESC, cil.start_time DESC
            LIMIT 5
        ";
        
        $call_stmt = $conn->prepare($call_sql);
        if (!$call_stmt) continue;
        
        $call_stmt->bind_param("ssssi", $search_start, $search_end, $phone_like, $phone_like, $creator_id);
        $call_stmt->execute();
        $call_result = $call_stmt->get_result();
        
        while ($call_row = $call_result->fetch_assoc()) {
            $order['call_matches'][] = [
                'call_date' => $call_row['call_date'],
                'start_time' => $call_row['start_time'],
                'duration' => $call_row['duration'],
                'agent_phone' => $call_row['agent_phone'],
                'call_from' => $call_row['call_origination'],
                'call_to' => $call_row['call_termination'],
                'charging_group' => $call_row['charging_group'],
                'matched_user_id' => intval($call_row['matched_user_id'])
            ];
        }
        $call_stmt->close();
        
        // If no match found with matched_user_id, try broader search (any agent)
        if (empty($order['call_matches'])) {
            $broad_sql = "
                SELECT 
                    cil.call_date,
                    cil.start_time,
                    cil.duration,
                    cil.agent_phone,
                    cil.call_origination,
                    cil.call_termination,
                    cil.charging_group,
                    cil.matched_user_id
                FROM call_import_logs cil
                WHERE cil.call_date >= ?
                  AND cil.call_date <= ?
                  AND cil.status = 1
                  AND cil.duration != '00:00:00'
                  AND (cil.call_termination LIKE ? OR cil.call_origination LIKE ?)
                ORDER BY cil.call_date DESC, cil.start_time DESC
                LIMIT 3
            ";
            
            $broad_stmt = $conn->prepare($broad_sql);
            if ($broad_stmt) {
                $broad_stmt->bind_param("ssss", $search_start, $search_end, $phone_like, $phone_like);
                $broad_stmt->execute();
                $broad_result = $broad_stmt->get_result();
                
                while ($call_row = $broad_result->fetch_assoc()) {
                    $order['call_matches'][] = [
                        'call_date' => $call_row['call_date'],
                        'start_time' => $call_row['start_time'],
                        'duration' => $call_row['duration'],
                        'agent_phone' => $call_row['agent_phone'],
                        'call_from' => $call_row['call_origination'],
                        'call_to' => $call_row['call_termination'],
                        'charging_group' => $call_row['charging_group'],
                        'matched_user_id' => intval($call_row['matched_user_id'])
                    ];
                }
                $broad_stmt->close();
            }
        }
    }
    unset($order);

    // ──────────────────────────────────────────
    // Group by salesperson
    // ──────────────────────────────────────────
    $by_salesperson = [];
    $total_amount = 0;
    
    foreach ($orders as $order) {
        $uid = $order['creator_id'];
        if (!isset($by_salesperson[$uid])) {
            $by_salesperson[$uid] = [
                'user_id' => $uid,
                'sales_name' => $order['sales_name'],
                'sales_phone' => $order['sales_phone'],
                'supervisor_id' => $order['supervisor_id'],
                'returned_count' => 0,
                'returned_total' => 0,
                'orders' => []
            ];
        }
        
        $by_salesperson[$uid]['returned_count']++;
        $by_salesperson[$uid]['returned_total'] += $order['net_total'];
        $total_amount += $order['net_total'];
        
        $by_salesperson[$uid]['orders'][] = [
            'order_id' => $order['order_id'],
            'box_number' => intval($order['box_number']),
            'return_status' => $order['return_status'],
            'return_created_at' => $order['return_created_at'],
            'order_status' => $order['order_status'],
            'order_date' => $order['order_date'],
            'delivery_date' => $order['delivery_date'],
            'customer_name' => $order['customer_name'],
            'customer_phone' => $order['customer_phone'],
            'recipient_phone' => $order['recipient_phone'],
            'products' => $order['products'],
            'net_total' => $order['net_total'],
            'box_item_total' => $order['box_item_total'],
            'call_matches' => $order['call_matches']
        ];
    }
    
    // Sort by returned_count DESC
    $grouped = array_values($by_salesperson);
    usort($grouped, function($a, $b) {
        return $b['returned_count'] - $a['returned_count'];
    });

    echo json_encode([
        'success' => true,
        'data' => [
            'by_salesperson' => $grouped,
            'summary' => [
                'total_returned' => count($orders),
                'total_salespersons' => count($grouped),
                'total_amount' => $total_amount
            ]
        ],
        'filters' => [
            'company_id' => $company_id,
            'month' => $month,
            'year' => $year,
            'date_range' => ['start' => $start_date, 'end' => $end_date]
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

if (isset($conn)) $conn->close();
?>

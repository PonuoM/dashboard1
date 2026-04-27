<?php
/**
 * Accounting KPI Report API
 * Returns monthly accounting performance data
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) { header("Content-Type: application/json; charset=utf-8"); }
        echo json_encode(['success' => false, 'message' => 'Fatal: ' . $error['message']]);
    }
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

try { include '../db.php'; } catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');

// Date range
if ($month === 0) {
    $start_date = sprintf('%04d-01-01 00:00:00', $year);
    $end_date = sprintf('%04d-01-01 00:00:00', $year + 1);
} else {
    $start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
    $end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));
}

try {
    $response = [];

    // ========== 1. SUMMARY CARDS ==========

    // Total statement uploads this period
    $sql = "SELECT COUNT(*) as batch_count, COALESCE(SUM(row_count), 0) as total_rows
            FROM statement_batchs WHERE created_at >= ? AND created_at < ?";
    if ($company_id > 0) $sql .= " AND company_id = $company_id";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $response['summary'] = [
        'statement_batches' => intval($r['batch_count']),
        'statement_rows' => intval($r['total_rows']),
    ];

    // Total reconcile batches + logs
    $sql = "SELECT COUNT(*) as batch_count FROM statement_reconcile_batches WHERE created_at >= ? AND created_at < ?";
    if ($company_id > 0) $sql .= " AND company_id = $company_id";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $response['summary']['reconcile_batches'] = intval($r['batch_count']);

    $sql = "SELECT COUNT(*) as log_count, COALESCE(SUM(confirmed_amount), 0) as total_confirmed
            FROM statement_reconcile_logs WHERE created_at >= ? AND created_at < ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $response['summary']['reconcile_logs'] = intval($r['log_count']);
    $response['summary']['reconcile_amount'] = floatval($r['total_confirmed']);

    // COD summary
    $sql = "SELECT COUNT(*) as total, 
            SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched,
            SUM(CASE WHEN status != 'matched' THEN 1 ELSE 0 END) as unmatched,
            COALESCE(SUM(cod_amount), 0) as total_cod,
            COALESCE(SUM(received_amount), 0) as total_received,
            COALESCE(SUM(difference), 0) as total_diff
            FROM cod_records WHERE created_at >= ? AND created_at < ?";
    if ($company_id > 0) $sql .= " AND company_id = $company_id";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $response['summary']['cod_total'] = intval($r['total']);
    $response['summary']['cod_matched'] = intval($r['matched']);
    $response['summary']['cod_unmatched'] = intval($r['unmatched']);
    $response['summary']['cod_amount'] = floatval($r['total_cod']);
    $response['summary']['cod_received'] = floatval($r['total_received']);
    $response['summary']['cod_diff'] = floatval($r['total_diff']);

    // Statement matching stats (using statement_reconcile_logs.statement_log_id FK)
    $sql = "SELECT 
            COUNT(DISTINCT sl.id) as total_statements,
            COUNT(DISTINCT srl.statement_log_id) as matched_statements,
            COUNT(DISTINCT CASE WHEN srl.id IS NULL THEN sl.id END) as unmatched_statements,
            COALESCE(SUM(CASE WHEN srl.id IS NULL THEN sl.amount ELSE 0 END), 0) as unmatched_amount
            FROM statement_logs sl
            INNER JOIN statement_batchs sb ON sl.batch_id = sb.id
            LEFT JOIN statement_reconcile_logs srl ON srl.statement_log_id = sl.id
            WHERE sl.created_at >= ? AND sl.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $response['summary']['statement_total'] = intval($r['total_statements']);
    $response['summary']['statement_matched'] = intval($r['matched_statements']);
    $response['summary']['unreconciled_count'] = intval($r['unmatched_statements']);
    $response['summary']['unreconciled_amount'] = floatval($r['unmatched_amount']);

    // Statement matching breakdown by payment method
    $sql = "SELECT 
            COALESCE(o.payment_method, 'ไม่ระบุ') as payment_method,
            COUNT(DISTINCT srl.id) as reconcile_count,
            COUNT(DISTINCT srl.statement_log_id) as statement_count,
            COALESCE(SUM(srl.confirmed_amount), 0) as total_amount
            FROM statement_reconcile_logs srl
            INNER JOIN statement_reconcile_batches srb ON srl.batch_id = srb.id
            LEFT JOIN orders o ON srl.order_id = o.id
            WHERE srl.created_at >= ? AND srl.created_at < ?";
    if ($company_id > 0) $sql .= " AND srb.company_id = $company_id";
    $sql .= " GROUP BY o.payment_method ORDER BY reconcile_count DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['statement_by_payment'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['statement_by_payment'][] = [
            'payment_method' => $row['payment_method'],
            'reconcile_count' => intval($row['reconcile_count']),
            'statement_count' => intval($row['statement_count']),
            'total_amount' => floatval($row['total_amount']),
        ];
    }
    $stmt->close();

    // Statement matching breakdown by bank
    $sql = "SELECT 
            COALESCE(sl.bank_display_name, 'ไม่ระบุ') as bank_name,
            COUNT(DISTINCT sl.id) as total_statements,
            COUNT(DISTINCT srl.statement_log_id) as matched_statements,
            COUNT(DISTINCT CASE WHEN srl.id IS NULL THEN sl.id END) as unmatched_statements,
            COALESCE(SUM(DISTINCT CASE WHEN srl.id IS NULL THEN sl.amount ELSE 0 END), 0) as unmatched_amount
            FROM statement_logs sl
            INNER JOIN statement_batchs sb ON sl.batch_id = sb.id
            LEFT JOIN statement_reconcile_logs srl ON srl.statement_log_id = sl.id
            WHERE sl.created_at >= ? AND sl.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $sql .= " GROUP BY COALESCE(sl.bank_display_name, 'ไม่ระบุ') ORDER BY total_statements DESC";
    $stmt = $conn->prepare($sql);
    $response['statement_by_bank'] = [];
    if ($stmt) {
        $stmt->bind_param("ss", $start_date, $end_date);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $response['statement_by_bank'][] = [
                'bank_name' => $row['bank_name'],
                'total' => intval($row['total_statements']),
                'matched' => intval($row['matched_statements']),
                'unmatched' => intval($row['unmatched_statements']),
                'unmatched_amount' => floatval($row['unmatched_amount']),
            ];
        }
        $stmt->close();
    }
    // ========== 2. BY PERSON: STATEMENT UPLOADS ==========
    $sql = "SELECT sb.user_id, u.first_name, 
            COUNT(*) as batch_count, SUM(sb.row_count) as total_rows,
            MAX(sb.created_at) as last_upload
            FROM statement_batchs sb
            LEFT JOIN users u ON sb.user_id = u.id
            WHERE sb.created_at >= ? AND sb.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $sql .= " GROUP BY sb.user_id ORDER BY total_rows DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['statement_by_person'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['statement_by_person'][] = [
            'user_id' => intval($row['user_id']),
            'name' => $row['first_name'] ?: 'N/A',
            'batch_count' => intval($row['batch_count']),
            'total_rows' => intval($row['total_rows']),
            'last_upload' => $row['last_upload'],
        ];
    }
    $stmt->close();

    // ========== 3. BY PERSON: RECONCILE ==========
    $sql = "SELECT srb.created_by as user_id, u.first_name,
            COUNT(*) as batch_count,
            MAX(srb.created_at) as last_reconcile
            FROM statement_reconcile_batches srb
            LEFT JOIN users u ON srb.created_by = u.id
            WHERE srb.created_at >= ? AND srb.created_at < ?";
    if ($company_id > 0) $sql .= " AND srb.company_id = $company_id";
    $sql .= " GROUP BY srb.created_by ORDER BY batch_count DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();

    $reconcile_by_person = [];
    while ($row = $result->fetch_assoc()) {
        $reconcile_by_person[intval($row['user_id'])] = [
            'user_id' => intval($row['user_id']),
            'name' => $row['first_name'] ?: 'N/A',
            'batch_count' => intval($row['batch_count']),
            'last_reconcile' => $row['last_reconcile'],
            'log_count' => 0,
            'total_confirmed' => 0,
        ];
    }
    $stmt->close();

    // Reconcile log details per user (via batch -> created_by)
    $sql = "SELECT srb.created_by as user_id, COUNT(srl.id) as log_count, 
            COALESCE(SUM(srl.confirmed_amount), 0) as total_confirmed
            FROM statement_reconcile_logs srl
            INNER JOIN statement_reconcile_batches srb ON srl.batch_id = srb.id
            WHERE srl.created_at >= ? AND srl.created_at < ?";
    if ($company_id > 0) $sql .= " AND srb.company_id = $company_id";
    $sql .= " GROUP BY srb.created_by";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $uid = intval($row['user_id']);
        if (isset($reconcile_by_person[$uid])) {
            $reconcile_by_person[$uid]['log_count'] = intval($row['log_count']);
            $reconcile_by_person[$uid]['total_confirmed'] = floatval($row['total_confirmed']);
        }
    }
    $stmt->close();
    $response['reconcile_by_person'] = array_values($reconcile_by_person);

    // ========== 4. BY PERSON: COD ==========
    $sql = "SELECT cr.created_by as user_id, u.first_name,
            COUNT(*) as record_count,
            SUM(CASE WHEN cr.status = 'matched' THEN 1 ELSE 0 END) as matched_count,
            SUM(CASE WHEN cr.status != 'matched' THEN 1 ELSE 0 END) as unmatched_count,
            COALESCE(SUM(cr.cod_amount), 0) as total_cod,
            COALESCE(SUM(cr.received_amount), 0) as total_received,
            COALESCE(SUM(cr.difference), 0) as total_diff,
            MAX(cr.created_at) as last_activity
            FROM cod_records cr
            LEFT JOIN users u ON cr.created_by = u.id
            WHERE cr.created_at >= ? AND cr.created_at < ?";
    if ($company_id > 0) $sql .= " AND cr.company_id = $company_id";
    $sql .= " GROUP BY cr.created_by ORDER BY record_count DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['cod_by_person'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['cod_by_person'][] = [
            'user_id' => intval($row['user_id']),
            'name' => $row['first_name'] ?: 'N/A',
            'record_count' => intval($row['record_count']),
            'matched_count' => intval($row['matched_count']),
            'unmatched_count' => intval($row['unmatched_count']),
            'total_cod' => floatval($row['total_cod']),
            'total_received' => floatval($row['total_received']),
            'total_diff' => floatval($row['total_diff']),
            'last_activity' => $row['last_activity'],
        ];
    }
    $stmt->close();

    // ========== 5. DAILY ACTIVITY (last 30 days or within period) ==========
    $sql = "SELECT DATE(created_at) as day, COUNT(*) as cnt, COALESCE(SUM(confirmed_amount), 0) as amount
            FROM statement_reconcile_logs 
            WHERE created_at >= ? AND created_at < ?
            GROUP BY DATE(created_at) ORDER BY day ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['daily_reconcile'] = [];
    while ($row = $result->fetch_assoc()) {
        $response['daily_reconcile'][] = [
            'date' => $row['day'],
            'count' => intval($row['cnt']),
            'amount' => floatval($row['amount']),
        ];
    }
    $stmt->close();

    // ========== 6. UNMATCHED COMPARISON ==========
    $response['unmatched'] = [
        'statements_confirmed' => 0, 'statements_unconfirmed' => 0,
        'statements_unconfirmed_amount' => 0,
        'statement_logs_unmatched' => 0, 'statement_logs_unmatched_amount' => 0,
        'orders_delivered' => 0, 'orders_preapproved' => 0,
        'orders_preapproved_amount' => 0,
    ];

    // Statement reconcile status: based on statement upload date (sl.created_at)
    // Shows: for statements uploaded in this month, how many are confirmed/unconfirmed
    $sql = "SELECT 
            COUNT(DISTINCT CASE WHEN srl.confirmed_action = 'Confirmed' THEN srl.id END) as confirmed,
            COUNT(DISTINCT CASE WHEN srl.id IS NOT NULL AND (srl.confirmed_action IS NULL OR srl.confirmed_action != 'Confirmed') THEN srl.id END) as unconfirmed,
            COALESCE(SUM(CASE WHEN srl.id IS NOT NULL AND (srl.confirmed_action IS NULL OR srl.confirmed_action != 'Confirmed') THEN srl.statement_amount ELSE 0 END), 0) as unconfirmed_amount
            FROM statement_logs sl
            INNER JOIN statement_batchs sb ON sl.batch_id = sb.id
            LEFT JOIN statement_reconcile_logs srl ON srl.statement_log_id = sl.id
            WHERE sl.created_at >= ? AND sl.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $stmt = $conn->prepare($sql);
    if ($stmt) { $stmt->bind_param("ss", $start_date, $end_date); $stmt->execute(); $r = $stmt->get_result()->fetch_assoc(); $stmt->close();
        $response['unmatched']['statements_confirmed'] = intval($r['confirmed']);
        $response['unmatched']['statements_unconfirmed'] = intval($r['unconfirmed']);
        $response['unmatched']['statements_unconfirmed_amount'] = floatval($r['unconfirmed_amount']);
    }

    // Statement logs: uploaded but never matched (using statement_log_id FK)
    $sql = "SELECT COUNT(DISTINCT sl.id) as cnt, 
            COALESCE(SUM(CASE WHEN srl.id IS NULL THEN sl.amount ELSE 0 END), 0) as total 
            FROM statement_logs sl
            INNER JOIN statement_batchs sb ON sl.batch_id = sb.id
            LEFT JOIN statement_reconcile_logs srl ON srl.statement_log_id = sl.id
            WHERE srl.id IS NULL AND sl.created_at >= ? AND sl.created_at < ?";
    if ($company_id > 0) $sql .= " AND sb.company_id = $company_id";
    $stmt = $conn->prepare($sql);
    if ($stmt) { $stmt->bind_param("ss", $start_date, $end_date); $stmt->execute(); $r = $stmt->get_result()->fetch_assoc(); $stmt->close();
        $response['unmatched']['statement_logs_unmatched'] = intval($r['cnt']);
        $response['unmatched']['statement_logs_unmatched_amount'] = floatval($r['total']);
    }

    // Orders: full status breakdown for this month
    $sql = "SELECT order_status, COUNT(*) as cnt, 
            COALESCE(SUM(total_amount), 0) as total_amount
            FROM orders WHERE order_date >= ? AND order_date < ?";
    if ($company_id > 0) $sql .= " AND company_id = $company_id";
    $sql .= " GROUP BY order_status ORDER BY cnt DESC";
    $stmt = $conn->prepare($sql);
    if ($stmt) { $stmt->bind_param("ss", $start_date, $end_date); $stmt->execute(); $result = $stmt->get_result();
        $response['unmatched']['order_status_detail'] = [];
        while ($row = $result->fetch_assoc()) {
            $status = $row['order_status'];
            $cnt = intval($row['cnt']);
            $amt = floatval($row['total_amount']);
            $response['unmatched']['order_status_detail'][] = [
                'status' => $status, 'count' => $cnt, 'amount' => $amt,
            ];
            if ($status === 'Delivered') {
                $response['unmatched']['orders_delivered'] = $cnt;
            } elseif ($status === 'PreApproved') {
                $response['unmatched']['orders_preapproved'] = $cnt;
                $response['unmatched']['orders_preapproved_amount'] = $amt;
            }
        }
        $stmt->close();
    }

    echo json_encode(['success' => true, 'data' => $response, 'filters' => [
        'company_id' => $company_id, 'month' => $month, 'year' => $year
    ]]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

if (isset($conn)) $conn->close();

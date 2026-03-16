<?php
/**
 * Talk Time Report API
 * Returns Telesale user statistics: calls, talk time, attendance
 * Grouped by team structure: Supervisor -> Team Members -> Next Team -> Unassigned
 */

include '../db.php';

header('Content-Type: application/json');

// Get parameters from request
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
$month = isset($_GET['month']) ? intval($_GET['month']) : date('m');
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

$startDate = sprintf('%04d-%02d-01', $year, $month);
$endDate = date('Y-m-d', strtotime($startDate . ' +1 month')); // First day of next month for < comparison

// Build company filter
$companyFilter = $company_id > 0 ? "AND u.company_id = ?" : "";
$companyFilterSales = $company_id > 0 ? "AND o.company_id = ?" : "";

// Build access control filter based on user role
$accessFilter = "";
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
        $accessFilter = " AND u.id IN ($ids_str)";
    } elseif ($user_role === 'Telesale') {
        $accessFilter = " AND u.id = $user_id";
        $allowed_user_ids[] = $user_id;
    }
    // Admin or other roles: no filter (see all)
}

try {
    // Main query for Telesale users with call statistics
    $sql = "
        SELECT 
            u.id,
            u.username,
            u.first_name,
            u.last_name,
            u.role,
            u.phone,
            u.company_id,
            u.supervisor_id,
            sup.first_name as supervisor_name,
            sup.id as supervisor_user_id,
            COALESCE(team.team_count, 0) as team_count,
            COALESCE(calls.total_calls, 0) as total_calls,
            COALESCE(calls.connected_calls, 0) as connected_calls,
            COALESCE(calls.total_duration_seconds, 0) as total_duration_seconds,
            COALESCE(att.work_days, 0) as work_days,
            COALESCE(sales.total_sales, 0) as total_sales
        FROM users u
        LEFT JOIN users sup ON u.supervisor_id = sup.id
        LEFT JOIN (
            SELECT supervisor_id, COUNT(*) as team_count 
            FROM users 
            WHERE supervisor_id IS NOT NULL AND status = 'active'
            GROUP BY supervisor_id
        ) team ON team.supervisor_id = u.id
        LEFT JOIN (
            SELECT 
                phone_telesale,
                COUNT(*) as total_calls,
                SUM(CASE WHEN duration >= 40 THEN 1 ELSE 0 END) as connected_calls,
                SUM(duration) as total_duration_seconds
            FROM onecall_log
            WHERE timestamp >= ? AND timestamp < ?
            GROUP BY phone_telesale
        ) calls ON u.phone = calls.phone_telesale
        LEFT JOIN (
            SELECT 
                user_id,
                SUM(attendance_value) as work_days
            FROM user_daily_attendance
            WHERE work_date >= ? AND work_date < ?
            GROUP BY user_id
        ) att ON u.id = att.user_id
        LEFT JOIN (
            SELECT 
                oi.creator_id,
                COALESCE(SUM(oi.net_total), 0) as total_sales
            FROM orders o
            INNER JOIN order_items oi ON o.id = oi.parent_order_id
            WHERE o.order_date >= ? AND o.order_date < ?
            AND o.order_status != 'Cancelled'
            AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
            {$companyFilterSales}
            GROUP BY oi.creator_id
        ) sales ON u.id = sales.creator_id
        WHERE u.role IN ('Telesale', 'Supervisor Telesale')
        AND u.status = 'active'
        {$companyFilter}
        {$accessFilter}
        ORDER BY u.role DESC, u.first_name ASC
    ";

    $stmt = $conn->prepare($sql);
    
    if ($company_id > 0) {
        $stmt->bind_param('ssssssii', $startDate, $endDate, $startDate, $endDate, $startDate, $endDate, $company_id, $company_id);
    } else {
        $stmt->bind_param('ssssss', $startDate, $endDate, $startDate, $endDate, $startDate, $endDate);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $allUsers = [];
    while ($row = $result->fetch_assoc()) {
        $durationMinutes = round($row['total_duration_seconds'] / 60, 1);
        $avgPerDay = $row['work_days'] > 0 
            ? round($durationMinutes / $row['work_days'], 1) 
            : 0;

        $allUsers[] = [
            'id' => intval($row['id']),
            'username' => $row['username'],
            'name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'role' => $row['role'],
            'phone' => $row['phone'],
            'supervisor_id' => $row['supervisor_id'] ? intval($row['supervisor_id']) : null,
            'supervisor_name' => $row['supervisor_name'],
            'team_count' => intval($row['team_count']),
            'total_calls' => intval($row['total_calls']),
            'connected_calls' => intval($row['connected_calls']),
            'total_duration_minutes' => $durationMinutes,
            'avg_per_day_minutes' => $avgPerDay,
            'work_days' => floatval($row['work_days']),
            'total_sales' => floatval($row['total_sales'])
        ];
    }

    // Group by team structure
    $supervisors = [];
    $teamMembers = [];
    $unassigned = [];

    foreach ($allUsers as $user) {
        if ($user['role'] === 'Supervisor Telesale' && $user['team_count'] > 0) {
            // Supervisor with team members
            $supervisors[$user['id']] = $user;
        } elseif ($user['supervisor_id'] !== null) {
            // Team member (has supervisor)
            if (!isset($teamMembers[$user['supervisor_id']])) {
                $teamMembers[$user['supervisor_id']] = [];
            }
            $teamMembers[$user['supervisor_id']][] = $user;
        } else {
            // Unassigned: no supervisor, or supervisor without team
            $unassigned[] = $user;
        }
    }

    // Build grouped response
    $groups = [];
    
    // First: Teams with supervisor + members
    foreach ($supervisors as $supId => $supervisor) {
        $group = [
            'group_type' => 'team',
            'supervisor' => $supervisor,
            'members' => isset($teamMembers[$supId]) ? $teamMembers[$supId] : []
        ];
        $groups[] = $group;
    }

    // Last: Unassigned users (no supervisor or supervisor without team)
    if (count($unassigned) > 0) {
        $groups[] = [
            'group_type' => 'unassigned',
            'supervisor' => null,
            'members' => $unassigned
        ];
    }

    // Get last update date from onecall_log
    $lastUpdateResult = $conn->query("SELECT MAX(timestamp) as last_update FROM onecall_log");
    $lastUpdate = null;
    if ($lastUpdateResult && $row = $lastUpdateResult->fetch_assoc()) {
        $lastUpdate = $row['last_update'];
    }

    echo json_encode([
        'success' => true,
        'data' => $allUsers,
        'groups' => $groups,
        'period' => [
            'year' => $year,
            'month' => $month,
            'start_date' => $startDate,
            'end_date' => $endDate
        ],
        'call_data_last_update' => $lastUpdate
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>

<?php
/**
 * Talk Time Detail API
 * Returns hourly call statistics for a specific user on a specific date
 * Uses call_import_logs table with matched_user_id
 */

include '../db.php';

header('Content-Type: application/json');

// Get parameters
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$requested_date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$auto_latest = isset($_GET['auto_latest']) && $_GET['auto_latest'] === 'true';

if ($user_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'user_id required']);
    exit;
}

// Check if we should auto-select latest date with data
$date = $requested_date;
$redirected = false;
$latest_data_date = null;

if ($auto_latest) {
    $stmt = $conn->prepare("
        SELECT call_date as data_date 
        FROM call_import_logs 
        WHERE matched_user_id = ? 
        ORDER BY call_date DESC 
        LIMIT 1
    ");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $latest_data_date = $row['data_date'];
        if ($requested_date === date('Y-m-d') && $latest_data_date !== $requested_date) {
            $date = $latest_data_date;
            $redirected = true;
        }
    }
}

try {
    // Get user info
    $userInfo = null;
    if ($user_id > 0) {
        $stmt = $conn->prepare("SELECT id, username, first_name, last_name, role, phone FROM users WHERE id = ?");
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $userInfo = [
                'id' => intval($row['id']),
                'name' => trim($row['first_name'] . ' ' . $row['last_name']),
                'role' => $row['role'],
                'phone' => $row['phone']
            ];
        }
    }

    // Get hourly statistics from call_import_logs
    $sql = "
        SELECT 
            HOUR(start_time) as hour,
            COUNT(*) as total_calls,
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as connected_calls,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as missed_calls,
            SUM(TIME_TO_SEC(duration)) as total_duration_seconds
        FROM call_import_logs
        WHERE matched_user_id = ?
        AND call_date = ?
        GROUP BY HOUR(start_time)
        ORDER BY hour ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('is', $user_id, $date);
    $stmt->execute();
    $result = $stmt->get_result();

    $hourlyData = [];
    $totalCalls = 0;
    $totalConnected = 0;
    $totalMissed = 0;
    $totalDuration = 0;

    // Initialize all hours with zeros
    for ($h = 0; $h < 24; $h++) {
        $hourlyData[$h] = [
            'hour' => $h,
            'label' => sprintf('%02d:00', $h),
            'time_range' => sprintf('%02d:00-%02d:00', $h, ($h + 1) % 24),
            'total_calls' => 0,
            'connected_calls' => 0,
            'missed_calls' => 0,
            'duration_seconds' => 0,
            'duration_minutes' => 0,
            'duration_formatted' => '0:00'
        ];
    }

    while ($row = $result->fetch_assoc()) {
        $hour = intval($row['hour']);
        $calls = intval($row['total_calls']);
        $connected = intval($row['connected_calls']);
        $missed = intval($row['missed_calls']);
        $durationSec = intval($row['total_duration_seconds']);
        $mins = floor($durationSec / 60);
        $secs = $durationSec % 60;

        $hourlyData[$hour] = [
            'hour' => $hour,
            'label' => sprintf('%02d:00', $hour),
            'time_range' => sprintf('%02d:00-%02d:00', $hour, ($h + 1) % 24),
            'total_calls' => $calls,
            'connected_calls' => $connected,
            'missed_calls' => $missed,
            'duration_seconds' => $durationSec,
            'duration_minutes' => round($durationSec / 60, 2),
            'duration_formatted' => sprintf('%d:%02d', $mins, $secs)
        ];

        $totalCalls += $calls;
        $totalConnected += $connected;
        $totalMissed += $missed;
        $totalDuration += $durationSec;
    }

    // Calculate averages
    $avgCallDuration = $totalConnected > 0 ? round($totalDuration / $totalConnected, 2) : 0;
    $workingHours = 8;
    $avgPerHour = round($totalDuration / $workingHours, 2);

    echo json_encode([
        'success' => true,
        'user' => $userInfo,
        'date' => $date,
        'requested_date' => $requested_date,
        'redirected' => $redirected,
        'latest_data_date' => $latest_data_date,
        'summary' => [
            'total_calls' => $totalCalls,
            'connected_calls' => $totalConnected,
            'missed_calls' => $totalMissed,
            'total_duration_minutes' => round($totalDuration / 60, 2),
            'avg_call_duration' => $avgCallDuration,
            'avg_per_hour' => $avgPerHour
        ],
        'hourly' => array_values($hourlyData)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>

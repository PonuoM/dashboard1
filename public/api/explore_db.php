<?php
include 'db.php';

echo "=== ONECALL_LOG to USERS join via phone_telesale ===\n";
$result = $conn->query("
SELECT 
    u.id as user_id,
    u.username,
    u.phone,
    COUNT(o.id) as total_calls,
    SUM(CASE WHEN o.duration > 0 THEN 1 ELSE 0 END) as connected_calls,
    SUM(o.duration) as total_duration_seconds
FROM users u
LEFT JOIN onecall_log o ON u.phone = o.phone_telesale
WHERE u.role IN ('Telesale', 'Supervisor Telesale')
GROUP BY u.id
LIMIT 5
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    }
} else {
    echo "Query failed: " . $conn->error . "\n";
}

echo "\n=== USER_DAILY_ATTENDANCE sample ===\n";
$result = $conn->query("
SELECT 
    user_id,
    work_date,
    attendance_value,
    attendance_status
FROM user_daily_attendance
WHERE work_date >= '2026-01-01'
ORDER BY work_date DESC
LIMIT 5
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    }
}

echo "\n=== SUPERVISOR hierarchy sample ===\n";
$result = $conn->query("
SELECT 
    u.id,
    u.username,
    u.role,
    u.supervisor_id,
    s.username as supervisor_name
FROM users u
LEFT JOIN users s ON u.supervisor_id = s.id
WHERE u.role IN ('Telesale', 'Supervisor Telesale')
LIMIT 10
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    }
}

$conn->close();
?>

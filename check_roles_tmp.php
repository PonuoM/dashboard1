<?php
$conn = new mysqli('202.183.192.218', 'primacom_bloguser', 'pJnL53Wkhju2LaGPytw8', 'primacom_mini_erp');
$conn->set_charset('utf8mb4');

// 1. Column structure
echo "=== call_import_logs COLUMNS ===" . PHP_EOL;
$r = $conn->query("DESCRIBE call_import_logs");
while($row = $r->fetch_assoc()) {
    echo str_pad($row['Field'], 30) . str_pad($row['Type'], 25) . str_pad($row['Null'], 6) . $row['Key'] . PHP_EOL;
}

// 2. Row count
$r = $conn->query("SELECT COUNT(*) as cnt FROM call_import_logs");
$cnt = $r->fetch_assoc();
echo PHP_EOL . "Total rows: " . number_format($cnt['cnt']) . PHP_EOL;

// 3. Sample data (5 rows)
echo PHP_EOL . "=== SAMPLE DATA (5 rows) ===" . PHP_EOL;
$r = $conn->query("SELECT * FROM call_import_logs ORDER BY id DESC LIMIT 5");
while($row = $r->fetch_assoc()) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE) . PHP_EOL;
}

// 4. Date range
echo PHP_EOL . "=== DATE RANGE ===" . PHP_EOL;
$r = $conn->query("SELECT MIN(call_date) as min_date, MAX(call_date) as max_date FROM call_import_logs");
$range = $r->fetch_assoc();
echo "Min: " . $range['min_date'] . " | Max: " . $range['max_date'] . PHP_EOL;

// 5. Compare with onecall_log
echo PHP_EOL . "=== COMPARE: onecall_log ===" . PHP_EOL;
$r = $conn->query("DESCRIBE onecall_log");
while($row = $r->fetch_assoc()) {
    echo str_pad($row['Field'], 30) . str_pad($row['Type'], 25) . str_pad($row['Null'], 6) . $row['Key'] . PHP_EOL;
}
$r = $conn->query("SELECT COUNT(*) as cnt FROM onecall_log");
$cnt = $r->fetch_assoc();
echo "onecall_log rows: " . number_format($cnt['cnt']) . PHP_EOL;

// 6. call_import_logs stats for 2026-03
echo PHP_EOL . "=== call_import_logs MARCH 2026 ===" . PHP_EOL;
$r = $conn->query("
    SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT caller_number) as unique_callers,
        COUNT(DISTINCT destination_number) as unique_destinations,
        SUM(CASE WHEN duration > 0 THEN 1 ELSE 0 END) as connected_calls,
        ROUND(AVG(duration), 1) as avg_duration
    FROM call_import_logs 
    WHERE call_date >= '2026-03-01' AND call_date < '2026-04-01'
");
$stats = $r->fetch_assoc();
echo json_encode($stats, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

$conn->close();

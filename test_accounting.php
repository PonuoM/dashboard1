<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: text/plain; charset=utf-8");
$conn = new mysqli('202.183.192.218', 'primacom_bloguser', 'pJnL53Wkhju2LaGPytw8', 'primacom_mini_erp');
$conn->set_charset("utf8mb4");

echo "=== statement_logs columns ===\n";
$cols = $conn->query("SHOW COLUMNS FROM statement_logs");
while ($c = $cols->fetch_assoc()) echo "  {$c['Field']} ({$c['Type']})\n";

echo "\n=== statement_reconcile_logs columns ===\n";
$cols = $conn->query("SHOW COLUMNS FROM statement_reconcile_logs");
while ($c = $cols->fetch_assoc()) echo "  {$c['Field']} ({$c['Type']})\n";

echo "\n=== statement_reconcile_batches columns ===\n";
$cols = $conn->query("SHOW COLUMNS FROM statement_reconcile_batches");
while ($c = $cols->fetch_assoc()) echo "  {$c['Field']} ({$c['Type']})\n";

echo "\n=== statement_logs sample (confirmed vs null) ===\n";
$r = $conn->query("SELECT statement_reconcile_logs, COUNT(*) as cnt FROM statement_logs GROUP BY CASE WHEN statement_reconcile_logs IS NULL THEN 'NULL' ELSE 'HAS_VALUE' END LIMIT 5");
while ($row = $r->fetch_assoc()) echo "  reconcile_ref=" . ($row['statement_reconcile_logs'] ?? 'NULL') . " count={$row['cnt']}\n";

echo "\n=== statement_reconcile_logs confirmed_action distribution ===\n";
$r = $conn->query("SELECT COALESCE(confirmed_action, 'NULL') as action, COUNT(*) as cnt FROM statement_reconcile_logs GROUP BY confirmed_action");
while ($row = $r->fetch_assoc()) echo "  {$row['action']} = {$row['cnt']}\n";

echo "\n=== order_status distribution (2026) ===\n";
$r = $conn->query("SELECT order_status, COUNT(*) as cnt FROM orders WHERE order_date >= '2026-01-01' GROUP BY order_status ORDER BY cnt DESC");
while ($row = $r->fetch_assoc()) echo "  {$row['order_status']} = {$row['cnt']}\n";

echo "\n=== statement_logs: matched vs unmatched (2026) ===\n";
$r = $conn->query("SELECT 
    SUM(CASE WHEN statement_reconcile_logs IS NOT NULL THEN 1 ELSE 0 END) as matched,
    SUM(CASE WHEN statement_reconcile_logs IS NULL THEN 1 ELSE 0 END) as unmatched,
    COUNT(*) as total
    FROM statement_logs WHERE created_at >= '2026-01-01'");
$row = $r->fetch_assoc();
echo "  matched={$row['matched']} unmatched={$row['unmatched']} total={$row['total']}\n";

echo "\n=== statement_reconcile_logs: confirmed vs null (2026) ===\n";
$r = $conn->query("SELECT 
    SUM(CASE WHEN confirmed_action IS NOT NULL THEN 1 ELSE 0 END) as confirmed,
    SUM(CASE WHEN confirmed_action IS NULL THEN 1 ELSE 0 END) as unconfirmed,
    COUNT(*) as total
    FROM statement_reconcile_logs WHERE created_at >= '2026-01-01'");
$row = $r->fetch_assoc();
echo "  confirmed={$row['confirmed']} unconfirmed={$row['unconfirmed']} total={$row['total']}\n";

$conn->close();

<?php
/**
 * Debug Sales Report - Check what data exists
 */

header("Content-Type: application/json; charset=utf-8");
include '../db.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$month = isset($_GET['month']) ? intval($_GET['month']) : 1;
$year = isset($_GET['year']) ? intval($_GET['year']) : 2026;

$start_date = sprintf('%04d-%02d-01 00:00:00', $year, $month);
$end_date = date('Y-m-d 00:00:00', strtotime($start_date . ' +1 month'));

$debug = [];

// Check 1: Orders in date range for this company
$sql1 = "SELECT COUNT(*) as cnt FROM orders WHERE company_id = ? AND order_date >= ? AND order_date < ?";
$stmt = $conn->prepare($sql1);
$stmt->bind_param("iss", $company_id, $start_date, $end_date);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$debug['total_orders_in_range'] = $result['cnt'];
$stmt->close();

// Check 2: Orders by Telesale/Supervisor Telesale
$sql2 = "
    SELECT COUNT(*) as cnt 
    FROM orders o 
    INNER JOIN users u ON o.creator_id = u.id 
    WHERE o.company_id = ? 
    AND o.order_date >= ? 
    AND o.order_date < ?
    AND u.role IN ('Telesale', 'Supervisor Telesale')
";
$stmt = $conn->prepare($sql2);
$stmt->bind_param("iss", $company_id, $start_date, $end_date);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$debug['orders_by_telesale'] = $result['cnt'];
$stmt->close();

// Check 3: Product categories
$sql3 = "SELECT DISTINCT category FROM products LIMIT 20";
$result = $conn->query($sql3);
$categories = [];
while ($row = $result->fetch_assoc()) {
    $categories[] = $row['category'];
}
$debug['product_categories'] = $categories;

// Check 4: Order items with product info
$sql4 = "
    SELECT COUNT(*) as cnt
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.parent_order_id
    INNER JOIN products p ON oi.product_id = p.id
    INNER JOIN users u ON o.creator_id = u.id
    WHERE o.company_id = ?
    AND o.order_date >= ?
    AND o.order_date < ?
    AND u.role IN ('Telesale', 'Supervisor Telesale')
    AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
";
$stmt = $conn->prepare($sql4);
$stmt->bind_param("iss", $company_id, $start_date, $end_date);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();
$debug['matching_order_items'] = $result['cnt'];
$stmt->close();

// Check 5: Sample roles in users table
$sql5 = "SELECT DISTINCT role FROM users LIMIT 20";
$result = $conn->query($sql5);
$roles = [];
while ($row = $result->fetch_assoc()) {
    $roles[] = $row['role'];
}
$debug['user_roles'] = $roles;

// Check 6: All companies
$sql6 = "SELECT id, name FROM companies LIMIT 10";
$result = $conn->query($sql6);
$companies = [];
while ($row = $result->fetch_assoc()) {
    $companies[] = $row;
}
$debug['companies'] = $companies;

echo json_encode([
    'filters' => [
        'company_id' => $company_id,
        'month' => $month,
        'year' => $year,
        'start_date' => $start_date,
        'end_date' => $end_date
    ],
    'debug' => $debug
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

$conn->close();
?>

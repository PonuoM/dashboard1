<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['company_id'] = 1;
$_GET['department'] = 'Admin Page';
$_GET['month'] = 3;
$_GET['year'] = 2026;
$_GET['status_type'] = 'returned';
chdir('public/api/reports');
include 'other_orders.php';
?>

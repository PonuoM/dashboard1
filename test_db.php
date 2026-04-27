<?php
include 'public/api/config.php';
$conn = new mysqli($host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$res = $conn->query("SELECT count(*) as c FROM call_import_logs");
if ($res) {
    $row = $res->fetch_assoc();
    echo "Count: " . $row['c'] . "\n";
} else {
    echo "Error: " . $conn->error;
}
?>

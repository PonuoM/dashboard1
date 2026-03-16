<?php
include 'db.php';

echo "=== MARKETING_ADS_LOG columns ===\n";
$result = $conn->query("DESCRIBE marketing_ads_log");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        echo $row['Field'] . "\n";
    }
}

echo "\n=== Sample data (1 row) ===\n";
$result = $conn->query("SELECT * FROM marketing_ads_log ORDER BY id DESC LIMIT 1");
if ($result && $row = $result->fetch_assoc()) {
    foreach ($row as $key => $val) {
        echo "$key: $val\n";
    }
}

$conn->close();
?>

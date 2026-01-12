<?php
include 'db.php';

// Prepare array for JSON output
$data = [];

// Check if table users exists (just for safety in this example, or just query)
// We assume 'users' table exists as per requirements
$sql = "SELECT * FROM users";

// Execute query
// Suppress errors for the example if table doesn't exist
try {
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
      while($row = $result->fetch_assoc()) {
        $data[] = $row;
      }
    }
} catch (Exception $e) {
    // In production, handle error properly
    $data = ["error" => $e->getMessage()];
}

// Return JSON
header('Content-Type: application/json');
echo json_encode($data);

$conn->close();
?>

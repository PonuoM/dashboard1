<?php
/**
 * Migration: Create sales_targets table
 * Run this once to create the table
 */

header("Content-Type: text/plain; charset=utf-8");

include '../db.php';

$sql = "CREATE TABLE IF NOT EXISTS `sales_targets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `month` TINYINT NOT NULL COMMENT '1-12',
  `year` INT NOT NULL COMMENT 'e.g. 2026',
  `target_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_month_year` (`user_id`, `month`, `year`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conn->query($sql) === TRUE) {
    echo "Table 'sales_targets' created successfully!\n";
    
    // Insert sample data for January 2026
    // First, get some user IDs
    $users_result = $conn->query("SELECT id, first_name FROM users WHERE role IN ('Telesale', 'Supervisor Telesale') LIMIT 10");
    
    if ($users_result->num_rows > 0) {
        echo "\nInserting sample targets for January 2026:\n";
        
        while ($user = $users_result->fetch_assoc()) {
            $user_id = $user['id'];
            $target = rand(30000, 60000); // Random target between 30k-60k
            
            $insert_sql = "INSERT IGNORE INTO sales_targets (user_id, month, year, target_amount) VALUES (?, 1, 2026, ?)";
            $stmt = $conn->prepare($insert_sql);
            $stmt->bind_param("id", $user_id, $target);
            $stmt->execute();
            
            echo "- {$user['first_name']} (ID: {$user_id}): Target ฿" . number_format($target) . "\n";
            $stmt->close();
        }
    }
    
} else {
    echo "Error creating table: " . $conn->error . "\n";
}

$conn->close();
echo "\nDone!";
?>

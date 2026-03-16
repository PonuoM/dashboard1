-- Sales Targets Table
-- Stores individual target amounts per user per month per year

CREATE TABLE IF NOT EXISTS `sales_targets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `month` TINYINT NOT NULL COMMENT '1-12',
  `year` INT NOT NULL COMMENT 'e.g. 2026',
  `target_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_month_year` (`user_id`, `month`, `year`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data for January 2026 (adjust user_ids based on your actual users)
-- You can run this after checking user IDs with: SELECT id, first_name FROM users WHERE role IN ('Telesale', 'Supervisor Telesale');

-- INSERT INTO sales_targets (user_id, month, year, target_amount) VALUES
-- (1, 1, 2026, 50000.00),
-- (2, 1, 2026, 40000.00),
-- (3, 1, 2026, 45000.00);

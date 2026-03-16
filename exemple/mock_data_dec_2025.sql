-- =====================================================
-- Mock Data for December 2025 (ธันวาคม 2568)
-- For testing MoM comparison with January 2026
-- =====================================================

SET NAMES 'utf8mb4';
START TRANSACTION;

-- =====================================================
-- Orders for December 2025
-- =====================================================
-- Using existing users from January mock data

-- Get first user ID from existing mock users
SET @first_new_user_id = (SELECT MIN(id) FROM users WHERE username LIKE 'ts_jan%' AND company_id = 1);
SET @first_customer_id = (SELECT MIN(id) FROM customers WHERE first_name LIKE 'ลูกค้าใหม่%' AND company_id = 1);

-- Fertilizer Orders (30 orders) - Lower than January to show growth
INSERT INTO `orders` (`id`, `customer_id`, `company_id`, `creator_id`, `order_date`, `total_amount`, `payment_method`, `payment_status`, `order_status`, `sales_channel`) VALUES
('ORD2512-0001', @first_customer_id, 1, @first_new_user_id, '2025-12-01 09:00:00', 3500.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0002', @first_customer_id+1, 1, @first_new_user_id+1, '2025-12-02 10:30:00', 4200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0003', @first_customer_id+2, 1, @first_new_user_id+2, '2025-12-03 11:15:00', 2800.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0004', @first_customer_id+3, 1, @first_new_user_id+3, '2025-12-04 14:00:00', 5100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0005', @first_customer_id+4, 1, @first_new_user_id+4, '2025-12-05 09:30:00', 3900.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0006', @first_customer_id+5, 1, @first_new_user_id+5, '2025-12-06 10:00:00', 4500.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0007', @first_customer_id+6, 1, @first_new_user_id+6, '2025-12-07 11:45:00', 2900.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0008', @first_customer_id+7, 1, @first_new_user_id+7, '2025-12-08 13:30:00', 6100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0009', @first_customer_id+8, 1, @first_new_user_id+8, '2025-12-09 08:45:00', 3200.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0010', @first_customer_id+9, 1, @first_new_user_id+9, '2025-12-10 15:00:00', 4800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0011', @first_customer_id+10, 1, @first_new_user_id+10, '2025-12-11 09:20:00', 3600.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0012', @first_customer_id+11, 1, @first_new_user_id+11, '2025-12-12 10:40:00', 5500.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0013', @first_customer_id+12, 1, @first_new_user_id+12, '2025-12-13 11:00:00', 2700.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0014', @first_customer_id+13, 1, @first_new_user_id+13, '2025-12-14 14:30:00', 4100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0015', @first_customer_id+14, 1, @first_new_user_id+14, '2025-12-15 09:15:00', 3800.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0016', @first_customer_id+15, 1, @first_new_user_id, '2025-12-16 10:30:00', 5200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0017', @first_customer_id+16, 1, @first_new_user_id+1, '2025-12-17 11:45:00', 2500.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0018', @first_customer_id+17, 1, @first_new_user_id+2, '2025-12-18 13:00:00', 4400.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0019', @first_customer_id+18, 1, @first_new_user_id+3, '2025-12-19 08:30:00', 3100.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0020', @first_customer_id+19, 1, @first_new_user_id+4, '2025-12-20 14:45:00', 5800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0021', @first_customer_id+20, 1, @first_new_user_id+5, '2025-12-21 09:00:00', 2600.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0022', @first_customer_id+21, 1, @first_new_user_id+6, '2025-12-22 10:15:00', 4700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0023', @first_customer_id+22, 1, @first_new_user_id+7, '2025-12-23 11:30:00', 3300.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0024', @first_customer_id+23, 1, @first_new_user_id+8, '2025-12-24 13:45:00', 6000.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0025', @first_customer_id+24, 1, @first_new_user_id+9, '2025-12-25 08:00:00', 2400.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0026', @first_customer_id+25, 1, @first_new_user_id+10, '2025-12-26 14:00:00', 5300.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0027', @first_customer_id+26, 1, @first_new_user_id+11, '2025-12-27 09:30:00', 3700.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0028', @first_customer_id+27, 1, @first_new_user_id+12, '2025-12-28 10:45:00', 4300.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0029', @first_customer_id+28, 1, @first_new_user_id+13, '2025-12-29 11:15:00', 2950.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0030', @first_customer_id+29, 1, @first_new_user_id+14, '2025-12-30 13:30:00', 5600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),

-- Bio Products Orders (20 orders) - Lower than January
('ORD2512-0031', @first_customer_id+30, 1, @first_new_user_id, '2025-12-03 10:00:00', 1600.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0032', @first_customer_id+31, 1, @first_new_user_id+1, '2025-12-05 11:30:00', 2100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0033', @first_customer_id+32, 1, @first_new_user_id+2, '2025-12-07 09:45:00', 1400.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0034', @first_customer_id+33, 1, @first_new_user_id+3, '2025-12-09 14:15:00', 2600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0035', @first_customer_id+34, 1, @first_new_user_id+4, '2025-12-11 10:30:00', 1800.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0036', @first_customer_id+35, 1, @first_new_user_id+5, '2025-12-13 11:45:00', 2300.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0037', @first_customer_id+36, 1, @first_new_user_id+6, '2025-12-15 08:00:00', 1500.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0038', @first_customer_id+37, 1, @first_new_user_id+7, '2025-12-17 13:30:00', 2800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0039', @first_customer_id+38, 1, @first_new_user_id+8, '2025-12-19 09:15:00', 1700.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0040', @first_customer_id+39, 1, @first_new_user_id+9, '2025-12-21 14:45:00', 2200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0041', @first_customer_id, 1, @first_new_user_id+10, '2025-12-23 10:00:00', 1900.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0042', @first_customer_id+1, 1, @first_new_user_id+11, '2025-12-25 11:30:00', 2500.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0043', @first_customer_id+2, 1, @first_new_user_id+12, '2025-12-27 08:45:00', 1350.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0044', @first_customer_id+3, 1, @first_new_user_id+13, '2025-12-28 13:00:00', 2700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0045', @first_customer_id+4, 1, @first_new_user_id+14, '2025-12-29 09:30:00', 1650.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0046', @first_customer_id+5, 1, @first_new_user_id, '2025-12-30 14:15:00', 2400.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0047', @first_customer_id+6, 1, @first_new_user_id+1, '2025-12-30 10:45:00', 1550.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0048', @first_customer_id+7, 1, @first_new_user_id+2, '2025-12-30 11:15:00', 2150.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0049', @first_customer_id+8, 1, @first_new_user_id+3, '2025-12-31 09:00:00', 1450.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2512-0050', @first_customer_id+9, 1, @first_new_user_id+4, '2025-12-31 14:30:00', 2000.00, 'Transfer', 'Paid', 'Delivered', 'โทร');

-- =====================================================
-- Order Items for December 2025
-- =====================================================

-- Fertilizer items (30 orders)
INSERT INTO `order_items` (`parent_order_id`, `product_name`, `quantity`, `price_per_unit`, `net_total`, `product_id`) 
SELECT o.id, 'ปุ๋ยสูตรพิเศษ', FLOOR(1 + RAND() * 5), o.total_amount / FLOOR(1 + RAND() * 5), o.total_amount, 
       (SELECT id FROM products WHERE company_id = 1 AND category = 'ปุ๋ย' LIMIT 1)
FROM orders o WHERE o.id BETWEEN 'ORD2512-0001' AND 'ORD2512-0030';

-- Bio items (20 orders)
INSERT INTO `order_items` (`parent_order_id`, `product_name`, `quantity`, `price_per_unit`, `net_total`, `product_id`) 
SELECT o.id, 'ชีวภัณฑ์อินทรีย์', FLOOR(1 + RAND() * 3), o.total_amount / FLOOR(1 + RAND() * 3), o.total_amount,
       (SELECT id FROM products WHERE company_id = 1 AND category = 'ชีวภัณฑ์' LIMIT 1)
FROM orders o WHERE o.id BETWEEN 'ORD2512-0031' AND 'ORD2512-0050';

COMMIT;

-- =====================================================
-- SUMMARY (December 2025):
-- - 50 orders total
--   - 30 Fertilizer orders (~120,300 THB)
--   - 20 Bio product orders (~39,650 THB)
-- Total: ~159,950 THB
-- 
-- Compared to January 2026:
-- - Fertilizer: 120,300 -> 261,350 = +117% growth
-- - Bio: 39,650 -> 87,250 = +120% growth
-- =====================================================

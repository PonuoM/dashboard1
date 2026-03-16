-- =====================================================
-- Mock Data for Sales Report Dashboard - January 2026
-- Company 1 - 15 Users, 100+ Orders
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

-- =====================================================
-- 1. Insert 15 New Telesale/Supervisor Users (company_id = 1)
-- =====================================================
-- Password: bcrypt hash of '1234'
SET @hash_password = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- First get role_ids for Telesale and Supervisor Telesale
-- Assuming: Telesale = role_id 3, Supervisor Telesale = role_id 5
-- If roles don't exist, adjust accordingly

INSERT INTO `users` (`username`, `password`, `first_name`, `last_name`, `role`, `company_id`, `status`, `role_id`) VALUES
-- Telesales (10 people)
('ts_somchai', @hash_password, 'สมชาย', 'ใจดี', 'Telesale', 1, 'active', 3),
('ts_suree', @hash_password, 'สุรีย์', 'แสงทอง', 'Telesale', 1, 'active', 3),
('ts_pranee', @hash_password, 'ปราณี', 'รักษ์ไทย', 'Telesale', 1, 'active', 3),
('ts_wichai', @hash_password, 'วิชัย', 'มั่นคง', 'Telesale', 1, 'active', 3),
('ts_napat', @hash_password, 'ณภัทร', 'รุ่งเรือง', 'Telesale', 1, 'active', 3),
('ts_jariya', @hash_password, 'จริยา', 'สมใจ', 'Telesale', 1, 'active', 3),
('ts_kittipong', @hash_password, 'กิตติพงษ์', 'เจริญ', 'Telesale', 1, 'active', 3),
('ts_manee', @hash_password, 'มณี', 'ทองคำ', 'Telesale', 1, 'active', 3),
('ts_prayut', @hash_password, 'ประยุทธ์', 'ศรีสุข', 'Telesale', 1, 'active', 3),
('ts_anan', @hash_password, 'อนันต์', 'ก้าวหน้า', 'Telesale', 1, 'active', 3),
-- Supervisor Telesales (5 people)
('sv_thongchai', @hash_password, 'ธงชัย', 'ผู้นำ', 'Supervisor Telesale', 1, 'active', 5),
('sv_ratree', @hash_password, 'ราตรี', 'หัวหน้า', 'Supervisor Telesale', 1, 'active', 5),
('sv_sompong', @hash_password, 'สมพงษ์', 'บริหาร', 'Supervisor Telesale', 1, 'active', 5),
('sv_warin', @hash_password, 'วริน', 'จัดการ', 'Supervisor Telesale', 1, 'active', 5),
('sv_chalerm', @hash_password, 'เฉลิม', 'ดูแล', 'Supervisor Telesale', 1, 'active', 5);

-- Get the last inserted user IDs
SET @first_new_user_id = LAST_INSERT_ID();

-- =====================================================
-- 2. Insert Customers for Company 1
-- =====================================================
-- Note: bucket_type is a generated column, don't include it
INSERT INTO `customers` (`customer_ref_id`, `first_name`, `last_name`, `phone`, `province`, `company_id`, `assigned_to`, `lifecycle_status`) VALUES
('C2601-001', 'นายสมศักดิ์', 'ทำนา', '0811111001', 'เชียงใหม่', 1, @first_new_user_id, 'Active'),
('C2601-002', 'นางสาวนภา', 'สวนผัก', '0811111002', 'เชียงราย', 1, @first_new_user_id+1, 'Active'),
('C2601-003', 'นายบุญมี', 'ไร่อ้อย', '0811111003', 'ลำพูน', 1, @first_new_user_id+2, 'Active'),
('C2601-004', 'นางสมหมาย', 'ชาวสวน', '0811111004', 'ลำปาง', 1, @first_new_user_id+3, 'Active'),
('C2601-005', 'นายประเสริฐ', 'ไร่ข้าว', '0811111005', 'พะเยา', 1, @first_new_user_id+4, 'Active'),
('C2601-006', 'นางสาวรุ่งนภา', 'สวนยาง', '0811111006', 'แพร่', 1, @first_new_user_id+5, 'Active'),
('C2601-007', 'นายวิโรจน์', 'ไร่มัน', '0811111007', 'น่าน', 1, @first_new_user_id+6, 'Active'),
('C2601-008', 'นางบังอร', 'สวนลำไย', '0811111008', 'อุตรดิตถ์', 1, @first_new_user_id+7, 'Active'),
('C2601-009', 'นายสุทธิ', 'ชาวไร่', '0811111009', 'ตาก', 1, @first_new_user_id+8, 'Active'),
('C2601-010', 'นางสาวพิมพ์', 'สวนส้ม', '0811111010', 'สุโขทัย', 1, @first_new_user_id+9, 'Active'),
-- More customers for variety
('C2601-011', 'นายจักรพันธ์', 'ทุ่งนา', '0811111011', 'พิษณุโลก', 1, @first_new_user_id, 'Active'),
('C2601-012', 'นางมาลี', 'สวนผลไม้', '0811111012', 'เพชรบูรณ์', 1, @first_new_user_id+1, 'Active'),
('C2601-013', 'นายเดช', 'ไร่ปาล์ม', '0811111013', 'กำแพงเพชร', 1, @first_new_user_id+2, 'Active'),
('C2601-014', 'นางสาวสุนิสา', 'สวนทุเรียน', '0811111014', 'พิจิตร', 1, @first_new_user_id+3, 'Active'),
('C2601-015', 'นายประสิทธิ์', 'นาข้าว', '0811111015', 'นครสวรรค์', 1, @first_new_user_id+4, 'Active'),
('C2601-016', 'นางสาวจิตรา', 'สวนมะพร้าว', '0811111016', 'อุทัยธานี', 1, @first_new_user_id+10, 'Active'),
('C2601-017', 'นายสมภพ', 'ไร่ถั่ว', '0811111017', 'ชัยนาท', 1, @first_new_user_id+11, 'Active'),
('C2601-018', 'นางเพ็ญศรี', 'สวนมังคุด', '0811111018', 'สิงห์บุรี', 1, @first_new_user_id+12, 'Active'),
('C2601-019', 'นายวินัย', 'นาดำ', '0811111019', 'อ่างทอง', 1, @first_new_user_id+13, 'Active'),
('C2601-020', 'นางสาวอรุณี', 'สวนพริก', '0811111020', 'ลพบุรี', 1, @first_new_user_id+14, 'Active'),
-- More customers (20 more for reaching 100 orders target)
('C2601-021', 'นายกิตติ', 'ทุ่งหญ้า', '0811111021', 'สระบุรี', 1, @first_new_user_id, 'Active'),
('C2601-022', 'นางสาวนวล', 'สวนกาแฟ', '0811111022', 'ปราจีนบุรี', 1, @first_new_user_id+1, 'Active'),
('C2601-023', 'นายอุดม', 'ไร่สับปะรด', '0811111023', 'สระแก้ว', 1, @first_new_user_id+2, 'Active'),
('C2601-024', 'นางบุญเรือน', 'สวนลิ้นจี่', '0811111024', 'นครราชสีมา', 1, @first_new_user_id+3, 'Active'),
('C2601-025', 'นายสำราญ', 'นาสวน', '0811111025', 'บุรีรัมย์', 1, @first_new_user_id+4, 'Active'),
('C2601-026', 'นางสาววรรณา', 'สวนกล้วย', '0811111026', 'สุรินทร์', 1, @first_new_user_id+5, 'Active'),
('C2601-027', 'นายพิชัย', 'ไร่อ้อย', '0811111027', 'ศรีสะเกษ', 1, @first_new_user_id+6, 'Active'),
('C2601-028', 'นางละออ', 'สวนเงาะ', '0811111028', 'อุบลราชธานี', 1, @first_new_user_id+7, 'Active'),
('C2601-029', 'นายเกษม', 'นาเกษตร', '0811111029', 'ยโสธร', 1, @first_new_user_id+8, 'Active'),
('C2601-030', 'นางสาวอัมพร', 'สวนฝรั่ง', '0811111030', 'ชัยภูมิ', 1, @first_new_user_id+9, 'Active'),
('C2601-031', 'นายสุวิทย์', 'ทุ่งเกษตร', '0811111031', 'อำนาจเจริญ', 1, @first_new_user_id+10, 'Active'),
('C2601-032', 'นางสาวกัลยา', 'สวนเกษตร', '0811111032', 'หนองบัวลำภู', 1, @first_new_user_id+11, 'Active'),
('C2601-033', 'นายชาติชาย', 'ไร่เกษตร', '0811111033', 'ขอนแก่น', 1, @first_new_user_id+12, 'Active'),
('C2601-034', 'นางจำปี', 'สวนเกษตร', '0811111034', 'อุดรธานี', 1, @first_new_user_id+13, 'Active'),
('C2601-035', 'นายทองดี', 'นาธาตุ', '0811111035', 'เลย', 1, @first_new_user_id+14, 'Active'),
('C2601-036', 'นางสาวสุดา', 'สวนหลัก', '0811111036', 'หนองคาย', 1, @first_new_user_id, 'Active'),
('C2601-037', 'นายบุญส่ง', 'ไร่หลัก', '0811111037', 'มหาสารคาม', 1, @first_new_user_id+1, 'Active'),
('C2601-038', 'นางดอกไม้', 'สวนหลัก', '0811111038', 'ร้อยเอ็ด', 1, @first_new_user_id+2, 'Active'),
('C2601-039', 'นายสัมพันธ์', 'นาสุข', '0811111039', 'กาฬสินธุ์', 1, @first_new_user_id+3, 'Active'),
('C2601-040', 'นางสาวนุชนาถ', 'สวนสุข', '0811111040', 'สกลนคร', 1, @first_new_user_id+4, 'Active');

SET @first_customer_id = LAST_INSERT_ID();

-- =====================================================
-- 3. Create 100+ Orders for January 2026
-- =====================================================
-- We need product IDs from Company 1 first
-- Assuming products exist: Let's use a variety of dates in January 2026

-- Sample Order IDs format: ORD2601-XXXX
-- Random products will be assigned

-- Fertilizer Orders (60 orders) - ปุ๋ย
INSERT INTO `orders` (`id`, `customer_id`, `company_id`, `creator_id`, `order_date`, `total_amount`, `payment_method`, `payment_status`, `order_status`, `sales_channel`) VALUES
('ORD2601-0001', @first_customer_id, 1, @first_new_user_id, '2026-01-02 09:15:00', 2500.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0002', @first_customer_id+1, 1, @first_new_user_id+1, '2026-01-02 10:30:00', 3200.00, 'Transfer', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0003', @first_customer_id+2, 1, @first_new_user_id+2, '2026-01-03 11:00:00', 4500.00, 'COD', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0004', @first_customer_id+3, 1, @first_new_user_id+3, '2026-01-03 14:20:00', 1800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0005', @first_customer_id+4, 1, @first_new_user_id+4, '2026-01-04 09:00:00', 5200.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0006', @first_customer_id+5, 1, @first_new_user_id+5, '2026-01-04 10:45:00', 2800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0007', @first_customer_id+6, 1, @first_new_user_id+6, '2026-01-05 08:30:00', 6100.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0008', @first_customer_id+7, 1, @first_new_user_id+7, '2026-01-05 13:15:00', 3500.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0009', @first_customer_id+8, 1, @first_new_user_id+8, '2026-01-06 09:20:00', 4200.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0010', @first_customer_id+9, 1, @first_new_user_id+9, '2026-01-06 15:00:00', 2900.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0011', @first_customer_id+10, 1, @first_new_user_id, '2026-01-07 10:00:00', 5500.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0012', @first_customer_id+11, 1, @first_new_user_id+1, '2026-01-07 11:30:00', 3800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0013', @first_customer_id+12, 1, @first_new_user_id+2, '2026-01-08 09:45:00', 4700.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0014', @first_customer_id+13, 1, @first_new_user_id+3, '2026-01-08 14:00:00', 2200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0015', @first_customer_id+14, 1, @first_new_user_id+4, '2026-01-09 08:15:00', 6800.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0016', @first_customer_id+15, 1, @first_new_user_id+10, '2026-01-09 10:30:00', 3100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0017', @first_customer_id+16, 1, @first_new_user_id+11, '2026-01-10 09:00:00', 4400.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0018', @first_customer_id+17, 1, @first_new_user_id+12, '2026-01-10 13:45:00', 5100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0019', @first_customer_id+18, 1, @first_new_user_id+13, '2026-01-11 08:30:00', 2600.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0020', @first_customer_id+19, 1, @first_new_user_id+14, '2026-01-11 11:15:00', 3900.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
-- More Fertilizer Orders
('ORD2601-0021', @first_customer_id+20, 1, @first_new_user_id, '2026-01-12 09:30:00', 7200.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0022', @first_customer_id+21, 1, @first_new_user_id+1, '2026-01-12 14:00:00', 4600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0023', @first_customer_id+22, 1, @first_new_user_id+2, '2026-01-13 10:15:00', 3300.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0024', @first_customer_id+23, 1, @first_new_user_id+3, '2026-01-13 15:30:00', 5800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0025', @first_customer_id+24, 1, @first_new_user_id+4, '2026-01-14 08:45:00', 2100.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0026', @first_customer_id+25, 1, @first_new_user_id+5, '2026-01-14 11:00:00', 4900.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0027', @first_customer_id+26, 1, @first_new_user_id+6, '2026-01-15 09:20:00', 6500.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0028', @first_customer_id+27, 1, @first_new_user_id+7, '2026-01-15 13:40:00', 3700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0029', @first_customer_id+28, 1, @first_new_user_id+8, '2026-01-16 10:00:00', 4100.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0030', @first_customer_id+29, 1, @first_new_user_id+9, '2026-01-16 14:15:00', 2700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0031', @first_customer_id+30, 1, @first_new_user_id+10, '2026-01-17 08:30:00', 5300.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0032', @first_customer_id+31, 1, @first_new_user_id+11, '2026-01-17 11:45:00', 3400.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0033', @first_customer_id+32, 1, @first_new_user_id+12, '2026-01-18 09:10:00', 4800.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0034', @first_customer_id+33, 1, @first_new_user_id+13, '2026-01-18 14:30:00', 6200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0035', @first_customer_id+34, 1, @first_new_user_id+14, '2026-01-19 08:00:00', 2400.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0036', @first_customer_id+35, 1, @first_new_user_id, '2026-01-19 10:20:00', 5600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0037', @first_customer_id+36, 1, @first_new_user_id+1, '2026-01-20 09:40:00', 3000.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0038', @first_customer_id+37, 1, @first_new_user_id+2, '2026-01-20 13:00:00', 4300.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0039', @first_customer_id+38, 1, @first_new_user_id+3, '2026-01-21 08:50:00', 7500.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0040', @first_customer_id+39, 1, @first_new_user_id+4, '2026-01-21 11:30:00', 2300.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
-- Continue with more fertilizer orders...
('ORD2601-0041', @first_customer_id, 1, @first_new_user_id+5, '2026-01-22 09:15:00', 5900.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0042', @first_customer_id+1, 1, @first_new_user_id+6, '2026-01-22 14:45:00', 3600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0043', @first_customer_id+2, 1, @first_new_user_id+7, '2026-01-23 10:30:00', 4000.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0044', @first_customer_id+3, 1, @first_new_user_id+8, '2026-01-23 15:00:00', 6700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0045', @first_customer_id+4, 1, @first_new_user_id+9, '2026-01-24 08:20:00', 2850.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0046', @first_customer_id+5, 1, @first_new_user_id+10, '2026-01-24 11:40:00', 5150.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0047', @first_customer_id+6, 1, @first_new_user_id+11, '2026-01-25 09:50:00', 3950.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0048', @first_customer_id+7, 1, @first_new_user_id+12, '2026-01-25 13:25:00', 4650.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0049', @first_customer_id+8, 1, @first_new_user_id+13, '2026-01-26 10:10:00', 6350.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0050', @first_customer_id+9, 1, @first_new_user_id+14, '2026-01-26 14:35:00', 2950.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0051', @first_customer_id+10, 1, @first_new_user_id, '2026-01-27 08:45:00', 5450.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0052', @first_customer_id+11, 1, @first_new_user_id+1, '2026-01-27 12:00:00', 3250.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0053', @first_customer_id+12, 1, @first_new_user_id+2, '2026-01-28 09:30:00', 4850.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0054', @first_customer_id+13, 1, @first_new_user_id+3, '2026-01-28 13:50:00', 7100.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0055', @first_customer_id+14, 1, @first_new_user_id+4, '2026-01-29 08:15:00', 2750.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0056', @first_customer_id+15, 1, @first_new_user_id+5, '2026-01-29 11:25:00', 5750.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0057', @first_customer_id+16, 1, @first_new_user_id+6, '2026-01-30 09:40:00', 3850.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0058', @first_customer_id+17, 1, @first_new_user_id+7, '2026-01-30 14:10:00', 4550.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0059', @first_customer_id+18, 1, @first_new_user_id+8, '2026-01-31 08:30:00', 6050.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0060', @first_customer_id+19, 1, @first_new_user_id+9, '2026-01-31 12:20:00', 3150.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),

-- Bio Products Orders (40 orders) - ชีวภัณฑ์
('ORD2601-0061', @first_customer_id+20, 1, @first_new_user_id, '2026-01-02 11:00:00', 1800.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0062', @first_customer_id+21, 1, @first_new_user_id+1, '2026-01-03 09:30:00', 2200.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0063', @first_customer_id+22, 1, @first_new_user_id+2, '2026-01-04 14:00:00', 1500.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0064', @first_customer_id+23, 1, @first_new_user_id+3, '2026-01-05 10:45:00', 2800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0065', @first_customer_id+24, 1, @first_new_user_id+4, '2026-01-06 08:15:00', 1900.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0066', @first_customer_id+25, 1, @first_new_user_id+5, '2026-01-07 13:20:00', 2400.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0067', @first_customer_id+26, 1, @first_new_user_id+6, '2026-01-08 09:00:00', 3100.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0068', @first_customer_id+27, 1, @first_new_user_id+7, '2026-01-09 11:30:00', 1700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0069', @first_customer_id+28, 1, @first_new_user_id+8, '2026-01-10 14:45:00', 2600.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0070', @first_customer_id+29, 1, @first_new_user_id+9, '2026-01-11 10:00:00', 2050.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0071', @first_customer_id+30, 1, @first_new_user_id+10, '2026-01-12 08:30:00', 2350.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0072', @first_customer_id+31, 1, @first_new_user_id+11, '2026-01-13 12:15:00', 1650.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0073', @first_customer_id+32, 1, @first_new_user_id+12, '2026-01-14 09:40:00', 2900.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0074', @first_customer_id+33, 1, @first_new_user_id+13, '2026-01-15 15:00:00', 1450.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0075', @first_customer_id+34, 1, @first_new_user_id+14, '2026-01-16 11:20:00', 2750.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0076', @first_customer_id+35, 1, @first_new_user_id, '2026-01-17 09:50:00', 1950.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0077', @first_customer_id+36, 1, @first_new_user_id+1, '2026-01-18 14:30:00', 2550.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0078', @first_customer_id+37, 1, @first_new_user_id+2, '2026-01-19 10:10:00', 1850.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0079', @first_customer_id+38, 1, @first_new_user_id+3, '2026-01-20 08:45:00', 3200.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0080', @first_customer_id+39, 1, @first_new_user_id+4, '2026-01-21 13:00:00', 1600.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0081', @first_customer_id, 1, @first_new_user_id+5, '2026-01-22 11:15:00', 2450.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0082', @first_customer_id+1, 1, @first_new_user_id+6, '2026-01-23 09:30:00', 2150.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0083', @first_customer_id+2, 1, @first_new_user_id+7, '2026-01-24 14:20:00', 1750.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0084', @first_customer_id+3, 1, @first_new_user_id+8, '2026-01-25 10:40:00', 2650.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0085', @first_customer_id+4, 1, @first_new_user_id+9, '2026-01-26 08:00:00', 1550.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0086', @first_customer_id+5, 1, @first_new_user_id+10, '2026-01-27 12:30:00', 2850.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0087', @first_customer_id+6, 1, @first_new_user_id+11, '2026-01-28 09:15:00', 2050.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0088', @first_customer_id+7, 1, @first_new_user_id+12, '2026-01-29 15:45:00', 1400.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0089', @first_customer_id+8, 1, @first_new_user_id+13, '2026-01-30 11:00:00', 2950.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0090', @first_customer_id+9, 1, @first_new_user_id+14, '2026-01-31 09:30:00', 1850.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
-- Additional Bio orders
('ORD2601-0091', @first_customer_id+10, 1, @first_new_user_id, '2026-01-03 15:30:00', 2250.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0092', @first_customer_id+11, 1, @first_new_user_id+1, '2026-01-07 08:45:00', 1650.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0093', @first_customer_id+12, 1, @first_new_user_id+2, '2026-01-11 14:00:00', 2700.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0094', @first_customer_id+13, 1, @first_new_user_id+3, '2026-01-15 10:20:00', 1950.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0095', @first_customer_id+14, 1, @first_new_user_id+4, '2026-01-19 12:45:00', 2350.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0096', @first_customer_id+15, 1, @first_new_user_id+5, '2026-01-23 09:10:00', 1800.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0097', @first_customer_id+16, 1, @first_new_user_id+6, '2026-01-27 14:30:00', 2550.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0098', @first_customer_id+17, 1, @first_new_user_id+7, '2026-01-28 11:15:00', 1700.00, 'Transfer', 'Paid', 'Delivered', 'โทร'),
('ORD2601-0099', @first_customer_id+18, 1, @first_new_user_id+8, '2026-01-30 08:30:00', 2450.00, 'COD', 'Paid', 'Shipped', 'โทร'),
('ORD2601-0100', @first_customer_id+19, 1, @first_new_user_id+9, '2026-01-31 15:00:00', 1900.00, 'Transfer', 'Paid', 'Delivered', 'โทร');

-- =====================================================
-- 4. Create Order Items (linked to products by category)
-- =====================================================
-- Using category: 'ปุ๋ย' for Fertilizer, 'ชีวภัณฑ์' for Bio

-- Get some real product IDs from company 1
-- First 60 orders are Fertilizer
INSERT INTO `order_items` (`parent_order_id`, `product_name`, `quantity`, `price_per_unit`, `net_total`, `product_id`) 
SELECT o.id, 'ปุ๋ยสูตรพิเศษ', FLOOR(1 + RAND() * 5), o.total_amount / FLOOR(1 + RAND() * 5), o.total_amount, 
       (SELECT id FROM products WHERE company_id = 1 AND category = 'ปุ๋ย' LIMIT 1)
FROM orders o WHERE o.id BETWEEN 'ORD2601-0001' AND 'ORD2601-0060';

-- Last 40 orders are Bio products
INSERT INTO `order_items` (`parent_order_id`, `product_name`, `quantity`, `price_per_unit`, `net_total`, `product_id`) 
SELECT o.id, 'ชีวภัณฑ์อินทรีย์', FLOOR(1 + RAND() * 3), o.total_amount / FLOOR(1 + RAND() * 3), o.total_amount,
       (SELECT id FROM products WHERE company_id = 1 AND category = 'ชีวภัณฑ์' LIMIT 1)
FROM orders o WHERE o.id BETWEEN 'ORD2601-0061' AND 'ORD2601-0100';

COMMIT;

-- =====================================================
-- 5. UPDATE customer_type for orders
-- =====================================================
-- Set customer_type based on order pattern:
-- - First 20 orders from each customer = "New Customer"
-- - Subsequent orders from same customer = "Reorder Customer"

UPDATE orders 
SET customer_type = 'New Customer'
WHERE id IN (
    'ORD2601-0001', 'ORD2601-0002', 'ORD2601-0003', 'ORD2601-0004', 'ORD2601-0005',
    'ORD2601-0006', 'ORD2601-0007', 'ORD2601-0008', 'ORD2601-0009', 'ORD2601-0010',
    'ORD2601-0061', 'ORD2601-0062', 'ORD2601-0063', 'ORD2601-0064', 'ORD2601-0065',
    'ORD2601-0066', 'ORD2601-0067', 'ORD2601-0068', 'ORD2601-0069', 'ORD2601-0070'
);

UPDATE orders 
SET customer_type = 'Reorder Customer'
WHERE customer_type IS NULL
  AND id LIKE 'ORD2601-%'
  AND company_id = 1;

-- =====================================================
-- SUMMARY:
-- - 15 new users (10 Telesale + 5 Supervisor Telesale)
-- - 40 new customers
-- - 100 orders for January 2026
--   - 60 Fertilizer orders
--   - 40 Bio product orders
--   - 20 New Customer orders
--   - 80 Reorder Customer orders
-- - 100 order items
-- =====================================================

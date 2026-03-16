-- ============================================
-- DEBUG: ความแตกต่างยอดขายระหว่าง Talk Time vs รายงาน Telesale
-- สำหรับ พี่น้ำ - มกราคม 2026
-- ============================================

-- 🔍 ขั้นตอนที่ 1: หา user_id ของ พี่น้ำ
SELECT id, first_name, last_name, role, phone 
FROM users 
WHERE first_name LIKE '%น้ำ%' 
   OR first_name = 'น้ำ'
ORDER BY id;

-- ============================================
-- 📊 Query A: แบบ Talk Time (รวมทุกสินค้า)
-- ============================================
SET @user_id = (SELECT id FROM users WHERE first_name LIKE '%น้ำ%' AND role LIKE '%Telesale%' LIMIT 1);
SET @start_date = '2026-01-01';
SET @end_date = '2026-01-31';

SELECT 
    'Talk Time Query (ALL Products)' as query_type,
    @user_id as user_id,
    COALESCE(SUM(oi.net_total), 0) as total_sales,
    COUNT(DISTINCT o.id) as order_count
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
WHERE o.creator_id = @user_id
AND o.order_date BETWEEN @start_date AND @end_date
AND o.order_status != 'Cancelled'
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL);

-- ============================================
-- 📊 Query B: แบบ รายงาน Telesale (เฉพาะปุ๋ย+ชีวภัณฑ์)
-- ============================================
SELECT 
    'Telesale Report Query (ปุ๋ย + ชีวภัณฑ์ Only)' as query_type,
    @user_id as user_id,
    COALESCE(SUM(oi.net_total), 0) as total_sales,
    COUNT(DISTINCT o.id) as order_count
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.creator_id = @user_id
AND o.order_date >= @start_date
AND o.order_date < DATE_ADD(@end_date, INTERVAL 1 DAY)
AND o.order_status != 'Cancelled'
AND (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL);

-- ============================================
-- 🔎 หาสินค้าที่ขายได้แต่ไม่ใช่ ปุ๋ย/ชีวภัณฑ์ (DIFF)
-- ============================================
SELECT 
    '❌ สินค้าที่ไม่นับในรายงาน Telesale' as description,
    p.category,
    p.name as product_name,
    COUNT(*) as item_count,
    SUM(oi.quantity) as total_qty,
    SUM(oi.net_total) as total_amount
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.creator_id = @user_id
AND o.order_date BETWEEN @start_date AND @end_date
AND o.order_status != 'Cancelled'
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
AND NOT (p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์')
GROUP BY p.category, p.name
ORDER BY total_amount DESC;

-- ============================================
-- 📈 สรุปยอดตาม Category ทั้งหมด
-- ============================================
SELECT 
    p.category,
    COUNT(*) as item_count,
    SUM(oi.quantity) as total_qty,
    SUM(oi.net_total) as total_amount,
    CASE 
        WHEN p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์' 
        THEN '✅ นับในรายงาน' 
        ELSE '❌ ไม่นับ' 
    END as counted_in_report
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.creator_id = @user_id
AND o.order_date BETWEEN @start_date AND @end_date
AND o.order_status != 'Cancelled'
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
GROUP BY p.category
ORDER BY total_amount DESC;

-- ============================================
-- 🧮 สรุป DIFF รวม
-- ============================================
SELECT 
    'DIFF Summary' as summary,
    SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์' THEN oi.net_total ELSE 0 END) as telesale_report_total,
    SUM(oi.net_total) as talk_time_total,
    SUM(oi.net_total) - SUM(CASE WHEN p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์' THEN oi.net_total ELSE 0 END) as difference
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.creator_id = @user_id
AND o.order_date BETWEEN @start_date AND @end_date
AND o.order_status != 'Cancelled'
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL);

-- ============================================
-- 📝 รายการ order ทั้งหมด พร้อมแยกประเภท
-- ============================================
SELECT 
    o.id as order_id,
    o.order_date,
    o.order_status,
    p.category,
    p.name as product_name,
    oi.quantity,
    oi.net_total,
    CASE 
        WHEN p.category LIKE '%ปุ๋ย%' OR p.category = 'ชีวภัณฑ์' 
        THEN '✅' 
        ELSE '❌' 
    END as in_telesale_report
FROM orders o
INNER JOIN order_items oi ON o.id = oi.parent_order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.creator_id = @user_id
AND o.order_date BETWEEN @start_date AND @end_date
AND o.order_status != 'Cancelled'
AND (oi.is_freebie = 0 OR oi.is_freebie IS NULL)
ORDER BY o.order_date, o.id;

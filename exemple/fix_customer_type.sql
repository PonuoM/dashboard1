-- =====================================================
-- UPDATE customer_type for existing orders
-- Run this SQL to fix NULL customer_type values
-- =====================================================

-- Set some orders as "New Customer" (first 20 orders)
UPDATE orders 
SET customer_type = 'New Customer'
WHERE id IN (
    'ORD2601-0001', 'ORD2601-0002', 'ORD2601-0003', 'ORD2601-0004', 'ORD2601-0005',
    'ORD2601-0006', 'ORD2601-0007', 'ORD2601-0008', 'ORD2601-0009', 'ORD2601-0010',
    'ORD2601-0061', 'ORD2601-0062', 'ORD2601-0063', 'ORD2601-0064', 'ORD2601-0065',
    'ORD2601-0066', 'ORD2601-0067', 'ORD2601-0068', 'ORD2601-0069', 'ORD2601-0070'
);

-- Set remaining orders as "Reorder Customer"
UPDATE orders 
SET customer_type = 'Reorder Customer'
WHERE customer_type IS NULL
  AND id LIKE 'ORD2601-%'
  AND company_id = 1;

-- Verify the results
SELECT customer_type, COUNT(*) as count 
FROM orders 
WHERE id LIKE 'ORD2601-%' 
  AND company_id = 1
GROUP BY customer_type;

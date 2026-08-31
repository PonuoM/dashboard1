<?php
/**
 * Shared sales-bucket helper — นิยามกลางของการจัดกลุ่มยอดขายตามสถานะ
 *
 * ทำไมต้องมีไฟล์นี้
 * ────────────────────────────────────────────────────────────
 * การตีกลับถูกบันทึกที่ระดับ "กล่อง" (order_boxes.status = 'RETURNED')
 * ไม่ใช่ระดับออเดอร์ ออเดอร์หนึ่งใบอาจคืนบางกล่องและลูกค้ารับไว้บางกล่อง
 * (partial return) โดย orders.order_status ยังเป็น 'Shipping' หรือ
 * 'Delivered' อยู่ ถ้าจัดกลุ่มด้วย order_status เพียงอย่างเดียว ยอดของ
 * กล่องที่ตีกลับจะไปโผล่ในช่อง สำเร็จ/อื่นๆ ทั้งก้อน
 *
 * ข้อจำกัดสำคัญของข้อมูล
 * ────────────────────────────────────────────────────────────
 * order_boxes.status ไม่ได้ถูกอัปเดตตาม lifecycle ปกติ — กล่องของออเดอร์ที่
 * ส่งสำเร็จแล้วส่วนใหญ่ยังคงเป็น 'PENDING' ค่าที่เชื่อถือได้มีเพียง
 * 'RETURNED' ซึ่งถูกเซ็ตตอนที่มีการตีกลับจริง จึงต้องคง order_status เป็น
 * ตัวตัดสินหลัก แล้ว "แกะ" เฉพาะ item ที่อยู่ในกล่องตีกลับออกมาเท่านั้น
 * ห้ามใช้ order_boxes.status เป็นตัวตัดสิน สำเร็จ/อื่นๆ
 *
 * ลำดับการตัดสิน (ต่อ 1 item)
 * ────────────────────────────────────────────────────────────
 *   1. order_status = 'Cancelled'                  -> cancelled
 *   2. order_status = 'BadDebt'                    -> baddebt
 *   3. กล่องของ item นั้น status = 'RETURNED'      -> returned
 *   4. order_status IN ('Delivered', 'Returned')   -> delivered
 *   5. ที่เหลือ                                     -> other
 *
 * total = delivered + other (ไม่รวม returned / cancelled / baddebt)
 *
 * สาขา 'Returned' ในข้อ 4 คือตัวจัดการ partial return: กล่องที่ไม่ได้ตีกลับ
 * ในออเดอร์ที่ order_status = 'Returned' ถือว่าลูกค้ารับของไว้แล้ว
 *
 * ข้อควรรู้เรื่องการนับจำนวน
 * ────────────────────────────────────────────────────────────
 * COUNT(DISTINCT CASE WHEN <bucket> THEN o.id END) = จำนวนออเดอร์ที่มีของ
 * อยู่ในกลุ่มนั้นอย่างน้อย 1 กล่อง ออเดอร์ที่ตีกลับบางส่วนจะถูกนับทั้งใน
 * returned และใน delivered/other ยอดเงินบวกกันได้ แต่จำนวนบวกกันเกินจริง
 */

/**
 * LEFT JOIN order_items -> order_boxes ที่ระดับกล่อง
 *
 * ปลอดภัย 1:1 การันตีด้วย UNIQUE KEY uniq_order_box_per_order
 * (order_id, box_number) จึงไม่ทำให้แถวบานปลายและไม่กระทบ SUM()
 * ใช้ LEFT JOIN เพราะมี order_items จำนวนหนึ่งที่ box_number ไม่มีแถวกล่องคู่กัน
 *
 * @param string $o  alias ของตาราง orders
 * @param string $oi alias ของตาราง order_items
 * @param string $ob alias ที่จะตั้งให้ order_boxes
 */
function sales_box_join($o = 'o', $oi = 'oi', $ob = 'obx') {
    return "LEFT JOIN order_boxes $ob ON $ob.order_id = $o.id AND $ob.box_number = $oi.box_number";
}

/**
 * คืนนิพจน์ boolean ของ bucket สำหรับใช้ใน CASE WHEN หรือ WHERE
 *
 * ทุกนิพจน์ห่อวงเล็บไว้แล้ว ต่อด้วย AND/OR ได้ทันที
 * COALESCE ถูกใช้ทุกจุดเพราะทั้ง orders.order_status และ order_boxes.status
 * เป็น nullable — ถ้าเทียบ NULL ตรงๆ ด้วย NOT IN จะได้ NULL แล้ว item
 * เหล่านั้นจะหลุดออกจากทุก bucket
 *
 * @param string $bucket total|delivered|returned|cancelled|baddebt|other
 * @param string $o      alias ของตาราง orders
 * @param string $ob     alias ของตาราง order_boxes (ตัวเดียวกับที่ส่งให้ sales_box_join)
 */
function sales_bucket($bucket, $o = 'o', $ob = 'obx') {
    $status  = "COALESCE($o.order_status, '')";
    $isRet   = "COALESCE($ob.status, '') = 'RETURNED'";
    $notRet  = "COALESCE($ob.status, '') <> 'RETURNED'";
    $live    = "$status NOT IN ('Cancelled', 'BadDebt')";

    switch ($bucket) {
        case 'total':
            return "($live AND $notRet)";
        case 'delivered':
            return "($live AND $notRet AND $status IN ('Delivered', 'Returned'))";
        case 'returned':
            return "($live AND $isRet)";
        case 'other':
            return "($live AND $notRet AND $status NOT IN ('Delivered', 'Returned'))";
        case 'cancelled':
            return "($status = 'Cancelled')";
        case 'baddebt':
            return "($status = 'BadDebt')";
    }

    throw new InvalidArgumentException("Unknown sales bucket: $bucket");
}

/**
 * คืนนิพจน์ boolean ของเหตุผลตีกลับ อ่านจาก order_boxes.return_status ของ
 * กล่องนั้นตรงๆ จึงแม่นยำระดับกล่อง ไม่ต้องเดาด้วย MAX() แบบเดิม
 *
 * ต้องใช้ควบคู่กับ sales_bucket('returned') เสมอ เพราะฟังก์ชันนี้ดูแค่
 * return_status ไม่ได้ตรวจว่ากล่องถูกตีกลับจริงหรือไม่
 *
 * 'other' เป็นถังรองรับ ทำให้ผลรวมของทุกเหตุผลเท่ากับยอดตีกลับทั้งหมดเสมอ
 * (ครอบทั้งค่าที่ไม่รู้จักและ return_status ที่เป็น NULL)
 *
 * @param string $reason good|damaged|returning|lost|other
 * @param string $ob     alias ของตาราง order_boxes
 */
function sales_return_reason($reason, $ob = 'obx') {
    $known  = "'good', 'damaged', 'returning', 'lost'";
    $status = "COALESCE($ob.return_status, '')";

    if ($reason === 'other') {
        return "($status NOT IN ($known))";
    }
    if (in_array($reason, ['good', 'damaged', 'returning', 'lost'], true)) {
        return "($status = '$reason')";
    }

    throw new InvalidArgumentException("Unknown return reason: $reason");
}

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
 * 'RETURNED' และ 'CANCELLED' ซึ่ง ERP เซ็ตตอนเกิดเหตุจริง จึงต้องคง
 * order_status เป็นตัวตัดสินหลัก แล้ว "แกะ" เฉพาะกล่อง RETURNED / CANCELLED
 * ห้ามใช้สถานะกล่องอื่น (DELIVERED, PENDING, SHIPPING) เป็นตัวตัดสิน สำเร็จ
 *
 * ลำดับการตัดสิน (ต่อ 1 item)
 * ────────────────────────────────────────────────────────────
 *   1. order_status = 'Cancelled'                  -> cancelled
 *   2. order_status = 'BadDebt'                    -> baddebt
 *   3. กล่องของ item นั้น status = 'RETURNED'      -> returned
 *   4. กล่องของ item นั้น status = 'CANCELLED'     -> cancelled
 *   5. order_status IN ('Delivered', 'Returned')   -> delivered
 *   6. ที่เหลือ                                     -> other
 *
 * total = delivered + other (ไม่รวม returned / cancelled / baddebt)
 *
 * สาขา 'Returned' ในข้อ 5 คือตัวจัดการ partial return: กล่องที่ไม่ได้ตีกลับ
 * ในออเดอร์ที่ order_status = 'Returned' ถือว่าลูกค้ารับของไว้แล้ว
 * ข้อ 4 คือ partial cancel: กล่อง CANCELLED ไปช่องยกเลิก กล่องอื่นอยู่สำเร็จ/อื่นๆ
 *
 * ข้อควรรู้เรื่องการนับจำนวน
 * ────────────────────────────────────────────────────────────
 * COUNT(DISTINCT CASE WHEN <bucket> THEN o.id END) = จำนวนออเดอร์ที่มีของ
 * อยู่ในกลุ่มนั้นอย่างน้อย 1 กล่อง ออเดอร์ที่ตีกลับหรือยกเลิกบางกล่องจะถูกนับ
 * ทั้งใน cancelled/returned และใน delivered/other ยอดเงินบวกกันได้ แต่จำนวน
 * บวกกันเกินจริง
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
 * ยอด waive รวมต่อออเดอร์ — join ครั้งเดียวไม่ให้บานตอน SUM จากแถว item
 *
 * @param string $o  alias ของตาราง orders
 * @param string $ow alias ของ subquery ยอด waive
 */
function sales_order_waived_join($o = 'o', $ow = 'ow') {
    return "LEFT JOIN (
        SELECT order_id, SUM(COALESCE(waived_amount, 0)) AS waived_total
        FROM order_boxes
        GROUP BY order_id
    ) $ow ON $ow.order_id = $o.id";
}

/**
 * ยอดสินค้าหลังหัก waive ของกล่องนั้น
 *
 * กล่องที่ยกเลิกเต็มจำนวน (waived >= collection) ได้ 0
 * กล่องที่ยกเลิกบางส่วนได้สัดส่วน (collection - waived) / collection
 * ถ้าไม่มี collection_amount คงใช้ net_total เพื่อไม่ทำยอดกล่องที่ยังไม่มีข้อมูลการเก็บหายไป
 *
 * ใช้กับ SUM ของ bucket total / delivered / other เท่านั้น
 * ห้ามใช้กับ returned / cancelled / baddebt
 *
 * @param string $oi alias ของตาราง order_items
 * @param string $ob alias ของตาราง order_boxes
 */
function sales_box_net_amount($oi = 'oi', $ob = 'obx') {
    $collection = "COALESCE($ob.collection_amount, 0)";
    $waived     = "COALESCE($ob.waived_amount, 0)";
    $net_total  = "COALESCE($oi.net_total, 0)";
    return "(CASE
        WHEN $collection > 0 THEN $net_total * GREATEST(0, $collection - $waived) / $collection
        ELSE $net_total
    END)";
}

/**
 * ยอดค้างของออเดอร์ = ยอดบิล − เงินเข้า (amount_paid ตามสลิป/COD) − ยอด waive รวม
 * ไม่หัก collected_amount จะซ้ำกับ amount_paid
 *
 * @param string $o  alias ของตาราง orders
 * @param string $ow alias ของ subquery ยอด waive
 */
function sales_outstanding($o = 'o', $ow = 'ow') {
    return "GREATEST(0, COALESCE($o.total_amount, 0) - COALESCE($o.amount_paid, 0) - COALESCE($ow.waived_total, 0))";
}

/**
 * เงื่อนไขค้างชำระ — สับเซตของสำเร็จ: Delivered, กล่องไม่ตีกลับ, ยังมียอดหลัง waive, ยังเก็บไม่ครบ
 *
 * @param string $o  alias ของตาราง orders
 * @param string $oi alias ของตาราง order_items
 * @param string $ob alias ของตาราง order_boxes
 * @param string $ow alias ของ subquery ยอด waive
 */
function sales_unpaid_condition($o = 'o', $oi = 'oi', $ob = 'obx', $ow = 'ow') {
    $item_net    = sales_box_net_amount($oi, $ob);
    $outstanding = sales_outstanding($o, $ow);
    return "COALESCE($o.order_status, '') = 'Delivered'"
        . " AND COALESCE($ob.status, '') <> 'RETURNED'"
        . " AND UPPER(COALESCE($ob.status, '')) <> 'CANCELLED'"
        . " AND ($item_net) > 0"
        . " AND ($outstanding) > 0"
        . " AND COALESCE($o.payment_status, '') <> 'Approved'";
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
    $status       = "COALESCE($o.order_status, '')";
    $boxUpper     = "UPPER(COALESCE($ob.status, ''))";
    $isRet        = "COALESCE($ob.status, '') = 'RETURNED'";
    $isBoxCancel  = "$boxUpper = 'CANCELLED'";
    $liveBox      = "COALESCE($ob.status, '') <> 'RETURNED' AND $boxUpper <> 'CANCELLED'";
    $live         = "$status NOT IN ('Cancelled', 'BadDebt')";

    switch ($bucket) {
        case 'total':
            return "($live AND $liveBox)";
        case 'delivered':
            return "($live AND $liveBox AND $status IN ('Delivered', 'Returned'))";
        case 'returned':
            return "($live AND $isRet)";
        case 'other':
            return "($live AND $liveBox AND $status NOT IN ('Delivered', 'Returned'))";
        case 'cancelled':
            return "($status = 'Cancelled' OR ($live AND $isBoxCancel))";
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

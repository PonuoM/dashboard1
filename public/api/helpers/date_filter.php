<?php
/**
 * Shared date-range filter helper.
 *
 * อ่าน start_date & end_date จาก $_GET
 * รองรับ 2 รูปแบบ:
 *   - 'YYYY-MM-DD'        -> ทั้งวัน (00:00:00 ถึง 23:59:59)
 *   - 'YYYY-MM-DD HH:MM'  -> ระบุเวลา (เช่น 2026-06-02 16:00) — ใช้กับปุ่ม "กำหนดวัน + เวลา"
 * ใช้สำหรับปุ่ม "วันนี้ / เมื่อวาน / กำหนดวัน" บนหน้า report ต่างๆ
 *
 * คืน null  -> ไม่มีหรือรูปแบบไม่ถูกต้อง ให้ caller ใช้ตรรกะกรองปี/เดือนเดิม
 * คืน array -> [
 *     'start'     => 'Y-m-d H:i:s',  // ต้นช่วง (inclusive)
 *     'end_excl'  => 'Y-m-d H:i:s',  // ใช้กับเงื่อนไข `col < ?`  (ส่วนใหญ่)
 *     'end_incl'  => 'Y-m-d H:i:s',  // ใช้กับเงื่อนไข `col <= ?` (เช่น product_analysis)
 * ]
 *
 * ถ้า start > end จะสลับให้อัตโนมัติ
 */
function __parse_filter_dt($s) {
    $s = trim($s);
    // YYYY-MM-DD HH:MM(:SS)?
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/', $s, $m)) {
        $sec = isset($m[6]) ? $m[6] : '00';
        $norm = "{$m[1]}-{$m[2]}-{$m[3]} {$m[4]}:{$m[5]}:{$sec}";
        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $norm);
        if (!$dt || $dt->format('Y-m-d H:i:s') !== $norm) return null;
        return ['dt' => $dt, 'hasTime' => true];
    }
    // YYYY-MM-DD
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m)) {
        $norm = "{$m[1]}-{$m[2]}-{$m[3]} 00:00:00";
        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $norm);
        if (!$dt || $dt->format('Y-m-d') !== "{$m[1]}-{$m[2]}-{$m[3]}") return null;
        return ['dt' => $dt, 'hasTime' => false];
    }
    return null;
}

function resolve_date_range() {
    if (empty($_GET['start_date']) || empty($_GET['end_date'])) {
        return null;
    }

    $p1 = __parse_filter_dt($_GET['start_date']);
    $p2 = __parse_filter_dt($_GET['end_date']);
    if (!$p1 || !$p2) {
        return null;
    }

    // สลับถ้าต้นช่วงมากกว่าปลายช่วง
    if ($p1['dt'] > $p2['dt']) {
        $tmp = $p1;
        $p1 = $p2;
        $p2 = $tmp;
    }

    $start = $p1['dt']->format('Y-m-d H:i:s');

    if ($p2['hasTime']) {
        // ระบุเวลาปลายช่วง -> inclusive ที่เวลานั้นพอดี (เช่น ..16:00:00)
        $end_incl = $p2['dt']->format('Y-m-d H:i:s');
        $excl = clone $p2['dt'];
        $excl->modify('+1 second');
        $end_excl = $excl->format('Y-m-d H:i:s');
    } else {
        // ทั้งวัน
        $end_incl = $p2['dt']->format('Y-m-d') . ' 23:59:59';
        $excl = clone $p2['dt'];
        $excl->modify('+1 day');
        $end_excl = $excl->format('Y-m-d') . ' 00:00:00';
    }

    return [
        'start'    => $start,
        'end_excl' => $end_excl,
        'end_incl' => $end_incl,
    ];
}

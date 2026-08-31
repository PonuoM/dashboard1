import { useState, useEffect, useMemo } from 'react';

// คืนค่า 'YYYY-MM-DD' ของ Date ตามเวลาเครื่อง (ไทย) โดยไม่แปลงเป็น UTC
function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayISO() {
    return toISODate(new Date());
}

function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
}

/**
 * จัดการตัวกรองช่วงวัน (วันนี้ / เมื่อวาน / กำหนดวัน) ที่ใช้ร่วมกันทุกหน้า report
 *
 * @param {string} pageKey  คีย์เฉพาะหน้าใช้ persist ลง sessionStorage (เช่น 'dashboard')
 * @returns {{
 *   mode: 'period'|'today'|'yesterday'|'custom',
 *   start: string, end: string,           // วันที่ล้วน 'YYYY-MM-DD' (ใช้กับ input/แสดงผล)
 *   startTime: string, endTime: string,   // 'HH:MM' หรือ '' (ว่าง = ทั้งวัน)
 *   startParam: string, endParam: string, // ค่าส่ง API รวมเวลา เช่น '2026-06-02 16:00'
 *   active: boolean,
 *   params: string,             // เช่น '&start_date=2026-06-02%2000%3A00&end_date=...' หรือ ''
 *   key: string,                // ค่าใช้ใส่ใน useEffect deps เพื่อ trigger refetch
 *   setPreset: (mode: 'today'|'yesterday') => void,
 *   setCustom: (start: string, end: string, startTime?: string, endTime?: string) => void,
 *   reset: () => void,
 * }}
 */
export default function useDateRange(pageKey) {
    const storeKey = `dateRange_${pageKey}`;

    const [state, setState] = useState(() => {
        try {
            const saved = sessionStorage.getItem(storeKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.mode) {
                    // เติม field เวลาให้ค่าที่ persist ไว้แบบเดิม (รองรับ backward-compat)
                    return { startTime: '', endTime: '', ...parsed };
                }
            }
        } catch (e) { /* ignore */ }
        return { mode: 'period', start: '', end: '', startTime: '', endTime: '' };
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(storeKey, JSON.stringify(state));
        } catch (e) { /* ignore */ }
    }, [storeKey, state]);

    const setPreset = (mode) => {
        // preset = ทั้งวัน (ไม่ระบุเวลา)
        if (mode === 'today') {
            const t = todayISO();
            setState({ mode: 'today', start: t, end: t, startTime: '', endTime: '' });
        } else if (mode === 'yesterday') {
            const y = yesterdayISO();
            setState({ mode: 'yesterday', start: y, end: y, startTime: '', endTime: '' });
        }
    };

    // startTime/endTime เป็น 'HH:MM' (ว่าง = ทั้งวัน)
    const setCustom = (start, end, startTime = '', endTime = '') => {
        if (!start || !end) return;
        setState({ mode: 'custom', start, end, startTime: startTime || '', endTime: endTime || '' });
    };

    const reset = () => setState({ mode: 'period', start: '', end: '', startTime: '', endTime: '' });

    const active = state.mode !== 'period' && !!state.start && !!state.end;

    // ค่าที่ส่งให้ API (รวมเวลาถ้ามี) เช่น '2026-06-02 16:00'
    const startParam = active ? (state.startTime ? `${state.start} ${state.startTime}` : state.start) : '';
    const endParam = active ? (state.endTime ? `${state.end} ${state.endTime}` : state.end) : '';

    const params = useMemo(() => {
        if (!active) return '';
        return `&start_date=${encodeURIComponent(startParam)}&end_date=${encodeURIComponent(endParam)}`;
    }, [active, startParam, endParam]);

    return {
        mode: state.mode,
        start: state.start,
        end: state.end,
        startTime: state.startTime || '',
        endTime: state.endTime || '',
        startParam,
        endParam,
        active,
        params,
        key: active ? `${startParam}_${endParam}` : 'period',
        setPreset,
        setCustom,
        reset,
    };
}

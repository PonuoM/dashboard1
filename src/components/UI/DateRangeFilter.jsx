import { useState, useRef, useEffect } from 'react';

/**
 * ตัวกรองช่วงวัน: ปุ่ม วันนี้ / เมื่อวาน / กำหนดวัน + ชิป "ตามปี/เดือน"
 * รับค่าจาก hook useDateRange ผ่าน prop `value`
 *
 * @param {object} value  ผลลัพธ์จาก useDateRange (mode, start, end, active, setPreset, setCustom, reset)
 */
function DateRangeFilter({ value }) {
    const { mode, start, end, startTime, endTime, active, setPreset, setCustom, reset } = value;
    const [showCustom, setShowCustom] = useState(false);
    const [draftStart, setDraftStart] = useState(start || '');
    const [draftEnd, setDraftEnd] = useState(end || '');
    const [draftStartTime, setDraftStartTime] = useState(startTime || '');
    const [draftEndTime, setDraftEndTime] = useState(endTime || '');
    const popRef = useRef(null);

    // sync draft กับค่าจริงเมื่อเปิด popover
    useEffect(() => {
        if (showCustom) {
            setDraftStart(start || '');
            setDraftEnd(end || '');
            setDraftStartTime(startTime || '');
            setDraftEndTime(endTime || '');
        }
    }, [showCustom, start, end, startTime, endTime]);

    // ปิด popover เมื่อคลิกข้างนอก
    useEffect(() => {
        const handler = (e) => {
            if (popRef.current && !popRef.current.contains(e.target)) {
                setShowCustom(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const baseBtn = 'px-3 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap';
    const activeBtn = 'bg-primary text-white border-primary';
    const idleBtn = 'bg-white text-gray-600 border-gray-200 hover:border-primary/50';

    const applyCustom = () => {
        if (draftStart && draftEnd) {
            setCustom(draftStart, draftEnd, draftStartTime, draftEndTime);
            setShowCustom(false);
        }
    };

    // ป้ายบนปุ่ม "กำหนดวัน" — แสดงเวลาต่อท้ายถ้าระบุ
    const fmtLabel = (d, t) => (t ? `${d} ${t}` : d);
    const customLabel = mode === 'custom' && start
        ? `${fmtLabel(start, startTime)} → ${fmtLabel(end, endTime)}`
        : 'กำหนดวัน';

    return (
        <div className="flex items-center gap-2">
            {/* ชิป ตามปี/เดือน (โหมดปกติ) */}
            <button
                type="button"
                onClick={() => { reset(); setShowCustom(false); }}
                className={`${baseBtn} ${!active ? activeBtn : idleBtn}`}
            >
                ตามปี/เดือน
            </button>

            <button
                type="button"
                onClick={() => { setPreset('today'); setShowCustom(false); }}
                className={`${baseBtn} ${mode === 'today' ? activeBtn : idleBtn}`}
            >
                วันนี้
            </button>

            <button
                type="button"
                onClick={() => { setPreset('yesterday'); setShowCustom(false); }}
                className={`${baseBtn} ${mode === 'yesterday' ? activeBtn : idleBtn}`}
            >
                เมื่อวาน
            </button>

            {/* กำหนดวัน + popover */}
            <div className="relative" ref={popRef}>
                <button
                    type="button"
                    onClick={() => setShowCustom(v => !v)}
                    className={`${baseBtn} flex items-center gap-1 ${mode === 'custom' ? activeBtn : idleBtn}`}
                >
                    <span className="material-symbols-outlined text-base">date_range</span>
                    {customLabel}
                </button>

                {showCustom && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-[100]">
                        <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-500">วันเริ่มต้น</span>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={draftStart}
                                        max={draftEnd || undefined}
                                        onChange={(e) => setDraftStart(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                    />
                                    <input
                                        type="time"
                                        value={draftStartTime}
                                        onChange={(e) => setDraftStartTime(e.target.value)}
                                        className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                    />
                                </div>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-500">วันสิ้นสุด</span>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={draftEnd}
                                        min={draftStart || undefined}
                                        onChange={(e) => setDraftEnd(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                    />
                                    <input
                                        type="time"
                                        value={draftEndTime}
                                        onChange={(e) => setDraftEndTime(e.target.value)}
                                        className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                                    />
                                </div>
                            </label>
                            <p className="text-[11px] text-gray-400 leading-snug">
                                เว้นว่างช่องเวลา = ทั้งวัน (00:00–23:59)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setDraftStartTime(''); setDraftEndTime(''); }}
                                    className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    ล้างเวลา
                                </button>
                                <button
                                    type="button"
                                    onClick={applyCustom}
                                    disabled={!draftStart || !draftEnd}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ใช้ช่วงวันนี้
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DateRangeFilter;

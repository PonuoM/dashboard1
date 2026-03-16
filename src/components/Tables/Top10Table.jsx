import { useState, useRef, useEffect } from 'react';

function Top10Table({ data, meta, cancellationTypes, onViewCancelledOrders, onViewReturnedOrders }) {
    const [showAll, setShowAll] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const popupRef = useRef(null);
    const displayData = showAll ? data : data.slice(0, 10);
    const fmt = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    const daysInMonth = meta?.days_in_month || 31;
    const daysElapsed = meta?.days_elapsed || 1;

    useEffect(() => {
        const handleClick = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                setExpandedRow(null);
            }
        };
        if (expandedRow !== null) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [expandedRow]);

    const calcTrend = (row) => {
        const curr = parseFloat(row.total_sales) || 0;
        const prev = parseFloat(row.prev_month_sales) || 0;
        if (daysElapsed === 0) return { growth: 0 };
        const projected = (curr / daysElapsed) * daysInMonth;
        if (prev === 0) return { growth: projected > 0 ? 100 : 0 };
        return { growth: ((projected - prev) / prev) * 100 };
    };

    const typeLabels = {};
    (cancellationTypes || []).forEach(t => { typeLabels[t.id] = t.label; });

    const getBreakdown = (row) => {
        const byType = row.cancelled_by_type || {};
        const items = [];
        if (typeof byType === 'object') {
            Object.entries(byType).forEach(([typeId, info]) => {
                items.push({
                    typeId: parseInt(typeId),
                    label: typeLabels[typeId] || (parseInt(typeId) === 0 ? 'ไม่ระบุ' : `#${typeId}`),
                    amount: info.amount,
                    count: info.count,
                });
            });
        }
        return items;
    };

    const Tip = ({ text, position = 'center' }) => (
        <span className="group/tip relative inline-flex ml-0.5 cursor-help">
            <span className="material-symbols-outlined text-[11px] text-gray-300 group-hover/tip:text-primary">info</span>
            <span className={`absolute top-full mt-1 hidden group-hover/tip:block z-[9999] pointer-events-none ${position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                <span className="bg-gray-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 whitespace-pre-line shadow-xl min-w-max max-w-xs block">{text}</span>
            </span>
        </span>
    );

    return (
        <section className="glass-card rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-glass-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-lg">leaderboard</span>
                    </div>
                    <div>
                        <h3 className="text-base font-bold">ตารางอันดับยอดขาย (Telesales)</h3>
                        <p className="text-[10px] text-gray-500">{data.length} คน · รวมแยกประเภทสินค้า</p>
                    </div>
                </div>
                {data.length > 10 && (
                    <button onClick={() => setShowAll(!showAll)} className="px-3 py-1.5 text-[11px] font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
                        {showAll ? 'แสดง 10 อันดับ' : `ทั้งหมด (${data.length})`}
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '1200px' }}>
                    <thead className="relative z-[100]">
                        <tr className="text-[9px] font-bold uppercase tracking-wider border-b border-gray-200">
                            <th className="px-2 py-2.5 text-gray-400 w-8">#</th>
                            <th className="px-2 py-2.5 text-gray-400">ชื่อ</th>
                            <th className="px-2 py-2.5 text-gray-400">ตำแหน่ง</th>
                            {/* Sales columns */}
                            <th className="px-2 py-2.5 text-right text-gray-500">ยอดขาย<Tip text="ไม่รวมตีกลับ" /></th>
                            <th className="px-2 py-2.5 text-right text-orange-400">ตีกลับ<Tip text="Returned" /></th>
                            <th className="px-2 py-2.5 text-right text-blue-500">รวมตีกลับ<Tip text="ยอดขาย+ตีกลับ" /></th>
                            <th className="px-2 py-2.5 text-right text-red-400">ยกเลิก<Tip text="คลิกเพื่อดูรายละเอียด" position="left" /></th>
                            {/* Product breakdown */}
                            <th className="px-2 py-2.5 text-right text-emerald-500 border-l border-gray-100">ปุ๋ย(฿)<Tip text="ยอดขายปุ๋ย" /></th>
                            <th className="px-1 py-2.5 text-center text-emerald-500">OD</th>
                            <th className="px-2 py-2.5 text-right text-emerald-500">เฉลี่ย</th>
                            <th className="px-2 py-2.5 text-right text-amber-500 border-l border-gray-100">ชีวภัณฑ์(฿)</th>
                            <th className="px-1 py-2.5 text-center text-amber-500">OD</th>
                            <th className="px-2 py-2.5 text-right text-amber-500">เฉลี่ย</th>
                            {/* Performance */}
                            <th className="px-2 py-2.5 text-center text-gray-400 border-l border-gray-100">ผลงาน</th>
                            <th className="px-2 py-2.5 text-center text-gray-400">แนวโน้ม</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {displayData.map((row, index) => {
                            const target = row.target_amount;
                            const hasTarget = target !== null && target > 0;
                            const totalSales = parseFloat(row.total_sales) || 0;
                            const returnedAmt = parseFloat(row.returned_amount) || 0;
                            const netSales = totalSales - returnedAmt;
                            const progressPct = hasTarget ? Math.min((totalSales / target) * 100, 100) : 0;
                            const cancelledAmt = parseFloat(row.cancelled_amount) || 0;
                            const trend = calcTrend(row);
                            const isPos = trend.growth >= 0;
                            const isExpanded = expandedRow === index;
                            const breakdown = getBreakdown(row);
                            const popAbove = index >= displayData.length - 3;

                            const fertS = parseFloat(row.fertilizer_sales) || 0;
                            const bioS = parseFloat(row.bio_sales) || 0;
                            const fertO = parseInt(row.fertilizer_orders) || 0;
                            const bioO = parseInt(row.bio_orders) || 0;
                            const avgF = fertO > 0 ? Math.round(fertS / fertO) : 0;
                            const avgB = bioO > 0 ? Math.round(bioS / bioO) : 0;

                            return (
                                <tr key={index} className="hover:bg-gray-50/50 transition-colors text-xs">
                                    {/* # */}
                                    <td className="px-2 py-2.5">
                                        {index < 3 ? (
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{index + 1}</div>
                                        ) : (
                                            <span className="text-gray-400 font-mono pl-1">{index + 1}</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-2.5 font-bold text-xs">{row.salesperson_name || 'N/A'}</td>
                                    <td className="px-2 py-2.5 text-[10px] text-gray-500">{row.role_name || '-'}</td>

                                    {/* Sales */}
                                    <td className="px-2 py-2.5 text-right font-bold">฿{fmt(netSales)}</td>
                                    <td className="px-2 py-2.5 text-right">
                                        {returnedAmt > 0 ? (
                                            <button
                                                onClick={() => onViewReturnedOrders?.({ userId: row.user_id, userName: row.salesperson_name })}
                                                className="font-bold text-orange-500 hover:text-orange-700 cursor-pointer transition-colors hover:underline"
                                            >
                                                ฿{fmt(returnedAmt)}
                                            </button>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-bold text-blue-600">฿{fmt(totalSales)}</td>

                                    {/* Cancelled */}
                                    <td className="px-2 py-2.5 text-right relative">
                                        {cancelledAmt > 0 ? (
                                            <button onClick={() => setExpandedRow(isExpanded ? null : index)} className="inline-flex items-center gap-0.5 text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors group/c">
                                                <span>฿{fmt(cancelledAmt)}</span>
                                                <span className="material-symbols-outlined text-xs opacity-50 group-hover/c:opacity-100">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                            </button>
                                        ) : <span className="text-gray-300">-</span>}

                                        {isExpanded && breakdown.length > 0 && (
                                            <div ref={popupRef} className={`absolute right-0 z-[200] bg-white rounded-xl shadow-2xl border border-gray-100 w-64 overflow-hidden ${popAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`} style={{ animation: `${popAbove ? 'fadeSlideUp' : 'fadeSlideIn'} 0.15s ease-out` }}>
                                                <div className="px-3 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-700">แยกประเภทยกเลิก · {row.salesperson_name}</p>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                    {breakdown.map((item) => (
                                                        <button key={item.typeId} onClick={() => { setExpandedRow(null); onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: item.typeId, cancelTypeLabel: item.label }); }} className="w-full px-3 py-2 flex items-center justify-between hover:bg-red-50/50 transition-colors text-left cursor-pointer group/item">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-medium text-gray-700 truncate">{item.label}</p>
                                                                <p className="text-[9px] text-gray-400">{item.count} ออเดอร์</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <span className="text-[11px] font-bold text-red-500">฿{fmt(item.amount)}</span>
                                                                <span className="material-symbols-outlined text-xs text-gray-300 group-hover/item:text-primary">chevron_right</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Product breakdown inline */}
                                    <td className="px-2 py-2.5 text-right border-l border-gray-50">฿{fmt(fertS)}</td>
                                    <td className="px-1 py-2.5 text-center font-bold text-emerald-600">{fertO}</td>
                                    <td className="px-2 py-2.5 text-right font-bold text-emerald-600">{fertO > 0 ? `฿${fmt(avgF)}` : '-'}</td>
                                    <td className="px-2 py-2.5 text-right border-l border-gray-50">฿{fmt(bioS)}</td>
                                    <td className="px-1 py-2.5 text-center font-bold text-amber-600">{bioO}</td>
                                    <td className="px-2 py-2.5 text-right font-bold text-amber-600">{bioO > 0 ? `฿${fmt(avgB)}` : '-'}</td>

                                    {/* Performance */}
                                    <td className="px-2 py-2.5 border-l border-gray-50">
                                        {hasTarget ? (
                                            <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full rounded-full ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-primary' : 'bg-red-400'}`} style={{ width: `${progressPct}%` }}></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-500">{progressPct.toFixed(0)}%</span>
                                            </div>
                                        ) : <span className="text-[9px] text-gray-300 block text-center">-</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-center">
                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            <span className="material-symbols-outlined text-[11px]">{isPos ? 'trending_up' : 'trending_down'}</span>
                                            {Math.abs(trend.growth).toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style>{`
                @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </section>
    );
}

export default Top10Table;

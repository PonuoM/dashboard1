import { useState } from 'react';

function Top10Table({ data, meta, cancellationTypes, onViewCancelledOrders, onViewReturnedOrders }) {
    const [showAll, setShowAll] = useState(false);
    const displayData = showAll ? data : data.slice(0, 10);
    const fmt = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    const daysInMonth = meta?.days_in_month || 31;
    const daysElapsed = meta?.days_elapsed || 1;

    const calcTrend = (row) => {
        const curr = parseFloat(row.total_sales) || 0;
        const prev = parseFloat(row.prev_month_sales) || 0;
        if (daysElapsed === 0) return { growth: 0 };
        const projected = (curr / daysElapsed) * daysInMonth;
        if (prev === 0) return { growth: projected > 0 ? 100 : 0 };
        return { growth: ((projected - prev) / prev) * 100 };
    };

    // Helper to extract amount for a specific cancellation type from cancelled_by_type
    const getTypeAmount = (row, typeId) => {
        const byType = row.cancelled_by_type || {};
        if (typeof byType === 'object' && byType[typeId]) {
            return { amount: byType[typeId].amount || 0, count: byType[typeId].count || 0 };
        }
        return { amount: 0, count: 0 };
    };

    // Short labels for cancellation types
    const cancelTypeShortLabels = {
        1: 'ก่อนเข้าระบบ',
        2: 'หลังเข้าระบบ',
        3: 'ปฏิเสธรับของ',
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
                <table className="w-full text-left" style={{ minWidth: '1350px' }}>
                    <thead className="relative z-[100]">
                        <tr className="text-[9px] font-bold uppercase tracking-wider border-b border-gray-200">
                            <th className="px-2 py-2.5 text-gray-400 w-8">#</th>
                            <th className="px-2 py-2.5 text-gray-400">ชื่อ</th>
                            <th className="px-2 py-2.5 text-gray-400">ตำแหน่ง</th>
                            {/* Sales columns */}
                            <th className="px-2 py-2.5 text-right text-gray-500">ยอดขาย<Tip text="ไม่รวมตีกลับ" /></th>
                            <th className="px-2 py-2.5 text-right text-orange-400">ตีกลับ<Tip text="Returned" /></th>
                            <th className="px-2 py-2.5 text-right text-blue-500">รวมตีกลับ<Tip text="ยอดขาย+ตีกลับ" /></th>
                            <th className="px-2 py-2.5 text-right text-red-400">ก่อนเข้า<Tip text="ยกเลิกก่อนเข้าระบบ" position="left" /></th>
                            <th className="px-2 py-2.5 text-right text-red-500">หลังเข้า<Tip text="ยกเลิกหลังเข้าระบบ" position="left" /></th>
                            <th className="px-2 py-2.5 text-right text-red-600">ปฏิเสธรับ<Tip text="ลูกค้าปฏิเสธการรับสินค้า" position="left" /></th>
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

                            // Individual cancellation type amounts
                            const cancel1 = getTypeAmount(row, 1);
                            const cancel2 = getTypeAmount(row, 2);
                            const cancel3 = getTypeAmount(row, 3);

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

                                    {/* Cancelled - 3 separate columns */}
                                    <td className="px-2 py-2.5 text-right">
                                        {cancel1.amount > 0 ? (
                                            <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 1, cancelTypeLabel: cancelTypeShortLabels[1] })} className="text-red-400 hover:text-red-700 font-bold cursor-pointer transition-colors hover:underline">
                                                ฿{fmt(cancel1.amount)}
                                            </button>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-right">
                                        {cancel2.amount > 0 ? (
                                            <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 2, cancelTypeLabel: cancelTypeShortLabels[2] })} className="text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors hover:underline">
                                                ฿{fmt(cancel2.amount)}
                                            </button>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-right">
                                        {cancel3.amount > 0 ? (
                                            <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 3, cancelTypeLabel: cancelTypeShortLabels[3] })} className="text-red-600 hover:text-red-800 font-bold cursor-pointer transition-colors hover:underline">
                                                ฿{fmt(cancel3.amount)}
                                            </button>
                                        ) : <span className="text-gray-300">-</span>}
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

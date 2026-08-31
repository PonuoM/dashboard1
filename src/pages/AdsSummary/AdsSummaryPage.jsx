import { useState, useEffect } from 'react';
import { DateRangeFilter } from '../../components/UI';
import useDateRange from '../../hooks/useDateRange';

function AdsSummaryPage({ user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const dateRange = useDateRange('adsSummary');

    const formatNumber = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '0.00';
        return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatPercent = (num) => {
        if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return '0.00%';
        return Number(num).toFixed(2) + '%';
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const companyId = user?.company_id || 1;
                const res = await fetch(`./api/reports/ads_summary.php?company_id=${companyId}&month=${month}&year=${year}${dateRange.params}`);
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (err) {
                console.error('Error fetching ads summary:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, month, year, dateRange.key]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!data || !data.rows || data.rows.length === 0) {
        return (
            <div className="text-center text-gray-400 py-20">
                <span className="material-icons text-6xl mb-4 block">info</span>
                <p className="text-lg">ไม่พบข้อมูลสำหรับเดือนนี้</p>
            </div>
        );
    }

    const { rows, totals } = data;

    // Sort by page name number
    const sortedRows = [...rows].sort((a, b) => {
        const numA = parseInt(a.page_name) || 999;
        const numB = parseInt(b.page_name) || 999;
        return numA - numB;
    });

    // Calculate derived values for totals
    const totalRoas = totals.ads_cost > 0 ? totals.total_sales / totals.ads_cost : 0;
    const totalCostPerClick = totals.clicks > 0 ? totals.ads_cost / totals.clicks : 0;
    const totalAdsPercentNew = totals.new_sales > 0 ? (totals.ads_cost / totals.new_sales) * 100 : 0;
    const totalAdsPercent = totals.total_sales > 0 ? (totals.ads_cost / totals.total_sales) * 100 : 0;
    const totalClosingRate = totals.clicks > 0 ? (totals.order_count / totals.clicks) * 100 : 0;

    const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <DateRangeFilter value={dateRange} />
                <div className={dateRange.active ? 'opacity-50 pointer-events-none flex items-center gap-4 flex-wrap' : 'flex items-center gap-4 flex-wrap'}>
                    <select
                        value={month}
                        onChange={e => setMonth(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        {months.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                        {[2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-5">
                    <div className="text-xs text-gray-500 mb-1">ค่าแอดรวม</div>
                    <div className="text-xl font-bold text-red-500">{formatNumber(totals.ads_cost)}</div>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="text-xs text-gray-500 mb-1">ยอดขายรวม</div>
                    <div className="text-xl font-bold text-emerald-600">{formatNumber(totals.total_sales)}</div>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="text-xs text-gray-500 mb-1">ROAS รวม</div>
                    <div className="text-xl font-bold text-primary">{totalRoas.toFixed(2)}</div>
                </div>
                <div className="glass-card rounded-2xl p-5">
                    <div className="text-xs text-gray-500 mb-1">%Ads รวม</div>
                    <div className="text-xl font-bold text-amber-600">{formatPercent(totalAdsPercent)}</div>
                </div>
            </div>

            {/* Table */}
            <section className="glass-card rounded-3xl overflow-hidden">
                <div className="px-8 py-6 border-b border-glass-border">
                    <h3 className="text-lg font-bold">สรุปการยิง Ads แยกตามเพจ</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {months[month - 1]} {year} — {sortedRows.length} เพจ
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="pl-6 pr-3 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-white z-10 min-w-[260px]" style={{ boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                    เพจ
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px]">
                                    ประเภทเพจ
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[90px]">
                                    พนักงาน
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">
                                    ค่าแอด
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">
                                    ยอดขาย
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">
                                    ยอดขาย<br />ลค.ใหม่
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">
                                    รีออเดอร์
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[70px]">
                                    จำนวน<br />ลูกค้า
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[70px]">
                                    ทัก/<br />คลิก
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[60px]">
                                    ROAS
                                </th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px]">
                                    ราคาต่อ<br />ทัก
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px]">
                                    %Ads/ยอด<br />ลค.ใหม่
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[60px]">
                                    %Ads
                                </th>
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest min-w-[70px]">
                                    %ปิด<br />การขาย
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((row, idx) => {
                                const roas = row.ads_cost > 0 ? row.total_sales / row.ads_cost : 0;
                                const costPerClick = row.clicks > 0 ? row.ads_cost / row.clicks : 0;
                                const adsPercentNew = row.new_sales > 0 ? (row.ads_cost / row.new_sales) * 100 : 0;
                                const adsPercent = row.total_sales > 0 ? (row.ads_cost / row.total_sales) * 100 : 0;
                                const closingRate = row.clicks > 0 ? (row.order_count / row.clicks) * 100 : 0;

                                return (
                                    <tr key={row.page_id} className="hover:bg-primary/5 transition-colors" style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                        <td className="pl-6 pr-3 py-3 text-sm font-bold text-primary sticky left-0 z-10 border-b border-gray-50" style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                            <div className="truncate max-w-[240px]" title={row.page_name}>
                                                {row.page_name}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-600 border-b border-gray-50">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${row.sell_product_type === 'ซุปเปอร์โลโซ' ? 'bg-blue-50 text-blue-600' :
                                                    row.sell_product_type === 'พลอย' ? 'bg-purple-50 text-purple-600' :
                                                        row.sell_product_type === 'ไลโซซิน' ? 'bg-teal-50 text-teal-600' :
                                                            'bg-gray-100 text-gray-500'
                                                }`}>
                                                {row.sell_product_type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-600 border-b border-gray-50">
                                            {row.assigned_user || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs font-semibold text-red-500 border-b border-gray-50">
                                            {formatNumber(row.ads_cost)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs font-semibold text-emerald-600 border-b border-gray-50">
                                            {formatNumber(row.total_sales)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs font-semibold text-blue-600 border-b border-gray-50">
                                            {formatNumber(row.new_sales)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs text-gray-600 border-b border-gray-50">
                                            {formatNumber(row.reorder_sales)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-700 border-b border-gray-50">
                                            {row.customer_count}
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-700 border-b border-gray-50 font-semibold">
                                            {row.clicks.toLocaleString()}
                                        </td>
                                        <td className={`px-3 py-3 text-center text-xs font-bold border-b border-gray-50 ${roas >= 3 ? 'text-emerald-600' : roas >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                                            {roas.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs text-gray-600 border-b border-gray-50">
                                            {formatNumber(costPerClick)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-600 border-b border-gray-50">
                                            {formatPercent(adsPercentNew)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-xs text-gray-600 border-b border-gray-50">
                                            {formatPercent(adsPercent)}
                                        </td>
                                        <td className={`px-3 py-3 text-center text-xs font-bold border-b border-gray-50 ${closingRate >= 50 ? 'text-emerald-600' : closingRate >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                                            {formatPercent(closingRate)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Totals Row */}
                            <tr className="border-t-2 border-gray-300 bg-slate-50 font-bold">
                                <td className="pl-6 pr-3 py-4 text-sm text-gray-700 sticky left-0 z-10" style={{ backgroundColor: '#f1f3f5', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                    รวมทั้งหมด
                                </td>
                                <td className="px-3 py-4 text-center text-xs text-gray-400">-</td>
                                <td className="px-3 py-4 text-center text-xs text-gray-400">-</td>
                                <td className="px-3 py-4 text-right text-sm text-red-600">{formatNumber(totals.ads_cost)}</td>
                                <td className="px-3 py-4 text-right text-sm text-emerald-700">{formatNumber(totals.total_sales)}</td>
                                <td className="px-3 py-4 text-right text-sm text-blue-700">{formatNumber(totals.new_sales)}</td>
                                <td className="px-3 py-4 text-right text-sm text-gray-700">{formatNumber(totals.reorder_sales)}</td>
                                <td className="px-3 py-4 text-center text-sm text-gray-700">{totals.customer_count}</td>
                                <td className="px-3 py-4 text-center text-sm text-gray-700">{totals.clicks.toLocaleString()}</td>
                                <td className={`px-3 py-4 text-center text-sm ${totalRoas >= 3 ? 'text-emerald-700' : totalRoas >= 2 ? 'text-amber-700' : 'text-red-600'}`}>{totalRoas.toFixed(2)}</td>
                                <td className="px-3 py-4 text-right text-sm text-gray-700">{formatNumber(totalCostPerClick)}</td>
                                <td className="px-3 py-4 text-center text-sm text-gray-700">{formatPercent(totalAdsPercentNew)}</td>
                                <td className="px-3 py-4 text-center text-sm text-gray-700">{formatPercent(totalAdsPercent)}</td>
                                <td className={`px-3 py-4 text-center text-sm ${totalClosingRate >= 50 ? 'text-emerald-700' : totalClosingRate >= 20 ? 'text-amber-700' : 'text-red-600'}`}>{formatPercent(totalClosingRate)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdsSummaryPage;

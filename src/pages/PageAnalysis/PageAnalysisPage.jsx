import { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/UI';

function PageAnalysisPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('pageAnalysis_month');
        return saved ? parseInt(saved) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('pageAnalysis_year');
        return saved ? parseInt(saved) : currentDate.getFullYear();
    });

    const months = [
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('pageAnalysis_month', month.toString());
        sessionStorage.setItem('pageAnalysis_year', year.toString());
    }, [month, year]);

    useEffect(() => {
        fetchData();
    }, [month, year, user?.company_id]);

    const fetchData = async () => {
        if (!user?.company_id) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                company_id: user.company_id,
                month,
                year
            });
            const response = await fetch(`./api/reports/page_analysis.php?${params}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => new Intl.NumberFormat('th-TH').format(num || 0);
    const formatCurrency = (num) => '฿' + formatNumber(num);

    // Get peak hours from overall timeline
    const getPeakHours = (timeline) => {
        if (!timeline) return [];
        const indexed = timeline.map((count, hour) => ({ hour, count }));
        return indexed.sort((a, b) => b.count - a.count).slice(0, 3);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/80 relative z-50 gap-3">
                <div className="px-2">
                    <h2 className="text-lg font-bold text-gray-700">วิเคราะห์ Page</h2>
                    <p className="text-xs text-gray-500">
                        {months.find(m => m.value === month)?.label} {year}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                        <CustomSelect
                            value={month}
                            onChange={(val) => setMonth(val)}
                            options={months}
                        />
                        <div className="w-px h-6 bg-gray-200"></div>
                        <CustomSelect
                            value={year}
                            onChange={(val) => setYear(val)}
                            options={[
                                { value: 2026, label: '2026' },
                                { value: 2025, label: '2025' },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            ) : error ? (
                <div className="p-10 glass-card rounded-3xl text-center text-red-500">{error}</div>
            ) : data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">จำนวน Pages</div>
                            <div className="text-2xl font-bold text-gray-800">{data.summary.total_pages}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">ออเดอร์ทั้งหมด</div>
                            <div className="text-2xl font-bold text-primary">{formatNumber(data.summary.total_orders)}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">ยอดขายรวม</div>
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.summary.total_sales)}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">ค่าโฆษณารวม</div>
                            <div className="text-2xl font-bold text-red-500">{formatCurrency(data.summary.total_ads_cost)}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">Impressions</div>
                            <div className="text-2xl font-bold text-blue-600">{formatNumber(data.summary.total_impressions)}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">Reach</div>
                            <div className="text-2xl font-bold text-purple-600">{formatNumber(data.summary.total_reach)}</div>
                        </div>
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="text-xs text-gray-500 mb-1">Clicks</div>
                            <div className="text-2xl font-bold text-orange-600">{formatNumber(data.summary.total_clicks)}</div>
                        </div>
                    </div>

                    {/* Overall Timeline Chart */}
                    <section className="glass-card rounded-3xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-glass-border">
                            <h3 className="text-lg font-bold">Order Timeline (รวมทุก Page)</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                ช่วงเวลาที่มี Order เยอะที่สุด: {getPeakHours(data.overall_timeline).map(p =>
                                    `${p.hour}:00 (${p.count} orders)`
                                ).join(', ')}
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="flex items-end gap-1" style={{ height: '160px' }}>
                                {data.overall_timeline.map((count, hour) => {
                                    const maxCount = Math.max(...data.overall_timeline) || 1;
                                    const barMaxHeight = 140;
                                    const barHeight = count > 0 ? Math.max(4, (count / maxCount) * barMaxHeight) : 0;
                                    return (
                                        <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: '100%' }}>
                                            {/* Tooltip */}
                                            {count > 0 && (
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    {hour}:00 — {count} ออเดอร์
                                                </div>
                                            )}
                                            <div
                                                className="w-full bg-primary/70 rounded-t hover:bg-primary transition-colors cursor-pointer"
                                                style={{ height: `${barHeight}px` }}
                                            ></div>
                                            <span className="text-[10px] text-gray-400 mt-1">{hour}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Page Performance Table */}
                    <section className="glass-card rounded-3xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-glass-border">
                            <h3 className="text-lg font-bold">รายละเอียดแต่ละ Page ({data.pages.length})</h3>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">#</th>
                                        <th className="px-4 py-3">Page</th>
                                        <th className="px-4 py-3">Platform</th>
                                        <th className="px-4 py-3 text-right">ออเดอร์</th>
                                        <th className="px-4 py-3 text-right">ยอดขาย</th>
                                        <th className="px-4 py-3 text-right">ค่า Ads</th>
                                        <th className="px-4 py-3 text-right">Impressions</th>
                                        <th className="px-4 py-3 text-right">Reach</th>
                                        <th className="px-4 py-3 text-right">Clicks</th>
                                        <th className="px-4 py-3">Peak Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.pages.map((page, idx) => {
                                        const peakHours = getPeakHours(page.timeline).slice(0, 2);
                                        return (
                                            <tr key={page.page_id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-4 text-gray-400">{idx + 1}</td>
                                                <td className="px-4 py-4 font-bold text-primary">{page.page_name}</td>
                                                <td className="px-4 py-4 text-gray-500 text-xs">{page.platform}</td>
                                                <td className="px-4 py-4 text-right text-gray-600">{formatNumber(page.order_count)}</td>
                                                <td className="px-4 py-4 text-right font-bold text-gray-800">{formatCurrency(page.total_sales)}</td>
                                                <td className="px-4 py-4 text-right text-red-500">{formatCurrency(page.ads_cost)}</td>
                                                <td className="px-4 py-4 text-right text-gray-600">{formatNumber(page.impressions)}</td>
                                                <td className="px-4 py-4 text-right text-gray-600">{formatNumber(page.reach)}</td>
                                                <td className="px-4 py-4 text-right text-gray-600">{formatNumber(page.clicks)}</td>
                                                <td className="px-4 py-4 text-xs text-gray-500">
                                                    {peakHours.length > 0
                                                        ? peakHours.map(p => `${p.hour}:00`).join(', ')
                                                        : '-'
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Product × Page Pivot Table */}
                    {data.product_by_page && data.all_products && data.all_products.length > 0 && (() => {
                        const pivotMap = {};
                        const pageNames = {};
                        const pageTotals = {};
                        const productTotals = {};

                        data.product_by_page.forEach(row => {
                            if (!pivotMap[row.page_id]) pivotMap[row.page_id] = {};
                            if (!pageNames[row.page_id]) pageNames[row.page_id] = row.page_name;
                            pivotMap[row.page_id][row.product_id] = { sales: row.sales, qty: row.qty };
                            pageTotals[row.page_id] = (pageTotals[row.page_id] || 0) + row.sales;
                            productTotals[row.product_id] = (productTotals[row.product_id] || 0) + row.sales;
                        });

                        const sortedPageIds = Object.keys(pageNames).sort((a, b) => {
                            const numA = parseInt(pageNames[a]) || 999;
                            const numB = parseInt(pageNames[b]) || 999;
                            return numA - numB;
                        });
                        const sortedProducts = [...data.all_products].sort((a, b) =>
                            (productTotals[b.id] || 0) - (productTotals[a.id] || 0)
                        );
                        const grandTotal = Object.values(pageTotals).reduce((a, b) => a + b, 0);

                        return (
                            <section className="glass-card rounded-3xl overflow-hidden">
                                <div className="px-8 py-6 border-b border-glass-border">
                                    <h3 className="text-lg font-bold">สินค้าที่ขายแยกตาม Page</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {sortedPageIds.length} เพจ × {sortedProducts.length} สินค้า
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white">
                                                <th className="pl-6 pr-3 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-white z-10 border-b border-gray-100 min-w-[260px]" style={{ boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                                    Page
                                                </th>
                                                {sortedProducts.map(prod => (
                                                    <th key={prod.id} className="px-2 py-3 text-center border-b border-gray-100 min-w-[100px] bg-white">
                                                        <div className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]" title={prod.name}>{prod.name}</div>
                                                        <div className={`text-[9px] mt-0.5 ${prod.category?.includes('ปุ๋ย') ? 'text-emerald-500' : prod.category === 'ชีวภัณฑ์' ? 'text-amber-500' : 'text-gray-400'}`}>
                                                            {prod.category || '-'}
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest text-right border-b border-gray-200 min-w-[100px] bg-white">
                                                    รวม
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedPageIds.map((pageId, idx) => (
                                                <tr key={pageId} className="hover:bg-primary/5 transition-colors" style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                                    <td className="pl-6 pr-3 py-3 font-bold text-primary text-sm sticky left-0 z-10 border-b border-gray-50" style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                                        <div className="truncate max-w-[240px]" title={pageNames[pageId]}>
                                                            {pageNames[pageId]}
                                                        </div>
                                                    </td>
                                                    {sortedProducts.map(prod => {
                                                        const cell = pivotMap[pageId]?.[prod.id];
                                                        return (
                                                            <td key={prod.id} className="px-2 py-3 text-center border-b border-gray-50">
                                                                {cell ? (
                                                                    <div>
                                                                        <div className="font-semibold text-gray-700 text-xs">
                                                                            {formatNumber(Math.round(cell.sales))}
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400">
                                                                            {cell.qty} ชิ้น
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-200">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-3 text-right font-bold text-gray-800 text-sm border-b border-gray-50 bg-gray-50/50">
                                                        {formatCurrency(Math.round(pageTotals[pageId]))}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Total Row */}
                                            <tr className="border-t-2 border-gray-200">
                                                <td className="pl-6 pr-3 py-3 font-bold text-gray-700 text-sm sticky left-0 z-10" style={{ backgroundColor: '#f1f3f5', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                                    รวมทั้งหมด
                                                </td>
                                                {sortedProducts.map(prod => (
                                                    <td key={prod.id} className="px-2 py-3 text-center">
                                                        <div className="font-bold text-gray-700 text-xs">
                                                            {productTotals[prod.id] ? formatNumber(Math.round(productTotals[prod.id])) : '-'}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="px-3 py-3 text-right font-bold text-primary text-base">
                                                    {formatCurrency(Math.round(grandTotal))}
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-gray-100">
                                                <td className="pl-6 pr-3 py-2 text-[10px] text-gray-400 sticky left-0 z-10" style={{ backgroundColor: '#ffffff', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.06)' }}>
                                                    สินค้า
                                                </td>
                                                {sortedProducts.map(prod => (
                                                    <td key={prod.id} className="px-2 py-2 text-center">
                                                        <div className="text-[9px] text-gray-500 font-medium truncate max-w-[100px]" title={prod.name}>{prod.name}</div>
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>
                        );
                    })()}
                </>
            )}
        </div>
    );
}

export default PageAnalysisPage;

import { useState, useEffect, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import { DateRangeFilter } from '../../components/UI';
import useDateRange from '../../hooks/useDateRange';

/* ==================== EXECUTIVE INSIGHT — M3-inspired Redesign ==================== */
function ExecutiveInsightPage({ user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const dateRange = useDateRange('executiveInsight');

    const API_BASE = import.meta.env.VITE_API_URL || '/api';

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/reports/executive_summary.php?company_id=${user?.company_id || 1}&month=${month}&year=${year}${dateRange.active ? dateRange.params : ''}`)
            .then(r => r.json())
            .then(res => { if (res.success) setData(res.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [month, year, user?.company_id, dateRange.key]);

    const fmt = (n) => n != null ? Number(n).toLocaleString('th-TH') : '0';
    const fmtM = (n) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
        return fmt(n);
    };
    const monthNames = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    if (loading) return (
        <div className="apple-exec"><style>{appleStyles}</style>
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-[3px] border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 text-xs mt-6 tracking-[0.2em] uppercase">กำลังรวบรวมข้อมูล</p>
                </div>
            </div>
        </div>
    );

    if (!data) return (
        <div className="apple-exec"><style>{appleStyles}</style>
            <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-400 text-sm">ไม่สามารถโหลดข้อมูลได้</p></div>
        </div>
    );

    const sales = data.sales || {};
    const topSellersTelesale = data.top_sellers_telesale || [];
    const topSellersAdmin = data.top_sellers_admin || [];
    const byCategory = data.by_category || [];
    const byChannel = data.by_channel || [];
    const byDepartment = data.by_department || [];
    const byPage = data.by_page || [];
    const topProducts = data.top_products || [];
    const byRegion = data.by_region || [];
    const topProvinces = data.top_provinces || [];
    const acct = data.accounting || {};
    const insights = data.insights || [];

    return (
        <div className="apple-exec -m-8">
            <style>{appleStyles}</style>

            {/* Floating date picker — sticky top-right */}
            <div className="fixed top-20 right-6 z-30 flex items-center gap-2">
                <DateRangeFilter value={dateRange} />
                <div className={`flex items-center gap-1 bg-white/80 backdrop-blur-xl rounded-full px-4 py-2 shadow-lg border border-gray-100 ${dateRange.active ? 'opacity-50 pointer-events-none' : ''}`}>
                    <span className="material-symbols-outlined text-[16px] text-gray-400 mr-1">calendar_month</span>
                    <select value={month} onChange={e => setMonth(+e.target.value)}
                        className="text-xs text-gray-600 bg-transparent border-0 outline-none cursor-pointer font-semibold">
                        {monthNames.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(+e.target.value)}
                        className="text-xs text-gray-600 bg-transparent border-0 outline-none cursor-pointer font-semibold">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* ===== HERO ===== */}
            <Reveal>
                <section className="relative mb-32 flex flex-col items-center text-center min-h-[70vh] justify-center overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
                        <span className="font-black tracking-tighter leading-none"
                              style={{ fontSize: 'clamp(200px, 30vw, 400px)', color: 'rgba(0,0,0,0.04)' }}>{data.year}</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-semibold tracking-[0.25em] text-gray-400 mb-5 uppercase">Performance Report</p>
                        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter text-gray-900 leading-none mb-8"
                            style={{ textShadow: '0 2px 40px rgba(0,0,0,0.06)' }}>{data.month_name}</h1>
                        <div className="w-12 h-1 bg-gray-900 mx-auto mb-8 rounded-full"></div>
                        <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium">
                            สรุปภาพรวมผลประกอบการประจำเดือน <span className="text-gray-300">·</span> {data.year}
                        </p>
                    </div>
                </section>
            </Reveal>

            {/* ===== BIG NUMBERS ===== */}
            <Reveal>
                <section className="mb-32 px-8 md:px-16">
                    <div className="text-center mb-16">
                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.25em] uppercase">Gross Revenue</span>
                        <p className="font-black text-gray-900 tabular-nums tracking-tight leading-none my-4"
                           style={{ fontSize: 'clamp(72px, 12vw, 140px)' }}>
                            ฿<CountUp end={sales.total_sales || 0} duration={1500} />
                        </p>
                        {sales.sales_growth != null && (
                            <div className={`flex items-center justify-center gap-2 font-bold ${sales.sales_growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                <span className="material-symbols-outlined text-lg">{sales.sales_growth >= 0 ? 'trending_up' : 'trending_down'}</span>
                                <span>{sales.sales_growth >= 0 ? '+' : ''}{sales.sales_growth}% vs Last Month</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="p-12 bg-white rounded-[2.5rem] flex flex-col items-center text-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 tracking-[0.25em] uppercase mb-4">Total Orders</span>
                            <div className="text-6xl font-black text-gray-900 tabular-nums mb-4">
                                <CountUp end={sales.total_orders || 0} duration={1800} />
                            </div>
                            {sales.orders_growth != null && (
                                <div className={`text-sm font-medium ${sales.orders_growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {sales.orders_growth >= 0 ? '↑' : '↓'} {Math.abs(sales.orders_growth)}% จากเดือนก่อน
                                </div>
                            )}
                        </div>
                        <div className="p-12 bg-white rounded-[2.5rem] flex flex-col items-center text-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 tracking-[0.25em] uppercase mb-4">New Customers</span>
                            <div className="text-6xl font-black text-gray-900 tabular-nums mb-4">
                                <CountUp end={sales.total_customers || 0} duration={1800} />
                            </div>
                            <div className="text-sm font-medium text-gray-400">จำนวนลูกค้าทั้งหมด</div>
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ===== TREND ===== */}
            <Reveal>
                <section className="mb-32 px-8 md:px-16">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-4xl font-black tracking-tight mb-2">Sales Trends</h2>
                            <p className="text-gray-500 font-medium">รายเดือน · ปี {data.year}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-900"></div>
                            <span className="text-xs font-bold text-gray-500">เดือนปัจจุบัน</span>
                        </div>
                    </div>
                    <div className="flex items-end justify-between gap-[3px] md:gap-2" style={{ height: '260px' }}>
                        {data.monthly_trend.map((m, i) => {
                            const max = Math.max(...data.monthly_trend.map(x => x.sales), 1);
                            const pct = (m.sales / max) * 100;
                            const hasSales = m.sales > 0;
                            const isCurrent = m.month === data.month;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-center -mb-1">
                                        <p className="text-[10px] font-bold text-gray-900">฿{fmtM(m.sales)}</p>
                                        <p className="text-[8px] text-gray-400">{m.orders} orders</p>
                                    </div>
                                    <div className={`w-full rounded-xl transition-all duration-500 group-hover:scale-x-110 ${isCurrent ? 'group-hover:shadow-lg group-hover:shadow-gray-900/10' : ''}`}
                                         style={{ height: hasSales ? `${Math.max(pct, 12)}%` : '4px', flexShrink: 0 }}>
                                        <div className={`w-full h-full rounded-xl trend-bar ${isCurrent ? 'bg-gray-900' : hasSales ? 'bg-gray-200 group-hover:bg-gray-300' : 'bg-gray-100'}`}
                                             style={{ animationDelay: `${i * 60}ms` }}></div>
                                    </div>
                                    <span className={`text-[10px] font-semibold ${isCurrent ? 'text-gray-900' : 'text-gray-300'}`}>{m.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </Reveal>

            {/* ===== DEPARTMENTS — Split Layout ===== */}
            {byDepartment.length > 0 && (
                <Reveal>
                    <section className="mb-32 grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100 border-y border-gray-100 py-24 mx-8 md:mx-16">
                        {byDepartment.map((d, i) => {
                            const total = byDepartment.reduce((s, x) => s + x.sales, 0) || 1;
                            const pct = (d.sales / total * 100);
                            return (
                                <div key={i} className="px-12 text-center dept-item" style={{ animationDelay: `${i * 120}ms` }}>
                                    <h3 className="text-[10px] font-bold tracking-[0.25em] text-gray-400 uppercase mb-6">{d.department}</h3>
                                    <div className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 tabular-nums mb-4">฿{fmt(d.sales)}</div>
                                    <div className="text-gray-500 font-bold">{pct.toFixed(1)}% of total volume</div>
                                    <div className="text-[10px] text-gray-300 mt-2">{d.orders} ออเดอร์ · {d.customers} ลูกค้า</div>
                                </div>
                            );
                        })}
                    </section>
                </Reveal>
            )}

            {/* ===== CATEGORIES & CHANNELS ===== */}
            <Reveal>
                <section className="mb-32 grid grid-cols-1 md:grid-cols-2 gap-24 px-8 md:px-16">
                    <div>
                        <h3 className="text-2xl font-black mb-12">Product Categories</h3>
                        <div className="space-y-8">
                            {byCategory.map((c, i) => {
                                const total = byCategory.reduce((s, x) => s + x.sales, 0) || 1;
                                const pct = (c.sales / total * 100);
                                return (
                                    <div key={i} className="space-y-2 cat-item" style={{ animationDelay: `${i * 80}ms` }}>
                                        <div className="flex justify-between text-sm font-bold uppercase tracking-tight">
                                            <span>{c.category}</span>
                                            <span className="text-gray-400 tabular-nums">฿{fmt(c.sales)} · {pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-900 rounded-full cat-bar" style={{ '--target-width': `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black mb-12">Sales Channels</h3>
                        <div className="space-y-8">
                            {byChannel.map((c, i) => {
                                const total = byChannel.reduce((s, x) => s + x.sales, 0) || 1;
                                const pct = (c.sales / total * 100);
                                return (
                                    <div key={i} className="space-y-2 ch-item" style={{ animationDelay: `${i * 80}ms` }}>
                                        <div className="flex justify-between text-sm font-bold uppercase tracking-tight">
                                            <span>{c.channel}</span>
                                            <span className="text-gray-400 tabular-nums">฿{fmt(c.sales)} · {pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-500 rounded-full ch-bar" style={{ '--target-width': `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ===== PERFORMANCE RANKING (Top Sellers) ===== */}
            <Reveal>
                <section className="mb-32 px-8 md:px-16">
                    <div className="mb-12">
                        <h2 className="text-4xl font-black tracking-tight mb-2">Performance Ranking</h2>
                        <p className="text-gray-500 font-medium">Top เซลส์ · จัดอันดับตามยอดขาย</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        {/* Telesale */}
                        <div className="space-y-5">
                            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase border-b border-gray-200 pb-2 mb-6">Telesale &amp; Supervisor</p>
                            {topSellersTelesale.length === 0 ? (
                                <p className="text-center text-gray-300 text-sm py-12">ไม่พบข้อมูล</p>
                            ) : topSellersTelesale.map((s, i) => {
                                const max = topSellersTelesale[0]?.sales || 1;
                                const pct = (s.sales / max) * 100;
                                return (
                                    <div key={i} className="seller-row flex items-center gap-4" style={{ animationDelay: `${i * 100}ms` }}>
                                        <span className="text-xl font-black text-gray-200 w-8 tabular-nums text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between font-bold mb-1.5">
                                                <span className="text-sm text-gray-900">{s.name}</span>
                                                <span className="text-sm text-gray-900 tabular-nums">฿{fmt(s.sales)}</span>
                                            </div>
                                            <div className="h-1 bg-gray-900 rounded-full seller-bar" style={{ '--target-width': `${pct}%` }}></div>
                                            <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
                                                <span>{s.orders} ออเดอร์</span><span>{s.customers} ลูกค้า</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Admin */}
                        <div className="space-y-5">
                            <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase border-b border-gray-200 pb-2 mb-6">Admin Page</p>
                            {topSellersAdmin.length === 0 ? (
                                <p className="text-center text-gray-300 text-sm py-12">ไม่พบข้อมูล</p>
                            ) : topSellersAdmin.map((s, i) => {
                                const max = topSellersAdmin[0]?.sales || 1;
                                const pct = (s.sales / max) * 100;
                                return (
                                    <div key={i} className="seller-row flex items-center gap-4" style={{ animationDelay: `${i * 100}ms` }}>
                                        <span className="text-xl font-black text-gray-200 w-8 tabular-nums text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between font-bold mb-1.5">
                                                <span className="text-sm text-gray-900">{s.name}</span>
                                                <span className="text-sm text-gray-900 tabular-nums">฿{fmt(s.sales)}</span>
                                            </div>
                                            <div className="h-1 bg-gray-500 rounded-full seller-bar" style={{ '--target-width': `${pct}%` }}></div>
                                            <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
                                                <span>{s.orders} ออเดอร์</span><span>{s.customers} ลูกค้า</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ===== PAGES & PRODUCTS ===== */}
            {(byPage.length > 0 || topProducts.length > 0) && (
                <Reveal>
                    <section className="mb-32 px-8 md:px-16">
                        <div className="mb-12">
                            <h2 className="text-4xl font-black tracking-tight mb-2">เพจ &amp; สินค้าขายดี</h2>
                            <p className="text-gray-500 font-medium">Top 10 · จัดอันดับตามยอดขาย</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            {/* Pages */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase border-b border-gray-200 pb-2 mb-4">Top Pages</p>
                                {byPage.length === 0 ? (
                                    <p className="text-center text-gray-300 text-sm py-12">ไม่พบข้อมูล</p>
                                ) : byPage.map((p, i) => {
                                    const max = byPage[0]?.sales || 1;
                                    const pct = (p.sales / max) * 100;
                                    return (
                                        <div key={i} className="page-row flex items-center gap-3 py-3 border-b border-gray-50 last:border-0" style={{ animationDelay: `${i * 80}ms` }}>
                                            <span className="text-lg font-black text-gray-200 w-8 tabular-nums text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <div className="min-w-0 flex-1 mr-3">
                                                        <span className="text-sm font-bold text-gray-900 truncate block">{p.page_name}</span>
                                                        <span className="text-[10px] text-gray-400">{p.platform || '\u00a0'}</span>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className="text-sm font-black text-gray-900 tabular-nums block">฿{fmt(p.sales)}</span>
                                                        <span className="text-[9px] text-gray-400">{p.orders} ออเดอร์</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                                                    <div className="h-full rounded-full bg-gray-600 page-bar" style={{ '--target-width': `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Products */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase border-b border-gray-200 pb-2 mb-4">Top Products</p>
                                {topProducts.length === 0 ? (
                                    <p className="text-center text-gray-300 text-sm py-12">ไม่พบข้อมูล</p>
                                ) : topProducts.map((p, i) => {
                                    const max = topProducts[0]?.sales || 1;
                                    const pct = (p.sales / max) * 100;
                                    return (
                                        <div key={i} className="prod-row flex items-center gap-3 py-3 border-b border-gray-50 last:border-0" style={{ animationDelay: `${i * 60}ms` }}>
                                            <span className="text-lg font-black text-gray-200 w-8 tabular-nums text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <div className="min-w-0 flex-1 mr-3">
                                                        <span className="text-sm font-bold text-gray-900 block truncate">{p.product_name}</span>
                                                        <span className="text-[10px] text-gray-400">{p.category || '\u00a0'}</span>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className="text-sm font-black text-gray-900 tabular-nums block">฿{fmt(p.sales)}</span>
                                                        <span className="text-[9px] text-gray-400">{p.qty} ชิ้น · {p.orders} ออเดอร์</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-50 rounded-full h-1 overflow-hidden">
                                                    <div className="h-full rounded-full bg-gray-900 prod-bar" style={{ '--target-width': `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </Reveal>
            )}

            {/* ===== GEOGRAPHIC DISTRIBUTION ===== */}
            {byRegion.length > 0 && (
                <Reveal>
                    <section className="mb-32 px-8 md:px-16">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-black tracking-tight mb-2">Geographic Distribution</h2>
                            <p className="text-gray-500 font-medium">แผนที่ประเทศไทย · จำแนกตามภาค</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                            {/* Left region cards */}
                            <div className="space-y-4">
                                {byRegion.filter((_, i) => i % 2 === 0).map((r, i) => (
                                    <div key={i} className="p-6 bg-gray-50 rounded-2xl region-row" style={{ animationDelay: `${i * 150}ms` }}>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">{r.region || 'ไม่ระบุ'}</span>
                                        <div className="text-3xl font-black mt-2 tabular-nums">฿{fmtM(r.sales)}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">{r.orders} ออเดอร์</div>
                                    </div>
                                ))}
                            </div>
                            {/* Center map */}
                            <div className="flex justify-center">
                                <ThailandMap regions={byRegion} fmt={fmt} />
                            </div>
                            {/* Right region cards */}
                            <div className="space-y-4">
                                {byRegion.filter((_, i) => i % 2 === 1).map((r, i) => (
                                    <div key={i} className="p-6 bg-gray-50 rounded-2xl region-row" style={{ animationDelay: `${i * 150}ms` }}>
                                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">{r.region || 'ไม่ระบุ'}</span>
                                        <div className="text-3xl font-black mt-2 tabular-nums">฿{fmtM(r.sales)}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">{r.orders} ออเดอร์</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </Reveal>
            )}

            {/* ===== TOP PROVINCES ===== */}
            {topProvinces.length > 0 && (
                <Reveal>
                    <section className="mb-32 px-8 md:px-16 lg:px-32">
                        <h2 className="text-4xl font-black tracking-tight text-center mb-2">จังหวัดขายดี</h2>
                        <p className="text-gray-500 text-center mb-12 font-medium">Top 15 จังหวัด · จัดอันดับตามยอดขาย</p>
                        <div>
                            {topProvinces.map((p, i) => {
                                const max = topProvinces[0]?.sales || 1;
                                const pct = (p.sales / max) * 100;
                                return (
                                    <div key={i} className="prov-row flex items-center gap-4 py-3 border-b border-gray-50 last:border-0" style={{ animationDelay: `${i * 50}ms` }}>
                                        <span className="text-lg font-black text-gray-200 w-8 tabular-nums text-right flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <div>
                                                    <span className="text-sm font-bold text-gray-900">{p.province}</span>
                                                    {p.region && <span className="text-[10px] text-gray-400 ml-2">{p.region}</span>}
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-sm font-black text-gray-900 tabular-nums">฿{fmt(p.sales)}</span>
                                                    <span className="text-[9px] text-gray-400 ml-2">{p.orders} ออเดอร์</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-50 rounded-full h-1 overflow-hidden">
                                                <div className="h-full rounded-full bg-gray-900 prov-bar" style={{ '--target-width': `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </Reveal>
            )}

            {/* ===== ACCOUNTING — Dark Inverted Section ===== */}
            <Reveal>
                <section className="mb-32 bg-gray-900 text-white py-24 px-12 rounded-[3rem] mx-6 md:mx-12">
                    <div className="max-w-4xl mx-auto flex flex-col items-center">
                        <h2 className="text-4xl font-black tracking-tight mb-16">Match Reconciliation</h2>
                        <div className="relative w-72 h-72 md:w-80 md:h-80 mb-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="8"
                                    strokeDasharray={`${(acct.match_rate / 100) * 327} 327`}
                                    strokeLinecap="round" className="donut-ring" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-6xl font-black">{acct.match_rate}<span className="text-2xl">%</span></span>
                                <span className="text-[10px] text-white/60 tracking-widest uppercase mt-1">Match Rate</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">Total Amount</p>
                                <p className="text-xl font-bold">{fmt(acct.statement_total)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">Matched</p>
                                <p className="text-xl font-bold">{fmt(acct.matched)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">Unmatched</p>
                                <p className="text-xl font-bold">{fmt(acct.unmatched)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">Pending</p>
                                <p className="text-xl font-bold">฿{fmt(acct.unmatched_amount)}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ===== STRATEGIC INSIGHTS — Card Grid ===== */}
            <Reveal>
                <section className="mb-32 px-8 md:px-16">
                    <h2 className="text-5xl font-black tracking-tight mb-16">Strategic Insights</h2>
                    {insights.length === 0 ? (
                        <p className="text-gray-300 text-sm text-center py-16">ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {insights.map((ins, i) => {
                                const heroMap = {
                                    growth: '/assets/insight-hero-growth.png',
                                    decline: '/assets/insight-hero-decline.png',
                                    seller: '/assets/insight-hero-seller.png',
                                    channel: '/assets/insight-hero-channel.png',
                                    product: '/assets/insight-hero-product.png',
                                    delivery: '/assets/insight-hero-delivery.png',
                                    accounting: '/assets/insight-hero-accounting.png',
                                    recommend: '/assets/insight-hero-recommend.png',
                                };
                                const heroImg = heroMap[ins.icon] || heroMap.growth;
                                const accentMap = {
                                    positive: 'text-emerald-600',
                                    negative: 'text-red-500',
                                    warning: 'text-amber-600',
                                    info: 'text-gray-600',
                                };
                                const ac = accentMap[ins.type] || accentMap.info;
                                return (
                                    <div key={i} className="group cursor-pointer insight-card" style={{ animationDelay: `${i * 150}ms` }}>
                                        <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-gray-100 mb-8">
                                            <img src={heroImg} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        </div>
                                        <span className={`text-[10px] font-bold tracking-[0.15em] uppercase mb-2 inline-block ${ac}`}>
                                            {String(i + 1).padStart(2, '0')} — {ins.type || 'Insight'}
                                        </span>
                                        {ins.title && <h3 className="text-xl font-black mb-3">{ins.title}</h3>}
                                        {ins.text && <p className="text-gray-500 font-medium leading-relaxed text-sm">{ins.text}</p>}
                                        {ins.items && ins.items.length > 0 && (
                                            <div className="space-y-2 mt-3">
                                                {ins.items.map((item, j) => (
                                                    <p key={j} className="text-gray-500 font-medium text-sm leading-relaxed">• {item}</p>
                                                ))}
                                            </div>
                                        )}
                                        {ins.metric && (
                                            <div className="mt-4">
                                                <p className={`text-3xl font-black tabular-nums ${ac}`}>{ins.metric}</p>
                                                {ins.metric_label && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">{ins.metric_label}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </Reveal>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100 text-center">
                <p className="text-[10px] font-bold tracking-[0.3em] text-gray-300 uppercase">© {data.year} Prima Dashboard · All Rights Reserved</p>
            </footer>
        </div>
    );
}

/* ==================== COMPONENTS ==================== */

/* Animated count-up number */
function CountUp({ end, duration = 1500 }) {
    const [display, setDisplay] = useState('0');
    const ref = useRef(null);
    const hasRun = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !hasRun.current) {
                hasRun.current = true;
                obs.unobserve(el);
                const start = performance.now();
                const tick = (now) => {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                    const current = Math.round(ease * end);
                    setDisplay(current.toLocaleString('th-TH'));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{display}</span>;
}

function Reveal({ children }) {
    const ref = useRef(null);
    const [vis, setVis] = useState(false);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el); } }, { threshold: 0.08 });
        obs.observe(el); return () => obs.disconnect();
    }, []);
    return <div ref={ref} className={`apple-reveal ${vis ? 'revealed' : ''}`}>{children}</div>;
}

/* ==================== THAILAND MAP (d3-geo) ==================== */
function ThailandMap({ regions, fmt }) {
    const [geoData, setGeoData] = useState(null);
    const svgRef = useRef(null);

    useEffect(() => {
        fetch('/assets/thailand-provinces.geojson')
            .then(r => r.json())
            .then(d => setGeoData(d))
            .catch(() => {});
    }, []);

    if (!geoData) return <div className="flex items-center justify-center h-full text-gray-300 text-xs">กำลังโหลดแผนที่...</div>;

    const width = 480;
    const height = 600;

    const projection = d3Geo.geoIdentity()
        .reflectY(true)
        .fitExtent([[15, 15], [width - 15, height - 15]], geoData);
    const pathGen = d3Geo.geoPath(projection);

    const regionSalesMap = {};
    regions.forEach((r, i) => { regionSalesMap[r.region] = { ...r, rank: i + 1 }; });

    const regionColors = {
        'ภาคเหนือ': '#86EFAC',
        'ภาคตะวันออกเฉียงเหนือ': '#93C5FD',
        'ภาคกลาง': '#FDE68A',
        'ภาคตะวันตก': '#FDBA74',
        'ภาคตะวันออก': '#5EEAD4',
        'ภาคใต้': '#FDA4AF',
    };

    const provinceToRegion = {};
    const northProvinces = ['เชียงใหม่','เชียงราย','ลำพูน','ลำปาง','แพร่','น่าน','พะเยา','แม่ฮ่องสอน','อุตรดิตถ์'];
    const neProvinces = ['นครราชสีมา','อุบลราชธานี','ขอนแก่น','อุดรธานี','ชัยภูมิ','บุรีรัมย์','สุรินทร์','ศรีสะเกษ','กาฬสินธุ์','ร้อยเอ็ด','มหาสารคาม','สกลนคร','นครพนม','หนองคาย','มุกดาหาร','เลย','ยโสธร','หนองบัวลำภู','อำนาจเจริญ','บึงกาฬ'];
    const centralProvinces = ['กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร','นครปฐม','พระนครศรีอยุธยา','อ่างทอง','ลพบุรี','สระบุรี','สิงห์บุรี','ชัยนาท','นครสวรรค์','พิจิตร','พิษณุโลก','สุโขทัย','กำแพงเพชร','เพชรบูรณ์','อุทัยธานี','นครนายก','ปราจีนบุรี','สระแก้ว','สมุทรสงคราม'];
    const eastProvinces = ['ชลบุรี','ระยอง','จันทบุรี','ตราด'];
    const westProvinces = ['กาญจนบุรี','ตาก','ราชบุรี','เพชรบุรี','ประจวบคีรีขันธ์','สุพรรณบุรี'];
    const southProvinces = ['นครศรีธรรมราช','สุราษฎร์ธานี','ภูเก็ต','สงขลา','ชุมพร','ระนอง','พังงา','กระบี่','ตรัง','พัทลุง','สตูล','ยะลา','ปัตตานี','นราธิวาส'];

    northProvinces.forEach(p => provinceToRegion[p] = 'ภาคเหนือ');
    neProvinces.forEach(p => provinceToRegion[p] = 'ภาคตะวันออกเฉียงเหนือ');
    centralProvinces.forEach(p => provinceToRegion[p] = 'ภาคกลาง');
    eastProvinces.forEach(p => provinceToRegion[p] = 'ภาคตะวันออก');
    westProvinces.forEach(p => provinceToRegion[p] = 'ภาคตะวันตก');
    southProvinces.forEach(p => provinceToRegion[p] = 'ภาคใต้');

    const featuresByRegion = {};
    const regionCentroids = {};

    geoData.features.forEach(f => {
        const name = f.properties.ADM1_TH;
        const region = provinceToRegion[name];
        if (!region) return;
        if (!featuresByRegion[region]) featuresByRegion[region] = [];
        featuresByRegion[region].push(f);
    });

    Object.keys(featuresByRegion).forEach(region => {
        let cx = 0, cy = 0, n = 0;
        featuresByRegion[region].forEach(f => {
            const c = pathGen.centroid(f);
            if (c && isFinite(c[0]) && isFinite(c[1])) { cx += c[0]; cy += c[1]; n++; }
        });
        if (n > 0) regionCentroids[region] = { x: cx / n, y: cy / n };
    });

    const labelPositions = {
        'ภาคเหนือ':                { side: 'left',  yOff: -40 },
        'ภาคตะวันออกเฉียงเหนือ':  { side: 'right', yOff: -20 },
        'ภาคกลาง':                { side: 'left',  yOff: 0 },
        'ภาคตะวันตก':             { side: 'left',  yOff: 40 },
        'ภาคตะวันออก':            { side: 'right', yOff: 20 },
        'ภาคใต้':                 { side: 'left',  yOff: 0 },
    };

    const totalSales = regions.reduce((s, r) => s + r.sales, 0) || 1;

    return (
        <svg ref={svgRef} viewBox={`-150 0 ${width + 300} ${height}`} className="w-full h-full" style={{ maxWidth: '750px' }}>
            {geoData.features.map((f, i) => {
                const name = f.properties.ADM1_TH;
                const region = provinceToRegion[name];
                const fill = regionColors[region] || '#e5e7eb';
                return (
                    <path key={i} d={pathGen(f)} fill={fill} stroke="#fff" strokeWidth="0.5" opacity="0.9" />
                );
            })}
            {regions.map((r, i) => {
                const centroid = regionCentroids[r.region];
                if (!centroid) return null;
                const lp = labelPositions[r.region] || { side: 'right', yOff: 0 };
                const pct = (r.sales / totalSales * 100).toFixed(1);
                const labelX = lp.side === 'left' ? -110 : width + 10;
                const labelY = centroid.y + lp.yOff;
                const lineEndX = lp.side === 'left' ? -10 : width - 20;
                return (
                    <g key={i} className="region-anno" style={{ animationDelay: `${i * 150}ms` }}>
                        <circle cx={centroid.x} cy={centroid.y} r="5" fill={regionColors[r.region] || '#111827'} />
                        <circle cx={centroid.x} cy={centroid.y} r="10" fill="none" stroke={regionColors[r.region] || '#111827'} strokeWidth="0.8" opacity="0.3" />
                        <path d={`M${centroid.x},${centroid.y} L${lineEndX},${centroid.y} L${lineEndX},${labelY} L${labelX + (lp.side === 'left' ? 100 : 0)},${labelY}`}
                              fill="none" stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="3,2" />
                        <g transform={`translate(${labelX}, ${labelY})`}>
                            <text y="-4" textAnchor="start" style={{ fontSize: '14px', fontWeight: 800, fill: '#111827' }}>{r.region}</text>
                            <text y="16" textAnchor="start" style={{ fontSize: '14px', fontWeight: 700, fill: '#374151' }}>฿{fmt(r.sales)}</text>
                            <text y="32" textAnchor="start" style={{ fontSize: '11px', fill: '#9ca3af' }}>{pct}% · {r.orders} ออเดอร์</text>
                        </g>
                    </g>
                );
            })}
        </svg>
    );
}

/* ==================== STYLES ==================== */
const appleStyles = `
    .apple-exec { background: #f8f9fb; -webkit-font-smoothing: antialiased; }

    .apple-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.9s cubic-bezier(0.25, 1, 0.5, 1), transform 0.9s cubic-bezier(0.25, 1, 0.5, 1); }
    .apple-reveal.revealed { opacity: 1; transform: translateY(0); }

    .trend-bar { transform-origin: bottom; transform: scaleY(0); transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1); }
    .revealed .trend-bar { transform: scaleY(1); }

    .revealed .seller-row, .revealed .page-row, .revealed .dept-item, .revealed .prod-row, .revealed .region-row, .revealed .prov-row, .revealed .insight-card {
        animation: apUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; transform: translateY(24px);
    }
    @keyframes apUp { to { opacity: 1; transform: translateY(0); } }

    .seller-bar, .cat-bar, .ch-bar, .page-bar, .prod-bar, .region-bar, .prov-bar { width: 0; transition: width 1s cubic-bezier(0.25, 1, 0.5, 1) 0.3s; }
    .revealed .seller-bar, .revealed .cat-bar, .revealed .ch-bar, .revealed .page-bar, .revealed .prod-bar, .revealed .region-bar, .revealed .prov-bar { width: var(--target-width, 0%); }

    .revealed .cat-item, .revealed .ch-item { animation: apUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; transform: translateY(16px); }

    .donut-ring { stroke-dasharray: 0 327 !important; transition: stroke-dasharray 1.8s cubic-bezier(0.25, 1, 0.5, 1) 0.2s; }
    .revealed .donut-ring { stroke-dasharray: inherit !important; }

    .revealed .big-stat { animation: apUp 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; transform: translateY(24px); }

    .revealed .region-anno { animation: apUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; transform: translateY(8px); }
`;

export default ExecutiveInsightPage;

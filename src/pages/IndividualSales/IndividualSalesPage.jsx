import { useState, useEffect, useRef } from 'react';
import { CustomSelect } from '../../components/UI';

function IndividualSalesPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [view, setView] = useState('daily'); // 'daily' | 'monthly'
    const [selectedUserId, setSelectedUserId] = useState(0); // 0 = all
    const [userList, setUserList] = useState([]);
    const dataCache = useRef({});

    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const s = sessionStorage.getItem('individual_month');
        return s ? parseInt(s) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const s = sessionStorage.getItem('individual_year');
        return s ? parseInt(s) : currentDate.getFullYear();
    });

    useEffect(() => {
        sessionStorage.setItem('individual_month', month.toString());
        sessionStorage.setItem('individual_year', year.toString());
    }, [month, year]);

    const monthNames = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthsFull = [
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];
    const years = [];
    for (let y = currentDate.getFullYear(); y >= 2024; y--) years.push(y);

    const fetchData = async () => {
        const cacheKey = `${view}-${month}-${year}-${selectedUserId}`;
        const cached = dataCache.current[cacheKey];
        if (cached) {
            setData(cached); setLoading(false); setError(null);
            try {
                const r = await fetch(`./api/reports/individual_sales.php?company_id=${user?.company_id || 1}&month=${month}&year=${year}&view=${view}&selected_user_id=${selectedUserId}`);
                if (r.ok) { const j = await r.json(); if (j.success) { dataCache.current[cacheKey] = j.data; setData(j.data); if (j.data.users) setUserList(j.data.users); } }
            } catch (_) {}
            return;
        }
        setLoading(true); setError(null);
        try {
            const r = await fetch(`./api/reports/individual_sales.php?company_id=${user?.company_id || 1}&month=${month}&year=${year}&view=${view}&selected_user_id=${selectedUserId}`);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const j = await r.json();
            if (j.success) { dataCache.current[cacheKey] = j.data; setData(j.data); if (j.data.users) setUserList(j.data.users); }
            else throw new Error(j.message);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [month, year, view, selectedUserId]);

    const fmt = (v) => new Intl.NumberFormat('th-TH').format(v || 0);
    const fmtSales = (v) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(v || 0);

    const roleColors = {
        'Telesale': 'bg-green-100 text-green-700 border-green-200',
        'Supervisor Telesale': 'bg-blue-100 text-blue-700 border-blue-200',
        'Admin Page': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    const roleIcons = {
        'Telesale': 'headset_mic', 'Supervisor Telesale': 'supervisor_account', 'Admin Page': 'computer',
    };

    const selectedUser = userList.find(u => u.user_id === selectedUserId);

    const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="text-center space-y-4">
                    <span className="material-symbols-outlined text-5xl text-red-400">error</span>
                    <p className="text-red-500">{error}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-primary text-white rounded-lg">ลองอีกครั้ง</button>
                </div>
            </div>
        );
    }

    const maxSales = Math.max(...(data?.timeseries?.map(t => parseFloat(t.total_sales)) || [0]), 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">person_search</span>
                        ยอดขายรายบุคคล
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">ดูข้อมูลยอดขายรายบุคคล แยกตาม Platform / ช่องทาง / สินค้า</p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="glass-card p-4 rounded-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Employee Dropdown */}
                    <div className="flex-1 min-w-0">
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">พนักงาน</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white cursor-pointer"
                        >
                            <option value={0}>👥 ทุกคน (รวม)</option>
                            {userList.map(u => (
                                <option key={u.user_id} value={u.user_id}>
                                    {u.first_name} — {u.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">มุมมอง</label>
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setView('daily')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${view === 'daily' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                📅 รายวัน
                            </button>
                            <button
                                onClick={() => setView('monthly')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${view === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                📊 รายเดือน
                            </button>
                        </div>
                    </div>

                    {/* Month/Year Filter */}
                    <div className="flex items-end gap-2">
                        {view === 'daily' && (
                            <div>
                                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">เดือน</label>
                                <CustomSelect
                                    options={monthsFull.map(m => ({ value: m.value, label: m.label }))}
                                    value={month}
                                    onChange={(val) => setMonth(parseInt(val))}
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">ปี</label>
                            <CustomSelect
                                options={years.map(y => ({ value: y, label: y.toString() }))}
                                value={year}
                                onChange={(val) => setYear(parseInt(val))}
                            />
                        </div>
                    </div>
                </div>

                {/* Selected User Info */}
                {selectedUser && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">{roleIcons[selectedUser.role] || 'person'}</span>
                        </div>
                        <div>
                            <span className="font-bold text-lg">{selectedUser.first_name}</span>
                            <span className={`ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full border ${roleColors[selectedUser.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {selectedUser.role}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <span className="material-symbols-outlined text-sm">receipt_long</span> Orders
                    </div>
                    <p className="text-2xl font-bold font-kanit">{fmt(data?.summary?.total_orders)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <span className="material-symbols-outlined text-sm">people</span> ลูกค้า
                    </div>
                    <p className="text-2xl font-bold font-kanit">{fmt(data?.summary?.total_customers)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <span className="material-symbols-outlined text-sm">inventory_2</span> จำนวนสินค้า
                    </div>
                    <p className="text-2xl font-bold font-kanit">{fmt(data?.summary?.total_quantity)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <span className="material-symbols-outlined text-sm">paid</span> ยอดขายรวม
                    </div>
                    <p className="text-2xl font-bold font-kanit text-primary">฿{fmtSales(data?.summary?.total_sales)}</p>
                </div>
            </div>

            {/* Timeseries Data Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">{view === 'daily' ? 'calendar_month' : 'bar_chart'}</span>
                        {view === 'daily' ? `ยอดขายรายวัน — ${monthsFull.find(m => m.value === month)?.label || ''} ${year}` : `ยอดขายรายเดือน — ปี ${year}`}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase tracking-wider bg-gray-50/50">
                                <th className="px-6 py-3 font-semibold w-12">#</th>
                                <th className="px-6 py-3 font-semibold">{view === 'daily' ? 'วันที่' : 'เดือน'}</th>
                                {view === 'daily' && <th className="px-6 py-3 font-semibold">วัน</th>}
                                <th className="px-6 py-3 font-semibold text-center">Orders</th>
                                <th className="px-6 py-3 font-semibold text-center">ลูกค้า</th>
                                <th className="px-6 py-3 font-semibold text-right">ยอดขาย</th>
                                <th className="px-6 py-3 font-semibold text-right w-48">กราฟ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data?.timeseries?.length > 0 ? data.timeseries.map((row, idx) => {
                                const salesVal = parseFloat(row.total_sales);
                                const barWidth = maxSales > 0 ? (salesVal / maxSales) * 100 : 0;
                                const dateObj = view === 'daily' ? new Date(row.period_label) : null;
                                const dayName = dateObj ? dayLabels[dateObj.getDay()] : '';
                                const isWeekend = dateObj ? (dateObj.getDay() === 0 || dateObj.getDay() === 6) : false;
                                return (
                                    <tr key={idx} className={`hover:bg-primary/5 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''} ${salesVal === 0 ? 'opacity-40' : ''}`}>
                                        <td className="px-6 py-2.5 text-gray-300">{row.period}</td>
                                        <td className="px-6 py-2.5 font-medium">
                                            {view === 'daily'
                                                ? `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`
                                                : monthNames[row.period] || row.period_label}
                                        </td>
                                        {view === 'daily' && (
                                            <td className={`px-6 py-2.5 text-xs font-medium ${isWeekend ? 'text-orange-500' : 'text-gray-400'}`}>({dayName})</td>
                                        )}
                                        <td className="px-6 py-2.5 text-center">{fmt(row.order_count)}</td>
                                        <td className="px-6 py-2.5 text-center">{fmt(row.customer_count)}</td>
                                        <td className="px-6 py-2.5 text-right font-kanit font-bold">฿{fmtSales(row.total_sales)}</td>
                                        <td className="px-6 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${barWidth}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={view === 'daily' ? 7 : 6} className="px-6 py-8 text-center text-gray-400">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>
                            )}
                        </tbody>
                        {data?.timeseries?.length > 0 && (
                            <tfoot>
                                <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                                    <td className="px-6 py-3"></td>
                                    <td className="px-6 py-3">รวม</td>
                                    {view === 'daily' && <td></td>}
                                    <td className="px-6 py-3 text-center">{fmt(data.timeseries.reduce((s, r) => s + parseInt(r.order_count || 0), 0))}</td>
                                    <td className="px-6 py-3 text-center">{fmt(data.timeseries.reduce((s, r) => s + parseInt(r.customer_count || 0), 0))}</td>
                                    <td className="px-6 py-3 text-right font-kanit text-primary">฿{fmtSales(data.timeseries.reduce((s, r) => s + parseFloat(r.total_sales || 0), 0))}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Product × Time Pivot Table */}
            {data?.product_timeseries?.length > 0 && (() => {
                // Build unique products list (sorted by total sales)
                const productMap = {};
                data.product_timeseries.forEach(r => {
                    if (!productMap[r.product_id]) productMap[r.product_id] = { id: r.product_id, name: r.product_name, totalSales: 0 };
                    productMap[r.product_id].totalSales += r.sales;
                });
                const products = Object.values(productMap).sort((a, b) => b.totalSales - a.totalSales);

                // Build pivot data
                const pivotData = {};
                data.product_timeseries.forEach(r => {
                    if (!pivotData[r.period]) pivotData[r.period] = {};
                    pivotData[r.period][r.product_id] = r.sales;
                });

                const periods = data.timeseries?.map(t => t.period) || Object.keys(pivotData).map(Number).sort((a, b) => a - b);

                // Find max single-cell value for heatmap
                const allValues = data.product_timeseries.map(r => r.sales).filter(v => v > 0);
                const maxCellVal = Math.max(...allValues, 1);

                // Heatmap: green intensity 0-100% based on value
                const getCellBg = (val) => {
                    if (val <= 0) return '';
                    const intensity = Math.min(val / maxCellVal, 1);
                    const alpha = (0.08 + intensity * 0.25).toFixed(2);
                    return `rgba(34, 160, 93, ${alpha})`;
                };

                return (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">grid_on</span>
                                ยอดขายแยกสินค้า{view === 'daily' ? 'รายวัน' : 'รายเดือน'}
                                <span className="text-sm font-normal text-gray-400 ml-2">({products.length} สินค้า)</span>
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded" style={{ background: 'rgba(34,160,93,0.08)' }}></div>
                                    <span>น้อย</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded" style={{ background: 'rgba(34,160,93,0.20)' }}></div>
                                    <span>ปานกลาง</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded" style={{ background: 'rgba(34,160,93,0.33)' }}></div>
                                    <span>สูง</span>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
                            <table className="text-[11px] border-collapse" style={{ tableLayout: 'fixed', minWidth: `${products.length * 100 + 180}px` }}>
                                <thead className="sticky top-0 z-20">
                                    <tr>
                                        {/* Sticky corner cell */}
                                        <th className="sticky left-0 z-30 bg-white px-3 py-2 text-left font-bold text-gray-500 border-b-2 border-r border-gray-200" style={{ width: view === 'daily' ? '130px' : '70px', minWidth: view === 'daily' ? '130px' : '70px' }}>
                                            {view === 'daily' ? 'วัน' : 'เดือน'}
                                        </th>
                                        {products.map((p, i) => (
                                            <th key={p.id}
                                                className="bg-white border-b-2 border-gray-200 px-2 py-3 font-semibold text-gray-500 text-center"
                                                style={{ width: '95px', minWidth: '95px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.3', fontSize: '10px', verticalAlign: 'middle' }}
                                            >
                                                {p.name || 'ไม่ระบุ'}
                                            </th>
                                        ))}
                                        {/* Sticky total column header */}
                                        <th className="sticky right-0 z-30 bg-green-50 border-b-2 border-l-2 border-gray-200 px-3 py-2 text-right font-bold text-primary" style={{ width: '100px', minWidth: '100px', verticalAlign: 'bottom' }}>
                                            รวม
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map((period, idx) => {
                                        const rowData = pivotData[period] || {};
                                        const rowTotal = products.reduce((s, p) => s + (rowData[p.id] || 0), 0);
                                        const dateObj = view === 'daily' ? new Date(year, month - 1, period) : null;
                                        const isWeekend = dateObj ? (dateObj.getDay() === 0 || dateObj.getDay() === 6) : false;
                                        const dayLabelsShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
                                        const dayName = dateObj ? dayLabelsShort[dateObj.getDay()] : '';
                                        return (
                                            <tr key={period} className={`transition-colors hover:bg-primary/5 ${rowTotal === 0 ? 'opacity-25' : ''}`}>
                                                {/* Sticky day/month column */}
                                                <td className={`sticky left-0 z-10 px-3 py-1.5 font-bold border-r border-gray-200 ${isWeekend ? 'bg-orange-50 text-orange-600' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ minWidth: view === 'daily' ? '130px' : '70px', width: view === 'daily' ? '130px' : '70px' }}>
                                                    <div className="flex items-center gap-1">
                                                        <span>{view === 'daily' ? `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}` : monthNames[period]}</span>
                                                        {view === 'daily' && <span className="text-[9px] font-normal text-gray-400">({dayName})</span>}
                                                    </div>
                                                </td>
                                                {products.map((p, ci) => {
                                                    const val = rowData[p.id] || 0;
                                                    return (
                                                        <td key={p.id}
                                                            className={`px-1.5 py-1.5 text-right font-kanit border-r border-gray-100 ${isWeekend && val === 0 ? 'bg-orange-50/30' : idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                                                            style={{ background: val > 0 ? getCellBg(val) : undefined }}
                                                        >
                                                            {val > 0
                                                                ? <span className="font-medium text-gray-800">{fmtSales(val)}</span>
                                                                : <span className="text-gray-200">-</span>
                                                            }
                                                        </td>
                                                    );
                                                })}
                                                {/* Sticky total column */}
                                                <td className={`sticky right-0 z-10 px-3 py-1.5 text-right font-kanit font-bold border-l-2 border-gray-200 ${isWeekend ? 'bg-orange-50' : idx % 2 === 0 ? 'bg-green-50/60' : 'bg-green-50/80'}`}>
                                                    {rowTotal > 0 ? <span className="text-primary">฿{fmtSales(rowTotal)}</span> : <span className="text-gray-300">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="sticky bottom-0 z-20">
                                    <tr>
                                        <td className="sticky left-0 z-30 bg-green-50 px-3 py-2.5 font-bold text-gray-700 border-t-2 border-r border-primary/30">รวม</td>
                                        {products.map(p => (
                                            <td key={p.id} className="bg-green-50 px-1.5 py-2.5 text-right font-kanit font-bold text-primary border-t-2 border-primary/30">
                                                {fmtSales(p.totalSales)}
                                            </td>
                                        ))}
                                        <td className="sticky right-0 z-30 bg-green-100 px-3 py-2.5 text-right font-kanit font-bold text-primary border-t-2 border-l-2 border-primary/30 text-sm">
                                            ฿{fmtSales(products.reduce((s, p) => s + p.totalSales, 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* Breakdown Grid: Platform / Channel / Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Platform */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">devices</span>
                        ยอดขายแยกแพลตฟอร์ม
                    </h3>
                    {data?.by_platform?.length > 0 ? (
                        <div className="space-y-3">
                            {data.by_platform.map((p, i) => {
                                const total = data.by_platform.reduce((s, x) => s + parseFloat(x.total_sales), 0) || 1;
                                const pct = ((parseFloat(p.total_sales) / total) * 100).toFixed(0);
                                const colors = { 'Facebook': 'bg-blue-500', 'LINE': 'bg-green-500', 'TikTok': 'bg-gray-800' };
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">{p.platform}</span>
                                            <span className="font-kanit font-bold">฿{fmtSales(p.total_sales)} <span className="text-gray-400">({pct}%)</span></span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${colors[p.platform] || 'bg-primary/60'} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                        <p className="text-right text-[10px] text-gray-400 mt-0.5">{fmt(p.order_count)} orders</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
                </div>

                {/* Channel */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">share</span>
                        ยอดขายแยกช่องทาง
                    </h3>
                    {data?.by_channel?.length > 0 ? (
                        <div className="space-y-3">
                            {data.by_channel.map((c, i) => {
                                const total = data.by_channel.reduce((s, x) => s + parseFloat(x.total_sales), 0) || 1;
                                const pct = ((parseFloat(c.total_sales) / total) * 100).toFixed(0);
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">{c.channel}</span>
                                            <span className="font-kanit font-bold">฿{fmtSales(c.total_sales)} <span className="text-gray-400">({pct}%)</span></span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                        </div>
                                        <p className="text-right text-[10px] text-gray-400 mt-0.5">{fmt(c.order_count)} orders</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
                </div>

                {/* Products */}
                <div className="glass-card p-5 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">inventory_2</span>
                        ยอดขายแยกสินค้า
                        <span className="text-[10px] text-gray-400 font-normal ml-auto">{data?.by_product?.length || 0} รายการ</span>
                    </h3>
                    {data?.by_product?.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {data.by_product.map((p, i) => {
                                const total = data.by_product.reduce((s, x) => s + x.sales, 0) || 1;
                                const pct = ((p.sales / total) * 100).toFixed(1);
                                return (
                                    <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 text-xs">
                                        <span className="text-gray-300 w-5 text-right shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-700 truncate">{p.product_name || 'ไม่ระบุ'}</p>
                                            <p className="text-[10px] text-gray-400">{p.product_category || '-'} • {fmt(p.quantity)} ชิ้น</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-kanit font-bold">฿{fmtSales(p.sales)}</p>
                                            <p className="text-[10px] text-gray-400">{pct}%</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
                </div>
            </div>
        </div>
    );
}

export default IndividualSalesPage;

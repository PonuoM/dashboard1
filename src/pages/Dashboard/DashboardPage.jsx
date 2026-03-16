import { useState, useEffect, useRef } from 'react';
import { CustomSelect } from '../../components/UI';

function DashboardPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // Modal state for category details
    const [showCategoryDetail, setShowCategoryDetail] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Client-side cache for instant month switching
    const dataCache = useRef({});

    // Filters - Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('dashboard_month');
        return saved ? parseInt(saved) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('dashboard_year');
        return saved ? parseInt(saved) : currentDate.getFullYear();
    });

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('dashboard_month', month.toString());
        sessionStorage.setItem('dashboard_year', year.toString());
    }, [month, year]);

    const months = [
        { value: 0, label: 'ทั้งปี' },
        { value: 1, label: 'ม.ค.' }, { value: 2, label: 'ก.พ.' }, { value: 3, label: 'มี.ค.' },
        { value: 4, label: 'เม.ย.' }, { value: 5, label: 'พ.ค.' }, { value: 6, label: 'มิ.ย.' },
        { value: 7, label: 'ก.ค.' }, { value: 8, label: 'ส.ค.' }, { value: 9, label: 'ก.ย.' },
        { value: 10, label: 'ต.ค.' }, { value: 11, label: 'พ.ย.' }, { value: 12, label: 'ธ.ค.' },
    ];

    const monthsFull = [
        { value: 0, label: 'ทั้งปี' },
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const monthsShort = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const years = [];
    for (let y = currentDate.getFullYear(); y >= 2024; y--) {
        years.push(y);
    }

    const fetchData = async () => {
        const cacheKey = `${month}-${year}`;
        const cached = dataCache.current[cacheKey];

        // If cached, show instantly (no loading) and refresh in background
        if (cached) {
            setData(cached);
            setLoading(false);
            setError(null);
            // Background refresh
            try {
                const companyId = user?.company_id || 1;
                const url = `./api/reports/dashboard.php?company_id=${companyId}&month=${month}&year=${year}`;
                const response = await fetch(url);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        dataCache.current[cacheKey] = result.data;
                        setData(result.data);
                    }
                }
            } catch (_) { /* silent background refresh */ }
            return;
        }

        // First load — show loading spinner
        setLoading(true);
        setError(null);
        try {
            const companyId = user?.company_id || 1;
            const url = `./api/reports/dashboard.php?company_id=${companyId}&month=${month}&year=${year}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
            const result = await response.json();
            if (result.success) {
                dataCache.current[cacheKey] = result.data;
                setData(result.data);
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);



    const formatCurrency = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    // Calculate growth percentage
    const calcGrowth = (current, previous) => {
        const curr = parseFloat(current) || 0;
        const prev = parseFloat(previous) || 0;
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev * 100).toFixed(1);
    };

    const totalDeptSales = data?.by_department?.reduce((sum, d) => sum + parseFloat(d.total_sales || 0), 0) || 1;
    const totalChannelSales = data?.by_channel?.reduce((sum, c) => sum + parseFloat(c.total_sales || 0), 0) || 1;
    const totalCategorySales = data?.by_category?.reduce((sum, c) => sum + parseFloat(c.total_sales || 0), 0) || 1;

    // Get department data
    const getDeptData = (deptName) => {
        const dept = data?.by_department?.find(d => d.department === deptName);
        return {
            sales: parseFloat(dept?.total_sales || 0),
            percent: dept ? ((parseFloat(dept.total_sales) / totalDeptSales) * 100).toFixed(1) : 0
        };
    };

    // Get max monthly sales for bar chart scaling
    const maxMonthlySales = data?.monthly_sales?.reduce((max, m) => Math.max(max, m.total_sales), 0) || 1;

    // Growth values
    const salesGrowth = data?.prev_summary ? calcGrowth(data.summary?.total_sales, data.prev_summary?.total_sales) : null;
    const ordersGrowth = data?.prev_summary ? calcGrowth(data.summary?.total_orders, data.prev_summary?.total_orders) : null;
    const customersGrowth = data?.prev_summary ? calcGrowth(data.summary?.total_customers, data.prev_summary?.total_customers) : null;

    // Growth badge component
    const GrowthBadge = ({ value }) => {
        if (value === null) return null;
        const numVal = parseFloat(value);
        const isPositive = numVal >= 0;
        return (
            <span className={`text-sm font-bold flex items-center ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{value}%
                <span className="material-symbols-outlined text-xs">{isPositive ? 'trending_up' : 'trending_down'}</span>
            </span>
        );
    };

    // Countdown to 2027
    const getCountdown = () => {
        const target = new Date('2027-01-01T00:00:00');
        const now = new Date();
        const diff = target - now;
        if (diff <= 0) return null;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    };
    const countdown = year === 2026 ? getCountdown() : null;

    // Circular Progress Component
    const CircularProgress = ({ percent, label, sublabel, amount }) => {
        const progressDeg = (parseFloat(percent) / 100) * 360;
        return (
            <div className="flex flex-col items-center gap-2">
                <div
                    className="w-28 h-28 rounded-full relative flex items-center justify-center"
                    style={{
                        background: `radial-gradient(closest-side, white 79%, transparent 80% 100%), conic-gradient(#22c55e ${progressDeg}deg, #e5e7eb 0)`
                    }}
                >
                    <span className="text-lg font-bold font-kanit">{percent}%</span>
                </div>
                <div className="text-center">
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs text-gray-500">฿{formatCurrency(amount)}</p>
                    <p className="text-[10px] text-gray-400">{sublabel}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard-page space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-kanit font-bold text-gray-800">ภาพรวมยอดขายบริษัท</h2>
                    <p className="text-gray-500 font-medium">
                        {month === 0 ? `ปี ${year}` : `${monthsFull.find(m => m.value === month)?.label} ${year}`} • Performance Overview
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Countdown to 2027 */}
                    {countdown && (
                        <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 mr-4">
                            <span className="material-symbols-outlined text-primary text-xl">timer</span>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Countdown to 2027</p>
                                <p className="font-kanit font-bold text-primary">
                                    {countdown.days}d {countdown.hours}h {countdown.minutes}m
                                </p>
                            </div>
                        </div>
                    )}
                    <CustomSelect
                        options={months}
                        value={month}
                        onChange={setMonth}
                        placeholder="เดือน"
                    />
                    <CustomSelect
                        options={years.map(y => ({ value: y, label: y.toString() }))}
                        value={year}
                        onChange={setYear}
                        placeholder="ปี"
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            ) : error ? (
                <div className="p-10 glass-card rounded-3xl text-center border-red-200 bg-red-50/50">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">ลองใหม่</button>
                </div>
            ) : data && (
                <>
                    {/* Stats Row */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Sales */}
                        <div className="glass-card p-5 rounded-2xl flex flex-col gap-1 border-l-4 border-l-primary">
                            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Sales</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-kanit font-bold text-primary">฿{formatCurrency(data.summary?.total_sales)}</span>
                                <GrowthBadge value={salesGrowth} />
                            </div>
                            <p className="text-gray-500 text-xs">
                                {data.prev_summary?.total_sales > 0 ? `vs ฿${formatCurrency(data.prev_summary?.total_sales)}` : 'ไม่มีข้อมูลเดือนก่อน'}
                            </p>
                        </div>

                        {/* Total Orders */}
                        <div className="glass-card p-5 rounded-2xl flex flex-col gap-1">
                            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-kanit font-bold">{formatCurrency(data.summary?.total_orders)}</span>
                                <GrowthBadge value={ordersGrowth} />
                            </div>
                            <p className="text-gray-500 text-xs">
                                {data.prev_summary?.total_orders > 0 ? `vs ${formatCurrency(data.prev_summary?.total_orders)}` : 'ไม่มีข้อมูลเดือนก่อน'}
                            </p>
                        </div>

                        {/* Total Customers */}
                        <div className="glass-card p-5 rounded-2xl flex flex-col gap-1">
                            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Customers</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-kanit font-bold">{formatCurrency(data.summary?.total_customers)}</span>
                                <GrowthBadge value={customersGrowth} />
                            </div>
                            <p className="text-gray-500 text-xs">
                                {data.prev_summary?.total_customers > 0 ? `vs ${formatCurrency(data.prev_summary?.total_customers)}` : 'ไม่มีข้อมูลเดือนก่อน'}
                            </p>
                        </div>
                    </section>

                    {/* Grid: Bar Chart, Channels, Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Monthly Sales Bar Chart - 2 cols */}
                        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">bar_chart</span>
                                ยอดขายรายเดือน {year}
                            </h3>
                            <div className="flex items-end justify-between gap-1" style={{ height: '160px' }}>
                                {data.monthly_sales?.map((m, idx) => {
                                    const heightPercent = maxMonthlySales > 0 ? (m.total_sales / maxMonthlySales) * 100 : 0;
                                    const barHeight = Math.max((heightPercent / 100) * 140, m.total_sales > 0 ? 8 : 2);
                                    const isCurrentMonth = m.month === month;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer" onClick={() => setMonth(m.month)}>
                                            <div className="relative w-full flex justify-center group">
                                                {m.total_sales > 0 && (
                                                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                        ฿{formatCurrency(m.total_sales)}
                                                    </div>
                                                )}
                                                <div
                                                    className={`w-full max-w-6 rounded-t transition-all duration-500 hover:opacity-80 ${isCurrentMonth ? 'bg-primary shadow-lg shadow-primary/30 scale-110' : 'bg-primary/40 hover:bg-primary/60'}`}
                                                    style={{ height: `${barHeight}px` }}
                                                ></div>
                                            </div>
                                            <span className={`text-[10px] font-medium mt-1 ${isCurrentMonth ? 'text-primary font-bold' : 'text-gray-400'}`}>
                                                {monthsShort[m.month]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sales Channels - 1 col */}
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">share</span>
                                ช่องทางการขาย
                            </h3>
                            <div className="flex flex-col gap-3">
                                {data.by_channel?.slice(0, 5).map((ch, idx) => {
                                    const percent = ((parseFloat(ch.total_sales) / totalChannelSales) * 100);
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span>{ch.channel}</span>
                                                <span>฿{formatCurrency(ch.total_sales)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Grid: Departments, Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Sales by Department */}
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">hub</span>
                                ยอดขายแยกแผนก
                            </h3>
                            <div className="flex justify-around items-start">
                                <CircularProgress
                                    percent={getDeptData('Telesale').percent}
                                    label="Telesale"
                                    amount={getDeptData('Telesale').sales}
                                    sublabel="Direct Sales"
                                />
                                <CircularProgress
                                    percent={getDeptData('Admin Page').percent}
                                    label="Admin Page"
                                    amount={getDeptData('Admin Page').sales}
                                    sublabel="Web Orders"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-28 h-28 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center opacity-60">
                                        <span className="text-lg font-bold font-kanit">
                                            {parseFloat(getDeptData('Others').percent) < 1 ? '< 1' : getDeptData('Others').percent}%
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-sm">Others</p>
                                        <p className="text-xs text-gray-500">฿{formatCurrency(getDeptData('Others').sales)}</p>
                                        <p className="text-[10px] text-gray-400">Offline/Misc</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Categories */}
                        <div className="glass-card p-6 rounded-2xl">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">inventory_2</span>
                                ยอดขายตามประเภทสินค้า
                                <span className="text-xs text-gray-400 font-normal ml-auto">กดเพื่อดูรายละเอียด</span>
                            </h3>
                            <div className="space-y-3">
                                {data.by_category?.map((cat, idx) => {
                                    const percent = ((parseFloat(cat.total_sales) / totalCategorySales) * 100);
                                    const colors = ['bg-green-500', 'bg-blue-500', 'bg-gray-400'];
                                    const hasDetails = data.category_details?.[cat.category_name]?.length > 0;
                                    return (
                                        <div
                                            key={idx}
                                            className={`space-y-1 p-2 -mx-2 rounded-lg transition-colors ${hasDetails ? 'hover:bg-white/50 cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (hasDetails) {
                                                    setSelectedCategory(cat.category_name);
                                                    setShowCategoryDetail(true);
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{cat.category_name}</span>
                                                    {hasDetails && (
                                                        <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-kanit font-bold">฿{formatCurrency(cat.total_sales)}</span>
                                                    <span className="text-gray-400 text-xs ml-2">({percent.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${colors[idx] || 'bg-gray-400'} rounded-full transition-all duration-500`}
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Department Product Detail — Inline Tables */}
                    {data.by_department?.map((dept, deptIdx) => {
                        const percent = ((parseFloat(dept.total_sales) / totalDeptSales) * 100).toFixed(1);
                        const products = data.department_details?.[dept.department] || [];
                        const deptTotal = products.reduce((s, p) => s + p.sales, 0) || 1;
                        const deptIcons = { 'Telesale': 'headset_mic', 'Admin Page': 'computer', 'Others': 'more_horiz' };
                        const deptColors = { 'Telesale': 'from-green-500/10 to-green-500/5', 'Admin Page': 'from-blue-500/10 to-blue-500/5', 'Others': 'from-gray-500/10 to-gray-500/5' };
                        const deptAccent = { 'Telesale': 'border-l-green-500', 'Admin Page': 'border-l-blue-500', 'Others': 'border-l-gray-400' };

                        return (
                            <div key={deptIdx} className={`glass-card rounded-2xl overflow-hidden border-l-4 ${deptAccent[dept.department] || 'border-l-gray-400'}`}>
                                {/* Department Header */}
                                <div className={`px-6 py-4 bg-gradient-to-r ${deptColors[dept.department] || 'from-gray-500/10 to-gray-500/5'} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary">{deptIcons[dept.department] || 'group'}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold">{dept.department}</h3>
                                            <p className="text-xs text-gray-500">{products.length} สินค้า</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Orders</p>
                                            <p className="font-kanit font-bold">{formatCurrency(dept.order_count)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">ยอดขาย</p>
                                            <p className="font-kanit font-bold text-primary">฿{formatCurrency(dept.total_sales)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">สัดส่วน</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-14 h-2 bg-white/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                                </div>
                                                <span className="font-bold text-sm">{percent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Table */}
                                {products.length > 0 && (
                                    <div className="px-6 pb-4">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                                                    <th className="py-2.5 font-semibold w-10">#</th>
                                                    <th className="py-2.5 font-semibold">ชื่อสินค้า</th>
                                                    <th className="py-2.5 font-semibold">หมวดหมู่</th>
                                                    <th className="py-2.5 font-semibold text-center w-20">จำนวน</th>
                                                    <th className="py-2.5 font-semibold text-right w-28">ยอดขาย</th>
                                                    <th className="py-2.5 font-semibold text-right w-20">%</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {products.map((product, idx) => {
                                                    const pct = ((product.sales / deptTotal) * 100).toFixed(1);
                                                    return (
                                                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                                            <td className="py-2 text-gray-300 text-xs">{idx + 1}</td>
                                                            <td className="py-2 font-medium text-gray-700">{product.product_name || 'ไม่ระบุ'}</td>
                                                            <td className="py-2">
                                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                                                                    {product.product_category || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-center text-gray-600">{formatCurrency(product.quantity)}</td>
                                                            <td className="py-2 text-right font-kanit font-bold">฿{formatCurrency(product.sales)}</td>
                                                            <td className="py-2 text-right text-xs text-gray-400">{pct}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {/* Category Details Modal */}
            {showCategoryDetail && selectedCategory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">inventory_2</span>
                                รายละเอียดสินค้า: {selectedCategory}
                            </h3>
                            <button
                                onClick={() => setShowCategoryDetail(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Table Header */}
                        <div className="px-6 bg-white border-b border-gray-200">
                            <table className="w-full text-left table-fixed">
                                <thead>
                                    <tr className="text-gray-500 text-sm uppercase tracking-wider">
                                        <th className="py-3 font-semibold" style={{ width: '40px' }}>#</th>
                                        <th className="py-3 font-semibold" style={{ width: '40%' }}>ชื่อสินค้า</th>
                                        <th className="py-3 font-semibold" style={{ width: '25%' }}>หมวดหมู่เดิม</th>
                                        <th className="py-3 font-semibold text-center" style={{ width: '80px' }}>จำนวน</th>
                                        <th className="py-3 font-semibold text-right" style={{ width: '120px' }}>ยอดขาย</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6">
                            <table className="w-full text-left table-fixed">
                                <tbody className="divide-y divide-gray-100">
                                    {data.category_details?.[selectedCategory]?.map((product, idx) => (
                                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                            <td className="py-3 text-gray-400" style={{ width: '40px' }}>{idx + 1}</td>
                                            <td className="py-3 font-medium truncate" style={{ width: '40%' }}>{product.product_name || 'ไม่ระบุ'}</td>
                                            <td className="py-3 text-gray-500 text-sm" style={{ width: '25%' }}>
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                    {product.original_category || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center" style={{ width: '80px' }}>{product.quantity}</td>
                                            <td className="py-3 text-right font-kanit font-bold" style={{ width: '120px' }}>฿{formatCurrency(product.sales)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                                ทั้งหมด {data.category_details?.[selectedCategory]?.length || 0} รายการ
                            </span>
                            <button
                                onClick={() => setShowCategoryDetail(false)}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;

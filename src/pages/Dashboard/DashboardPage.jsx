import { useState, useEffect, useRef } from 'react';
import { CustomSelect, MultiSelect, DateRangeFilter } from '../../components/UI';
import useDateRange from '../../hooks/useDateRange';
import OtherOrdersModal from '../../components/Modals/OtherOrdersModal';

// ยอดตีกลับแยกที่ระดับกล่อง ออเดอร์ที่คืนบางกล่องจึงมีของอยู่หลายช่องพร้อมกัน
const PARTIAL_RETURN_HINT = 'ยอดแยกตามกล่อง: ออเดอร์ที่ตีกลับบางกล่องจะมียอดอยู่ทั้งช่อง ตีกลับ และ สำเร็จ/อื่นๆ ตามกล่องจริง คอลัมน์ "ยอด" บวกกันได้ แต่ "จำนวน" นับออเดอร์ที่มีของในช่องนั้นอย่างน้อย 1 กล่อง จึงบวกกันเกินจำนวนออเดอร์จริง';
const WAIVED_AMOUNT_HINT = 'ยอดสำเร็จ/อื่นๆ/รวม หักยอดยกเลิกกล่อง (waived_amount) แล้ว ค้างชำระ = ยอดออเดอร์ − amount_paid (สลิป/COD) − ยอด waive';

function DashboardPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // Role-based data scope
    // Telesale / Admin Page: เห็นเฉพาะของตัวเอง (backend บังคับอีกชั้น)
    // Supervisor Telesale: เริ่มที่ตัวเอง เลือกดูลูกทีมได้ผ่าน dropdown
    const roleLc = (user?.role || '').toLowerCase();
    const isSelfOnly = roleLc === 'telesale' || roleLc === 'admin page' || user?.role_id === 3;
    const isSupervisor = roleLc === 'supervisor telesale';
    const [viewAsId, setViewAsId] = useState(0); // 0 = ตัวเอง (สำหรับ Supervisor)
    // id ของคนที่ข้อมูลบนหน้าถูกกรองไว้ (null = เห็นทั้งบริษัท)
    const viewedId = isSupervisor ? (viewAsId || user?.id) : (isSelfOnly ? user?.id : null);

    // Modal state for category details
    const [showCategoryDetail, setShowCategoryDetail] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Modal state for channel details
    const [showChannelDetail, setShowChannelDetail] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);

    // Modal state for status drill-down
    const [statusModal, setStatusModal] = useState({ isOpen: false, productId: null, productName: '', salespersonId: null, salespersonName: '', department: '', statusType: 'other', cancelTypeId: null });

    // Table Column Expansion state
    const [expandedColumns, setExpandedColumns] = useState({
        returned: false,
        cancelled: false
    });

    const toggleColumnGroup = (group) => {
        setExpandedColumns(prev => ({
            ...prev,
            [group]: !prev[group]
        }));
    };

    const openStatusModal = (product, deptName, statusType) => {
        // ถ้าหน้าถูกกรองรายบุคคลอยู่ (viewedId) ให้ drill-down กรองคนเดิมด้วย
        setStatusModal({ isOpen: true, productId: product.product_id, productName: product.product_name, salespersonId: viewedId || null, salespersonName: '', department: deptName, statusType, cancelTypeId: null });
    };

    const openSalespersonStatusModal = (salesperson, deptName, statusType, cancelTypeId = null) => {
        setStatusModal({ isOpen: true, productId: null, productName: '', salespersonId: salesperson.user_id, salespersonName: salesperson.name, department: deptName, statusType, cancelTypeId });
    };

    // Client-side cache for instant month switching
    const dataCache = useRef({});
    const currentRequestRef = useRef('');

    // Filters - Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('dashboard_months');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        const oldSaved = sessionStorage.getItem('dashboard_month');
        if (oldSaved) {
            const val = parseInt(oldSaved);
            return val === 0 ? [] : [val];
        }
        return [currentDate.getMonth() + 1];
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('dashboard_years');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        const oldSaved = sessionStorage.getItem('dashboard_year');
        return oldSaved ? [parseInt(oldSaved)] : [currentDate.getFullYear()];
    });

    // Date range filter (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides month/year when active
    const dateRange = useDateRange('dashboard');

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('dashboard_months', JSON.stringify(month));
        sessionStorage.setItem('dashboard_years', JSON.stringify(year));
    }, [month, year]);

    const months = [
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
        const monthSorted = [...month].sort((a, b) => a - b);
        const yearSorted = [...year].sort((a, b) => a - b);
        const monthParam = monthSorted.length > 0 ? monthSorted.join(',') : '0';
        const yearParam = yearSorted.length > 0 ? yearSorted.join(',') : years.join(',');
        const cacheKey = `${monthParam}-${yearParam}-${viewedId || 0}-${dateRange.key}`;

        const companyId = user?.company_id || 1;
        // user_id = คนดู (backend ตัดสินสิทธิ์เอง), salesperson_id = คนที่ขอดูข้อมูล
        const viewerParam = user?.id ? `&user_id=${user.id}` : '';
        const salespersonParam = viewedId ? `&salesperson_id=${viewedId}` : '';
        const url = `./api/reports/dashboard.php?company_id=${companyId}&month=${monthParam}&year=${yearParam}${viewerParam}${salespersonParam}${dateRange.params}`;

        currentRequestRef.current = cacheKey;
        const cached = dataCache.current[cacheKey];

        // If cached, show instantly (no loading) and refresh in background
        if (cached) {
            setData(cached);
            setLoading(false);
            setError(null);
            // Background refresh
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        dataCache.current[cacheKey] = result.data;
                        if (currentRequestRef.current === cacheKey) {
                            setData(result.data);
                        }
                    }
                }
            } catch (_) { /* silent background refresh */ }
            return;
        }

        // First load — show loading spinner
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
            const result = await response.json();
            if (result.success) {
                dataCache.current[cacheKey] = result.data;
                if (currentRequestRef.current === cacheKey) {
                    setData(result.data);
                }
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            if (currentRequestRef.current === cacheKey) {
                setError(err.message);
            }
        } finally {
            if (currentRequestRef.current === cacheKey) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year, dateRange.key, viewAsId]);



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
    const countdown = year.includes(2026) || year.length === 0 ? getCountdown() : null;

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
                        {month.length === 0 ? `ปี ${year.length > 0 ? year.join(', ') : 'ทั้งหมด'}` : 
                         month.length === 1 ? `${monthsFull.find(m => m.value === month[0])?.label} ${year.length > 0 ? year.join(', ') : 'ทุกปี'}` :
                         `${month.length} เดือน ปี ${year.length > 0 ? year.join(', ') : 'ทั้งหมด'}`} • Performance Overview
                        {viewedId && (
                            <span className="text-primary font-semibold">
                                {' '}• ข้อมูลของ {isSupervisor
                                    ? (data?.team_members?.find(m => (viewAsId ? m.id === viewAsId : m.is_self))?.name || user?.first_name || '')
                                    : (user?.first_name || user?.username || '')}
                            </span>
                        )}
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
                    {/* Supervisor: เลือกดูข้อมูลตัวเอง/ลูกทีม */}
                    {isSupervisor && data?.team_members?.length > 0 && (
                        <CustomSelect
                            label="ดูข้อมูล"
                            options={data.team_members.map(m => ({
                                value: m.is_self ? 0 : m.id,
                                label: m.is_self ? `${m.name} (ตัวเอง)` : m.name
                            }))}
                            value={viewAsId}
                            onChange={setViewAsId}
                        />
                    )}
                    <DateRangeFilter value={dateRange} />
                    <div className={`flex items-center gap-3 ${dateRange.active ? 'opacity-50 pointer-events-none' : ''}`}>
                        <MultiSelect
                            options={months}
                            value={month}
                            onChange={setMonth}
                            placeholder="เดือน"
                            allLabel="ทุกเดือน"
                        />
                        <MultiSelect
                            options={years.map(y => ({ value: y, label: y.toString() }))}
                            value={year}
                            onChange={setYear}
                            placeholder="ปี"
                            allLabel="ทุกปี"
                        />
                    </div>
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

                    {/* Overall Order Statuses */}
                    {data.overall_status_summary && data.overall_status_summary.length > 0 && (
                        <section className="glass-card p-6 rounded-3xl">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-gray-400">donut_small</span>
                                สถานะออเดอร์
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {data.overall_status_summary.map((s, idx) => {
                                    const config = (() => {
                                        const mapping = {
                                            'Delivered': { label: 'สำเร็จ', icon: 'check_circle', bg: 'bg-green-50/50 hover:bg-green-100', text: 'text-green-600', border: 'border-green-100', bar: 'bg-green-500' },
                                            'Returned': { label: 'ตีกลับ', icon: 'undo', bg: 'bg-red-50/50 hover:bg-red-100', text: 'text-red-600', border: 'border-red-100', bar: 'bg-red-500' },
                                            'Cancelled': { label: 'ยกเลิก', icon: 'cancel', bg: 'bg-gray-50/50 hover:bg-gray-100', text: 'text-gray-500', border: 'border-gray-100', bar: 'bg-gray-400' },
                                            'Pending': { label: 'รอดำเนินการ', icon: 'hourglass_empty', bg: 'bg-yellow-50/50 hover:bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-100', bar: 'bg-yellow-500' },
                                            'Preparing': { label: 'กำลังจัดเตรียม', icon: 'inventory_2', bg: 'bg-blue-50/50 hover:bg-blue-100', text: 'text-blue-600', border: 'border-blue-100', bar: 'bg-blue-500' },
                                            'Shipping': { label: 'กำลังจัดส่ง', icon: 'local_shipping', bg: 'bg-indigo-50/50 hover:bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-100', bar: 'bg-indigo-500' },
                                            'Confirmed': { label: 'ยืนยันแล้ว', icon: 'task_alt', bg: 'bg-cyan-50/50 hover:bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-100', bar: 'bg-cyan-500' },
                                            'Packing': { label: 'กำลังแพ็ค', icon: 'inventory', bg: 'bg-purple-50/50 hover:bg-purple-100', text: 'text-purple-600', border: 'border-purple-100', bar: 'bg-purple-500' },
                                            'Processing': { label: 'กำลังดำเนินการ', icon: 'sync', bg: 'bg-cyan-50/50 hover:bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-100', bar: 'bg-cyan-500' },
                                            'BadDebt': { label: 'หนี้สูญ', icon: 'money_off', bg: 'bg-purple-50/50 hover:bg-purple-100', text: 'text-purple-600', border: 'border-purple-100', bar: 'bg-purple-500' },
                                        };
                                        return mapping[s.status] || { label: s.status, icon: 'pending_actions', bg: 'bg-amber-50/50 hover:bg-amber-100', text: 'text-amber-600', border: 'border-amber-100', bar: 'bg-amber-500' };
                                    })();
                                    
                                    const percent = data.summary?.total_orders ? ((s.order_count / data.summary.total_orders) * 100).toFixed(1) : 0;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`rounded-xl border ${config.border} ${config.bg} p-3 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group`}
                                            onClick={() => setStatusModal({ isOpen: true, productId: null, productName: '', salespersonId: viewedId || null, salespersonName: '', department: '', statusType: s.status === 'Delivered' ? 'delivered' : s.status === 'Returned' ? 'returned' : s.status === 'Cancelled' ? 'cancelled' : s.status === 'BadDebt' ? 'baddebt' : s.status, cancelTypeId: null })}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className={`p-1.5 rounded-lg bg-white/50 ${config.text}`}>
                                                    <span className="material-symbols-outlined text-sm">{config.icon}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 bg-white/60 px-1.5 rounded">{percent}%</span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-gray-700 truncate">{config.label}</h4>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className={`text-lg font-kanit font-bold ${config.text}`}>{formatCurrency(s.order_count)}</span>
                                                    <span className="text-[10px] text-gray-500">ออเดอร์</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-kanit font-medium">
                                                    ฿{formatCurrency(s.total_sales)}
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-white/50 rounded-full mt-2 overflow-hidden">
                                                <div className={`h-full ${config.bar} transition-all duration-500 ease-out`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Grid: Bar Chart, Channels, Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Monthly Sales Bar Chart - 2 cols */}
                        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
                            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">bar_chart</span>
                                ยอดขายรายเดือน {year.join(', ')}
                            </h3>
                            <div className="flex items-end justify-between gap-1" style={{ height: '160px' }}>
                                {data.monthly_sales?.map((m, idx) => {
                                    const heightPercent = maxMonthlySales > 0 ? (m.total_sales / maxMonthlySales) * 100 : 0;
                                    const barHeight = Math.max((heightPercent / 100) * 140, m.total_sales > 0 ? 8 : 2);
                                    const isCurrentMonth = month.includes(m.month) || month.length === 0;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer" onClick={() => {
                                            if (month.includes(m.month)) {
                                                setMonth(month.filter(val => val !== m.month));
                                            } else {
                                                setMonth([...month, m.month]);
                                            }
                                        }}>
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
                                <span className="text-xs text-gray-400 font-normal ml-auto">กดเพื่อดูรายละเอียด</span>
                            </h3>
                            <div className="flex flex-col gap-3">
                                {data.by_channel?.slice(0, 5).map((ch, idx) => {
                                    const percent = ((parseFloat(ch.total_sales) / totalChannelSales) * 100);
                                    const hasDetails = data.channel_details?.[ch.channel]?.length > 0;
                                    return (
                                        <div
                                            key={idx}
                                            className={`space-y-1 p-2 -mx-2 rounded-lg transition-colors ${hasDetails ? 'hover:bg-white/50 cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (hasDetails) {
                                                    setSelectedChannel(ch.channel);
                                                    setShowChannelDetail(true);
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="flex items-center gap-1">
                                                    {ch.channel}
                                                    {hasDetails && (
                                                        <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                                                    )}
                                                </span>
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

                    {/* Department Product Detail — Side-by-Side Tables */}
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

                                {/* Two Separate Cards Side-by-Side */}
                                {products.length > 0 && (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 px-4 pb-4">
                                        {/* Left Card: Sales Summary */}
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50/80 border-b border-gray-100">
                                                <span className="material-symbols-outlined text-primary text-sm">payments</span>
                                                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">ยอดขาย</h4>
                                            </div>
                                            <div className="px-3">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="text-[10px] uppercase tracking-wider">
                                                            <th rowSpan="2" className="py-1 font-semibold text-gray-400 w-7 border-b border-gray-100">#</th>
                                                            <th rowSpan="2" className="py-1 font-semibold text-gray-400 border-b border-gray-100">สินค้า</th>
                                                            <th colSpan="3" className="py-1 font-bold text-center text-primary bg-primary/5 border-b border-primary/10">💰 ยอดขาย (ไม่รวมยกเลิก)</th>
                                                        </tr>
                                                        <tr className="text-[9px] uppercase tracking-wider border-b border-gray-100">
                                                            <th className="py-1 font-semibold text-center text-gray-500 bg-primary/[0.02] w-14">จำนวน</th>
                                                            <th className="py-1 font-semibold text-right text-gray-500 bg-primary/[0.02] w-24">ยอดขาย</th>
                                                            <th className="py-1 font-semibold text-right text-gray-500 bg-primary/[0.02] w-12">%</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {products.map((product, idx) => {
                                                            const pct = ((product.sales / deptTotal) * 100).toFixed(1);
                                                            return (
                                                                <tr key={idx} className="hover:bg-primary/5 transition-colors h-8">
                                                                    <td className="text-gray-300 text-[10px]">{idx + 1}</td>
                                                                    <td className="font-medium text-gray-700 truncate max-w-[160px]" title={product.product_name}>{product.product_name || 'ไม่ระบุ'}</td>
                                                                    <td className="text-center text-gray-600">{formatCurrency(product.quantity)}</td>
                                                                    <td className="text-right font-kanit font-bold">฿{formatCurrency(product.sales)}</td>
                                                                    <td className="text-right text-[10px] text-gray-400">{pct}%</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Right Card: Status Breakdown */}
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50/80 border-b border-gray-100" title={`${PARTIAL_RETURN_HINT} ${WAIVED_AMOUNT_HINT}`}>
                                                <span className="material-symbols-outlined text-sm text-blue-500">local_shipping</span>
                                                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">สถานะจัดส่ง</h4>
                                                <div className="flex items-center gap-3 ml-3">
                                                    <span className="inline-flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500"></span>สำเร็จ</span>
                                                    <span className="inline-flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-400"></span>ตีกลับ</span>
                                                    <span className="inline-flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-amber-400"></span>อื่นๆ</span>
                                                </div>
                                            </div>
                                            <div className="px-3 overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="text-[10px] uppercase tracking-wider">
                                                            <th rowSpan="2" className="py-1 font-semibold text-gray-400 w-7 border-b border-gray-100">#</th>
                                                            <th rowSpan="2" className="py-1 font-semibold text-gray-400 border-b border-gray-100">สินค้า</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-green-700 bg-green-50/60 border-b border-green-100 border-l-2 border-l-green-400">🟢 สำเร็จ</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-600 bg-red-50/60 border-b border-red-100 border-l-2 border-l-red-300">🔴 ตีกลับ</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-amber-600 bg-amber-50/60 border-b border-amber-100 border-l-2 border-l-amber-300">🟡 อื่นๆ</th>
                                                        </tr>
                                                        <tr className="text-[9px] uppercase tracking-wider border-b border-gray-100">
                                                            <th className="py-1 font-semibold text-center text-green-600 bg-green-50/30 w-12 border-l-2 border-l-green-400">จำนวน</th>
                                                            <th className="py-1 font-semibold text-center text-green-600 bg-green-50/30 w-20">ยอด</th>
                                                            <th className="py-1 font-semibold text-center text-red-500 bg-red-50/30 w-12 border-l-2 border-l-red-300">จำนวน</th>
                                                            <th className="py-1 font-semibold text-center text-red-500 bg-red-50/30 w-20">ยอด</th>
                                                            <th className="py-1 font-semibold text-center text-amber-500 bg-amber-50/30 w-12 border-l-2 border-l-amber-300">จำนวน</th>
                                                            <th className="py-1 font-semibold text-center text-amber-500 bg-amber-50/30 w-20">ยอด</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {products.map((product, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors h-8">
                                                                <td className="text-gray-300 text-[10px]">{idx + 1}</td>
                                                                <td className="font-medium text-gray-700 truncate max-w-[140px]" title={product.product_name}>{product.product_name || 'ไม่ระบุ'}</td>
                                                                <td className={`text-center font-bold text-green-700 border-l-2 border-l-green-400 ${product.delivered_qty > 0 ? 'cursor-pointer hover:bg-green-50 hover:underline' : ''}`} onClick={(e) => { if(product.delivered_qty > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'delivered'); } }}>{product.delivered_qty > 0 ? formatCurrency(product.delivered_qty) : '-'}</td>
                                                                <td className={`text-center text-green-700 ${product.delivered_sales > 0 ? 'cursor-pointer hover:bg-green-50 hover:underline' : ''}`} onClick={(e) => { if(product.delivered_sales > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'delivered'); } }}>{product.delivered_sales > 0 ? `฿${formatCurrency(product.delivered_sales)}` : '-'}</td>
                                                                <td className={`text-center font-bold text-red-600 border-l-2 border-l-red-300 ${product.returned_qty > 0 ? 'cursor-pointer hover:bg-red-50 hover:underline' : ''}`} onClick={(e) => { if(product.returned_qty > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'returned'); } }}>{product.returned_qty > 0 ? formatCurrency(product.returned_qty) : '-'}</td>
                                                                <td className={`text-center text-red-600 ${product.returned_sales > 0 ? 'cursor-pointer hover:bg-red-50 hover:underline' : ''}`} onClick={(e) => { if(product.returned_sales > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'returned'); } }}>{product.returned_sales > 0 ? `฿${formatCurrency(product.returned_sales)}` : '-'}</td>
                                                                <td className={`text-center font-bold text-amber-600 border-l-2 border-l-amber-300 ${product.other_qty > 0 ? 'cursor-pointer hover:bg-amber-50 hover:underline' : ''}`} onClick={(e) => { if(product.other_qty > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'other'); } }}>{product.other_qty > 0 ? formatCurrency(product.other_qty) : '-'}</td>
                                                                <td className={`text-center text-amber-600 ${product.other_sales > 0 ? 'cursor-pointer hover:bg-amber-50 hover:underline' : ''}`} onClick={(e) => { if(product.other_sales > 0) { e.stopPropagation(); openStatusModal(product, dept.department, 'other'); } }}>{product.other_sales > 0 ? `฿${formatCurrency(product.other_sales)}` : '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {/* Department Salesperson Detail */}
                    {['Telesale', 'Admin Page'].map((deptName, deptIdx) => {
                        const salespeople = data.salesperson_details?.[deptName] || [];
                        if (salespeople.length === 0) return null;
                        
                        const deptIcons = { 'Telesale': 'headset_mic', 'Admin Page': 'computer' };
                        const deptColors = { 'Telesale': 'from-green-500/10 to-green-500/5', 'Admin Page': 'from-blue-500/10 to-blue-500/5' };
                        const deptAccent = { 'Telesale': 'border-l-green-500', 'Admin Page': 'border-l-blue-500' };

                        const deptTotalOrders = salespeople.reduce((s, p) => s + p.total_orders, 0);
                        const deptTotalSales = salespeople.reduce((s, p) => s + p.total_sales, 0);
                        const deptPercent = totalDeptSales > 0 ? ((parseFloat(deptTotalSales) / totalDeptSales) * 100).toFixed(1) : 0;

                        return (
                            <div key={`sp-${deptIdx}`} className={`glass-card rounded-2xl overflow-hidden border-l-4 ${deptAccent[deptName]} mb-4`}>
                                {/* Header */}
                                <div className={`px-6 py-4 bg-gradient-to-r ${deptColors[deptName]} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary">{deptIcons[deptName]}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold">ยอดขายรายบุคคล - {deptName}</h3>
                                            <p className="text-xs text-gray-500">{salespeople.length} พนักงาน</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Orders</p>
                                            <p className="font-kanit font-bold">{formatCurrency(deptTotalOrders)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">ยอดขาย</p>
                                            <p className="font-kanit font-bold text-primary">฿{formatCurrency(deptTotalSales)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">สัดส่วน</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-14 h-2 bg-white/60 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(deptPercent, 100)}%` }}></div>
                                                </div>
                                                <span className="font-bold text-sm">{deptPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-left text-xs bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <thead className="text-[12px] whitespace-nowrap sticky top-0 z-20 shadow-sm">
                                            {/* Row 1: Groups */}
                                            <tr className="text-[10px] uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                                                <th rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "3" : "2"} className="py-2 px-3 font-semibold text-gray-400 w-8 border-r border-gray-100 text-center align-middle">#</th>
                                                <th rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "3" : "2"} className="py-2 px-3 font-semibold text-gray-600 border-r border-gray-100 align-middle">พนักงาน</th>
                                                
                                                <th colSpan="2" rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1"} className="py-1 font-bold text-center text-primary bg-primary/5 border-b border-r-2 border-gray-200 align-middle" title={`${PARTIAL_RETURN_HINT} ${WAIVED_AMOUNT_HINT}`}>💰 รวม (ไม่รวมตีกลับ/ยกเลิก/หนี้สูญ)</th>
                                                <th colSpan="2" rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1"} className="py-1 font-bold text-center text-green-700 bg-green-50/60 border-b border-r-2 border-gray-200 align-middle" title={`${PARTIAL_RETURN_HINT} ${WAIVED_AMOUNT_HINT}`}>🟢 สำเร็จ</th>
                                                
                                                {/* Returned Group */}
                                                <th 
                                                    colSpan={expandedColumns.returned ? "12" : "2"} 
                                                    rowSpan={expandedColumns.returned ? "1" : ((expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1")} 
                                                    className={`py-1 font-bold text-center text-red-600 border-b cursor-pointer transition-colors align-middle ${expandedColumns.returned ? 'bg-red-100 border-l-2 border-l-red-400 border-r-2 border-r-red-400' : 'bg-red-50/60 border-l border-l-red-100 border-r-2 border-gray-200 hover:bg-red-200'}`} 
                                                    title={PARTIAL_RETURN_HINT}
                                                    onClick={() => !expandedColumns.returned && toggleColumnGroup('returned')}
                                                >
                                                    {expandedColumns.returned ? (
                                                        <div className="flex flex-col w-full px-2 pt-1 pb-1">
                                                            <div className="flex items-center w-full mb-1">
                                                                <button onClick={(e) => { e.stopPropagation(); toggleColumnGroup('returned'); }} className="flex items-center justify-center w-[16px] h-[16px] bg-white border border-gray-400 rounded-sm hover:bg-gray-100 shadow-sm cursor-pointer z-10 transition-colors">
                                                                    <span className="material-symbols-outlined text-[12px] font-bold leading-none">remove</span>
                                                                </button>
                                                                <div className="h-[2px] bg-red-400 flex-grow ml-1 rounded-sm"></div>
                                                                <div className="h-[8px] w-[2px] bg-red-400 rounded-sm"></div>
                                                            </div>
                                                            <span className="font-bold text-red-700 text-[13px] text-center tracking-normal">🔴 หมวดหมู่: รวมตีกลับ</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1 w-full group">
                                                            <button onClick={(e) => { e.stopPropagation(); toggleColumnGroup('returned'); }} className="flex items-center justify-center w-[16px] h-[16px] bg-white border border-gray-400 rounded-sm group-hover:bg-gray-100 shadow-sm transition-colors">
                                                                <span className="material-symbols-outlined text-[12px] font-bold leading-none">add</span>
                                                            </button>
                                                            🔴 ตีกลับ
                                                        </div>
                                                    )}
                                                </th>
                                                
                                                {/* Cancelled Group */}
                                                <th 
                                                    colSpan={expandedColumns.cancelled ? "8" : "2"} 
                                                    rowSpan={expandedColumns.cancelled ? "1" : ((expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1")} 
                                                    className={`py-1 font-bold text-center text-gray-500 border-b cursor-pointer transition-colors align-middle ${expandedColumns.cancelled ? 'bg-gray-200 border-l-2 border-l-gray-400 border-r-2 border-r-gray-400' : 'bg-gray-50 border-l border-gray-100 border-r-2 border-gray-200 hover:bg-gray-200'}`} 
                                                    onClick={() => !expandedColumns.cancelled && toggleColumnGroup('cancelled')}
                                                >
                                                    {expandedColumns.cancelled ? (
                                                        <div className="flex flex-col w-full px-2 pt-1 pb-1">
                                                            <div className="flex items-center w-full mb-1">
                                                                <button onClick={(e) => { e.stopPropagation(); toggleColumnGroup('cancelled'); }} className="flex items-center justify-center w-[16px] h-[16px] bg-white border border-gray-400 rounded-sm hover:bg-gray-100 shadow-sm cursor-pointer z-10 transition-colors">
                                                                    <span className="material-symbols-outlined text-[12px] font-bold leading-none">remove</span>
                                                                </button>
                                                                <div className="h-[2px] bg-gray-400 flex-grow ml-1 rounded-sm"></div>
                                                                <div className="h-[8px] w-[2px] bg-gray-400 rounded-sm"></div>
                                                            </div>
                                                            <span className="font-bold text-gray-600 text-[13px] text-center tracking-normal">⚪ หมวดหมู่: รวมยกเลิก</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1 w-full group">
                                                            <button onClick={(e) => { e.stopPropagation(); toggleColumnGroup('cancelled'); }} className="flex items-center justify-center w-[16px] h-[16px] bg-white border border-gray-400 rounded-sm group-hover:bg-gray-100 shadow-sm transition-colors">
                                                                <span className="material-symbols-outlined text-[12px] font-bold leading-none">add</span>
                                                            </button>
                                                            ⚪ ยกเลิก
                                                        </div>
                                                    )}
                                                </th>
                                                
                                                <th colSpan="2" rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1"} className="py-1 font-bold text-center text-purple-600 bg-purple-50 border-b border-r-2 border-gray-200 align-middle">🟣 หนี้สูญ</th>
                                                <th colSpan="2" rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1"} className="py-1 font-bold text-center text-orange-600 bg-orange-50 border-b border-r-2 border-gray-200 align-middle" title={WAIVED_AMOUNT_HINT}>💸 ค้างชำระ</th>
                                                <th colSpan="2" rowSpan={(expandedColumns.returned || expandedColumns.cancelled) ? "2" : "1"} className="py-1 font-bold text-center text-amber-600 bg-amber-50/60 border-b border-amber-100 align-middle" title={`${PARTIAL_RETURN_HINT} ${WAIVED_AMOUNT_HINT}`}>🟡 อื่นๆ</th>
                                            </tr>

                                            {/* Row 2: Subcategories (Only renders if any group is expanded) */}
                                            {(expandedColumns.returned || expandedColumns.cancelled) && (
                                                <tr className="text-[10px] uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                                                    {expandedColumns.returned && (
                                                        <>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-700 bg-red-100 border-b border-r border-red-200 border-l-2 border-l-red-400">รวมทั้งหมด</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-500 bg-red-50/80 border-b border-r border-red-200">สภาพดี</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-500 bg-red-50/80 border-b border-r border-red-200">ชำรุด</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-500 bg-red-50/80 border-b border-r border-red-200">กำลังตีกลับ</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-500 bg-red-50/80 border-b border-r border-red-200">สูญหาย</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-red-500 bg-red-50/80 border-b border-r-2 border-r-red-400">อื่นๆ</th>
                                                        </>
                                                    )}
                                                    
                                                    {expandedColumns.cancelled && (
                                                        <>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-gray-600 bg-gray-200 border-b border-r border-gray-300 border-l-2 border-l-gray-400">รวมทั้งหมด</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-gray-500 bg-gray-100 border-b border-r border-gray-300">ก่อนเข้าระบบ</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-gray-500 bg-gray-100 border-b border-r border-gray-300">หลังเข้าระบบ</th>
                                                            <th colSpan="2" className="py-1 font-bold text-center text-gray-500 bg-gray-100 border-b border-r-2 border-r-gray-400">ปฏิเสธรับ</th>
                                                        </>
                                                    )}
                                                </tr>
                                            )}

                                            {/* Row 3: จำนวน / ยอด */}
                                            <tr className="text-[9px] uppercase tracking-wider bg-white border-b-2 border-gray-300">
                                                <th className="py-1 px-2 font-semibold text-center text-primary bg-primary/5 border-r border-gray-100">จำนวน</th>
                                                <th className="py-1 px-2 font-semibold text-right text-primary bg-primary/5 border-r-2 border-gray-200">ยอดขาย</th>
                                                
                                                <th className="py-1 px-2 font-semibold text-center text-green-600 bg-green-50/40 border-r border-gray-100">จำนวน</th>
                                                <th className="py-1 px-2 font-semibold text-right text-green-600 bg-green-50/40 border-r-2 border-gray-200">ยอด</th>
                                                
                                                <th className={`py-1 px-2 font-semibold text-center text-red-600 bg-red-50/90 ${expandedColumns.returned ? 'border-l-2 border-l-red-400 border-r border-red-200' : 'border-l border-red-100 border-r border-red-100'}`}>จำนวน</th>
                                                <th className={`py-1 px-2 font-semibold text-right text-red-600 bg-red-50/90 ${expandedColumns.returned ? 'border-r border-red-200' : 'border-r-2 border-gray-200'}`}>ยอด</th>
                                                
                                                {expandedColumns.returned && (
                                                    <>
                                                        <th className="py-1 px-2 font-semibold text-center text-red-500 bg-red-50/60 border-r border-red-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-red-500 bg-red-50/60 border-r border-red-200">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-red-500 bg-red-50/60 border-r border-red-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-red-500 bg-red-50/60 border-r border-red-200">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-red-500 bg-red-50/60 border-r border-red-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-red-500 bg-red-50/60 border-r border-red-200">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-red-500 bg-red-50/60 border-r border-red-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-red-500 bg-red-50/60 border-r border-red-200">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-red-500 bg-red-50/60 border-r border-red-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-red-500 bg-red-50/60 border-r-2 border-r-red-400">ยอด</th>
                                                    </>
                                                )}
                                                
                                                <th className={`py-1 px-2 font-semibold text-center text-gray-600 bg-gray-100 ${expandedColumns.cancelled ? 'border-l-2 border-l-gray-400 border-r border-gray-200' : 'border-l border-gray-100 border-r border-gray-100'}`}>จำนวน</th>
                                                <th className={`py-1 px-2 font-semibold text-right text-gray-600 bg-gray-100 ${expandedColumns.cancelled ? 'border-r border-gray-300' : 'border-r-2 border-gray-200'}`}>ยอด</th>
                                                
                                                {expandedColumns.cancelled && (
                                                    <>
                                                        <th className="py-1 px-2 font-semibold text-center text-gray-500 bg-gray-50/80 border-r border-gray-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-gray-500 bg-gray-50/80 border-r border-gray-300">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-gray-500 bg-gray-50/80 border-r border-gray-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-gray-500 bg-gray-50/80 border-r border-gray-300">ยอด</th>
                                                        
                                                        <th className="py-1 px-2 font-semibold text-center text-gray-500 bg-gray-50/80 border-r border-gray-100">จำนวน</th>
                                                        <th className="py-1 px-2 font-semibold text-right text-gray-500 bg-gray-50/80 border-r-2 border-r-gray-400">ยอด</th>
                                                    </>
                                                )}
                                                
                                                <th className="py-1 px-2 font-semibold text-center text-purple-500 bg-purple-50/60 border-r border-purple-100">จำนวน</th>
                                                <th className="py-1 px-2 font-semibold text-right text-purple-500 bg-purple-50/60 border-r-2 border-gray-200">ยอด</th>

                                                <th className="py-1 px-2 font-semibold text-center text-orange-600 bg-orange-50/80 border-r border-orange-100">จำนวน</th>
                                                <th className="py-1 px-2 font-semibold text-right text-orange-600 bg-orange-50/80 border-r-2 border-gray-200">ยอด</th>

                                                <th className="py-1 px-2 font-semibold text-center text-amber-500 bg-amber-50/40 border-r border-amber-100">จำนวน</th>
                                                <th className="py-1 px-2 font-semibold text-right text-amber-500 bg-amber-50/40">ยอด</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {salespeople.map((person, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors h-10">
                                                    <td className="text-center text-gray-400 text-[10px] border-r border-gray-50">{idx + 1}</td>
                                                    <td className="font-medium text-gray-800 px-3 border-r-2 border-gray-200 whitespace-nowrap">{person.name}</td>
                                                    
                                                    {/* Total (excludes cancelled/baddebt) */}
                                                    <td className="text-center text-gray-600 px-2 font-semibold bg-primary/[0.01]">{formatCurrency(person.total_orders)}</td>
                                                    <td className="text-right font-kanit font-bold text-primary px-2 bg-primary/[0.01] border-r-2 border-gray-200">฿{formatCurrency(person.total_sales)}</td>
                                                    
                                                    {/* Delivered */}
                                                    <td className={`text-center font-bold text-green-700 px-2 bg-green-50/10 ${person.delivered_orders > 0 ? 'cursor-pointer hover:bg-green-100 hover:underline' : ''}`} onClick={(e) => { if(person.delivered_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'delivered'); } }}>{person.delivered_orders > 0 ? formatCurrency(person.delivered_orders) : '-'}</td>
                                                    <td className={`text-right text-green-700 font-kanit px-2 bg-green-50/10 border-r-2 border-gray-200 ${person.delivered_sales > 0 ? 'cursor-pointer hover:bg-green-100 hover:underline' : ''}`} onClick={(e) => { if(person.delivered_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'delivered'); } }}>{person.delivered_sales > 0 ? `฿${formatCurrency(person.delivered_sales)}` : '-'}</td>
                                                    
                                                    {/* Total Returned */}
                                                    <td className={`text-center font-bold text-red-600 px-2 bg-red-50/40 ${expandedColumns.returned ? 'border-l-2 border-l-red-400' : 'border-l border-red-100'} ${person.returned_orders > 0 ? 'cursor-pointer hover:bg-red-100 hover:underline' : ''}`} onClick={(e) => { if(person.returned_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'returned'); } }}>{person.returned_orders > 0 ? formatCurrency(person.returned_orders) : '-'}</td>
                                                    <td className={`text-right text-red-600 font-kanit px-2 bg-red-50/40 ${expandedColumns.returned ? 'border-r border-red-200' : 'border-r-2 border-gray-200'} ${person.returned_sales > 0 ? 'cursor-pointer hover:bg-red-100 hover:underline' : ''}`} onClick={(e) => { if(person.returned_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'returned'); } }}>{person.returned_sales > 0 ? `฿${formatCurrency(person.returned_sales)}` : '-'}</td>
                                                    
                                                    {/* Expanded Returned Subcategories */}
                                                    {expandedColumns.returned && (
                                                        <>
                                                            <td className={`text-center font-bold text-red-500 px-2 bg-red-50/20`}>{person.returned_good_orders > 0 ? formatCurrency(person.returned_good_orders) : '-'}</td>
                                                            <td className={`text-right text-red-500 font-kanit px-2 bg-red-50/20 border-r border-red-200`}>{person.returned_good_sales > 0 ? `฿${formatCurrency(person.returned_good_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-red-500 px-2 bg-red-50/20`}>{person.returned_damaged_orders > 0 ? formatCurrency(person.returned_damaged_orders) : '-'}</td>
                                                            <td className={`text-right text-red-500 font-kanit px-2 bg-red-50/20 border-r border-red-200`}>{person.returned_damaged_sales > 0 ? `฿${formatCurrency(person.returned_damaged_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-red-500 px-2 bg-red-50/20`}>{person.returned_returning_orders > 0 ? formatCurrency(person.returned_returning_orders) : '-'}</td>
                                                            <td className={`text-right text-red-500 font-kanit px-2 bg-red-50/20 border-r border-red-200`}>{person.returned_returning_sales > 0 ? `฿${formatCurrency(person.returned_returning_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-red-500 px-2 bg-red-50/20`}>{person.returned_lost_orders > 0 ? formatCurrency(person.returned_lost_orders) : '-'}</td>
                                                            <td className={`text-right text-red-500 font-kanit px-2 bg-red-50/20 border-r border-red-200`}>{person.returned_lost_sales > 0 ? `฿${formatCurrency(person.returned_lost_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-red-500 px-2 bg-red-50/20`}>{person.returned_other_orders > 0 ? formatCurrency(person.returned_other_orders) : '-'}</td>
                                                            <td className={`text-right text-red-500 font-kanit px-2 bg-red-50/20 border-r-2 border-r-red-400`}>{person.returned_other_sales > 0 ? `฿${formatCurrency(person.returned_other_sales)}` : '-'}</td>
                                                        </>
                                                    )}
                                                    
                                                    {/* Total Cancelled */}
                                                    <td className={`text-center font-bold text-gray-500 px-2 bg-gray-100/80 ${expandedColumns.cancelled ? 'border-l-2 border-l-gray-400' : 'border-l border-gray-100'} ${person.cancelled_orders > 0 ? 'cursor-pointer hover:bg-gray-200 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled'); } }}>{person.cancelled_orders > 0 ? formatCurrency(person.cancelled_orders) : '-'}</td>
                                                    <td className={`text-right text-gray-500 font-kanit px-2 bg-gray-100/80 ${expandedColumns.cancelled ? 'border-r border-gray-300' : 'border-r-2 border-gray-200'} ${person.cancelled_sales > 0 ? 'cursor-pointer hover:bg-gray-200 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled'); } }}>{person.cancelled_sales > 0 ? `฿${formatCurrency(person.cancelled_sales)}` : '-'}</td>
                                                    
                                                    {/* Expanded Cancelled Subcategories */}
                                                    {expandedColumns.cancelled && (
                                                        <>
                                                            <td className={`text-center font-bold text-gray-400 px-2 bg-gray-50/80 ${person.cancelled_type1_orders > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type1_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 1); } }}>{person.cancelled_type1_orders > 0 ? formatCurrency(person.cancelled_type1_orders) : '-'}</td>
                                                            <td className={`text-right text-gray-400 font-kanit px-2 bg-gray-50/80 border-r border-gray-300 ${person.cancelled_type1_sales > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type1_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 1); } }}>{person.cancelled_type1_sales > 0 ? `฿${formatCurrency(person.cancelled_type1_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-gray-400 px-2 bg-gray-50/80 ${person.cancelled_type2_orders > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type2_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 2); } }}>{person.cancelled_type2_orders > 0 ? formatCurrency(person.cancelled_type2_orders) : '-'}</td>
                                                            <td className={`text-right text-gray-400 font-kanit px-2 bg-gray-50/80 border-r border-gray-300 ${person.cancelled_type2_sales > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type2_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 2); } }}>{person.cancelled_type2_sales > 0 ? `฿${formatCurrency(person.cancelled_type2_sales)}` : '-'}</td>
                                                            
                                                            <td className={`text-center font-bold text-gray-400 px-2 bg-gray-50/80 ${person.cancelled_type3_orders > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type3_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 3); } }}>{person.cancelled_type3_orders > 0 ? formatCurrency(person.cancelled_type3_orders) : '-'}</td>
                                                            <td className={`text-right text-gray-400 font-kanit px-2 bg-gray-50/80 border-r-2 border-r-gray-400 ${person.cancelled_type3_sales > 0 ? 'cursor-pointer hover:bg-gray-100 hover:underline' : ''}`} onClick={(e) => { if(person.cancelled_type3_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'cancelled', 3); } }}>{person.cancelled_type3_sales > 0 ? `฿${formatCurrency(person.cancelled_type3_sales)}` : '-'}</td>
                                                        </>
                                                    )}
                                                    
                                                    {/* Bad Debt */}
                                                    <td className={`text-center font-bold text-purple-600 px-2 bg-purple-50/10 ${person.baddebt_orders > 0 ? 'cursor-pointer hover:bg-purple-100 hover:underline' : ''}`} onClick={(e) => { if(person.baddebt_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'baddebt'); } }}>{person.baddebt_orders > 0 ? formatCurrency(person.baddebt_orders) : '-'}</td>
                                                    <td className={`text-right text-purple-600 font-kanit px-2 bg-purple-50/10 border-r-2 border-gray-200 ${person.baddebt_sales > 0 ? 'cursor-pointer hover:bg-purple-100 hover:underline' : ''}`} onClick={(e) => { if(person.baddebt_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'baddebt'); } }}>{person.baddebt_sales > 0 ? `฿${formatCurrency(person.baddebt_sales)}` : '-'}</td>

                                                    {/* Unpaid (Delivered but not fully paid) */}
                                                    <td className={`text-center font-bold text-orange-600 px-2 bg-orange-50/30 ${person.unpaid_orders > 0 ? 'cursor-pointer hover:bg-orange-100 hover:underline' : ''}`} title={WAIVED_AMOUNT_HINT} onClick={(e) => { if(person.unpaid_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'unpaid'); } }}>{person.unpaid_orders > 0 ? formatCurrency(person.unpaid_orders) : '-'}</td>
                                                    <td className={`text-right text-orange-600 font-kanit font-bold px-2 bg-orange-50/30 border-r-2 border-gray-200 ${person.unpaid_sales > 0 ? 'cursor-pointer hover:bg-orange-100 hover:underline' : ''}`} title={WAIVED_AMOUNT_HINT} onClick={(e) => { if(person.unpaid_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'unpaid'); } }}>{person.unpaid_sales > 0 ? `฿${formatCurrency(person.unpaid_sales)}` : '-'}</td>

                                                    {/* Others */}
                                                    <td className={`text-center font-bold text-amber-600 px-2 bg-amber-50/10 ${person.other_orders > 0 ? 'cursor-pointer hover:bg-amber-100 hover:underline' : ''}`} onClick={(e) => { if(person.other_orders > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'other'); } }}>{person.other_orders > 0 ? formatCurrency(person.other_orders) : '-'}</td>
                                                    <td className={`text-right text-amber-600 font-kanit px-2 bg-amber-50/10 ${person.other_sales > 0 ? 'cursor-pointer hover:bg-amber-100 hover:underline' : ''}`} onClick={(e) => { if(person.other_sales > 0) { e.stopPropagation(); openSalespersonStatusModal(person, deptName, 'other'); } }}>{person.other_sales > 0 ? `฿${formatCurrency(person.other_sales)}` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

            {/* Channel Details Modal */}
            {showChannelDetail && selectedChannel && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">share</span>
                                รายละเอียดสินค้า: {selectedChannel}
                            </h3>
                            <button
                                onClick={() => setShowChannelDetail(false)}
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
                                        <th className="py-3 font-semibold" style={{ width: '25%' }}>หมวดหมู่</th>
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
                                    {data.channel_details?.[selectedChannel]?.map((product, idx) => (
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
                                ทั้งหมด {data.channel_details?.[selectedChannel]?.length || 0} รายการ
                            </span>
                            <button
                                onClick={() => setShowChannelDetail(false)}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Drill-Down Modal */}
            <OtherOrdersModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                productId={statusModal.productId}
                productName={statusModal.productName}
                salespersonId={statusModal.salespersonId}
                salespersonName={statusModal.salespersonName}
                department={statusModal.department}
                companyId={user?.company_id || 1}
                month={month}
                year={year}
                statusType={statusModal.statusType}
                cancelTypeId={statusModal.cancelTypeId}
                dateRangeParams={dateRange.params}
            />
        </div>
    );
}

export default DashboardPage;

import { useState, useEffect } from 'react';
import { SummaryTable, DetailTable } from '../../components/Tables';
import { CustomSelect } from '../../components/UI';

// Platform icons
import facebookIcon from '../../components/icon/facebook(admin).png';
import lineIcon from '../../components/icon/line(admin).png';
import tiktokIcon from '../../components/icon/tik-tok(admin).png';
import questionIcon from '../../components/icon/question-mark(admin).png';
import championshipIcon from '../../components/icon/championship.png';

function AdminSalesReportPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [meta, setMeta] = useState(null);
    const [prevMonthData, setPrevMonthData] = useState(null);

    // Filters - Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('adminSalesReport_month');
        return saved ? parseInt(saved) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('adminSalesReport_year');
        return saved ? parseInt(saved) : currentDate.getFullYear();
    });
    const [includeCancelled, setIncludeCancelled] = useState(false);

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('adminSalesReport_month', month.toString());
        sessionStorage.setItem('adminSalesReport_year', year.toString());
    }, [month, year]);

    const months = [
        { value: 0, label: 'ทั้งหมด' },
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const goToPrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const goToNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year, includeCancelled, user?.company_id]);

    const fetchData = async () => {
        if (!user?.company_id) {
            setError('Missing Company ID');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let prevMonth = month - 1;
            let prevYear = year;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear = year - 1;
            }

            const params = new URLSearchParams({
                company_id: user.company_id,
                month: month,
                year: year,
                include_cancelled: includeCancelled ? 1 : 0,
            });

            const prevParams = new URLSearchParams({
                company_id: user.company_id,
                month: prevMonth,
                year: prevYear,
                include_cancelled: includeCancelled ? 1 : 0,
            });

            const [response, prevResponse] = await Promise.all([
                fetch(`./api/reports/admin_sales.php?${params}`),
                fetch(`./api/reports/admin_sales.php?${prevParams}`)
            ]);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setMeta(result.meta);
            } else {
                setError(result.message || 'Failed to fetch data');
            }

            if (prevResponse.ok) {
                const prevResult = await prevResponse.json();
                if (prevResult.success) {
                    setPrevMonthData(prevResult.data);
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('API Connection Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sales-report-page space-y-8">

            {/* Control Center / Filter Bar */}
            <div className="flex flex-wrap items-center justify-between bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/80 relative z-50 gap-3">

                {/* Left - Title */}
                <div className="px-2">
                    <h2 className="text-lg font-bold text-gray-700">
                        📋 รายงานยอดขาย Admin Page
                    </h2>
                    <p className="text-xs text-gray-500">
                        {month === 0 ? `ทั้งปี ${year}` : `${months.find(m => m.value === month)?.label} ${year}`}
                    </p>
                </div>

                {/* Right - Controls */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* Date Navigation Group */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="เดือนที่แล้ว"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>

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
                                { value: 2024, label: '2024' },
                            ]}
                        />

                        <button
                            onClick={goToNextMonth}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="เดือนถัดไป"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>

                    {/* Options Group */}
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 cursor-pointer hover:border-primary/50 transition-colors">
                        <input
                            type="checkbox"
                            checked={includeCancelled}
                            onChange={(e) => setIncludeCancelled(e.target.checked)}
                            className="rounded text-primary focus:ring-primary border-gray-300"
                        />
                        <span className="text-sm font-bold">รวมยกเลิก</span>
                    </label>

                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span className="text-sm">ส่งออก</span>
                    </button>
                </div>
            </div>

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
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <SummaryTable data={data.summary} prevData={prevMonthData?.summary} />

                        {/* Main Grid - Left: Admin Ranking + Platform Cards | Right: Page Table */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column (5 cols) */}
                            <div className="lg:col-span-5 space-y-6">
                                {/* Admin Page Users Table */}
                                {data.by_salesperson.length > 0 && (
                                    <DetailTable
                                        data={data.by_salesperson}
                                        title={<span className="flex items-center gap-2"><img src={championshipIcon} alt="" className="w-6 h-6" /> อันดับยอดขาย Admin Page ({data.by_salesperson.length} คน)</span>}
                                        showBasketSize={true}
                                    />
                                )}

                                {/* Platform Cards with Logos */}
                                {data.by_platform && data.by_platform.length > 0 && (
                                    <div className="glass-card rounded-2xl overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-100">
                                            <h3 className="text-gray-700 font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">devices</span>
                                                ยอดขายตาม Platform ({data.by_platform.length})
                                            </h3>
                                        </div>
                                        <div className="p-4 grid grid-cols-2 gap-3">
                                            {(() => {
                                                // Merge Chat_Line into Line
                                                const platformMap = {};
                                                data.by_platform.forEach(p => {
                                                    const name = p.platform_name?.toLowerCase();
                                                    const key = (name === 'chat_line' || name === 'line') ? 'line' : p.platform_name;
                                                    if (!platformMap[key]) {
                                                        platformMap[key] = { ...p, platform_name: key === 'line' ? 'Line' : p.platform_name };
                                                    } else {
                                                        platformMap[key].order_count = parseInt(platformMap[key].order_count) + parseInt(p.order_count);
                                                        platformMap[key].total_sales = parseFloat(platformMap[key].total_sales) + parseFloat(p.total_sales);
                                                    }
                                                });
                                                return Object.values(platformMap);
                                            })().map((item, idx) => {
                                                const name = item.platform_name?.toLowerCase() || '';
                                                let icon = questionIcon;
                                                if (name.includes('facebook')) icon = facebookIcon;
                                                else if (name.includes('line')) icon = lineIcon;
                                                else if (name.includes('tiktok') || name.includes('tik-tok')) icon = tiktokIcon;

                                                return (
                                                    <div key={idx} className="bg-white/50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <img src={icon} alt={item.platform_name} className="w-8 h-8 object-contain" />
                                                            <span className="font-medium text-gray-700">{item.platform_name}</span>
                                                        </div>
                                                        <div className="text-2xl font-bold text-primary">
                                                            ฿{parseFloat(item.total_sales).toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {item.order_count} ออเดอร์
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column (7 cols) - Page Table */}
                            <div className="lg:col-span-7 lg:row-span-1">
                                {data.by_page && data.by_page.length > 0 && (
                                    <section className="glass-card rounded-3xl overflow-hidden flex flex-col h-full">
                                        <div className="px-8 py-6 border-b border-glass-border flex justify-between items-center flex-shrink-0">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">pages</span>
                                                ยอดขายตาม Page ({data.by_page.length})
                                            </h3>
                                        </div>
                                        <div className="p-4 overflow-y-auto flex-1">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">Page</th>
                                                        <th className="px-4 py-3">Platform</th>
                                                        <th className="px-4 py-3 text-right">ออเดอร์</th>
                                                        <th className="px-4 py-3 text-right">ยอดขาย</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {data.by_page.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                                            <td className="px-4 py-3 font-medium text-gray-800">{item.page_name}</td>
                                                            <td className="px-4 py-3 text-gray-500 text-sm">{item.platform_name}</td>
                                                            <td className="px-4 py-3 text-right text-gray-600">{item.order_count}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-primary">
                                                                ฿{parseFloat(item.total_sales).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>

                        {data.by_salesperson.length === 0 && (
                            <div className="glass-card rounded-2xl p-10 text-center text-gray-500">
                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                <p>ไม่พบข้อมูลยอดขายสำหรับเดือนนี้</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminSalesReportPage;

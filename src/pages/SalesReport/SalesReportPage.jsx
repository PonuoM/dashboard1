import { useState, useEffect } from 'react';
import { SummaryTable, Top10Table } from '../../components/Tables';
import { CustomSelect } from '../../components/UI';
import TargetManagementPage from '../TargetManagement/TargetManagementPage';
import CancelledOrdersModal from '../../components/Modals/CancelledOrdersModal';

function SalesReportPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [meta, setMeta] = useState(null);
    const [prevMonthData, setPrevMonthData] = useState(null);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [cancelModal, setCancelModal] = useState({ open: false, userId: null, userName: '', cancelTypeId: null, cancelTypeLabel: '' });
    const [returnedModal, setReturnedModal] = useState({ open: false, userId: null, userName: '' });

    // Filters - Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('salesReport_month');
        return saved ? parseInt(saved) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('salesReport_year');
        return saved ? parseInt(saved) : currentDate.getFullYear();
    });
    const [includeCancelled, setIncludeCancelled] = useState(false);

    const months = [
        { value: 0, label: 'ทั้งหมด' },
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const years = [];
    for (let y = currentDate.getFullYear(); y >= 2024; y--) {
        years.push(y);
    }

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('salesReport_month', month.toString());
        sessionStorage.setItem('salesReport_year', year.toString());
    }, [month, year]);

    // Navigate to previous month
    const goToPrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    // Navigate to next month
    const goToNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    // API uses AD year directly now
    const apiYear = year;

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
            // Calculate previous month/year
            let prevMonth = month - 1;
            let prevYear = apiYear;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear = apiYear - 1;
            }

            // Fetch current month data
            const params = new URLSearchParams({
                company_id: user.company_id,
                month: month,
                year: apiYear,
                include_cancelled: includeCancelled ? 1 : 0,
                user_id: user.id || '',
            });

            // Fetch previous month data
            const prevParams = new URLSearchParams({
                company_id: user.company_id,
                month: prevMonth,
                year: prevYear,
                include_cancelled: includeCancelled ? 1 : 0,
                user_id: user.id || '',
            });

            const [response, prevResponse] = await Promise.all([
                fetch(`./api/reports/sales.php?${params}`),
                fetch(`./api/reports/sales.php?${prevParams}`)
            ]);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setMeta(result.meta);
            } else {
                setError(result.message || 'Failed to fetch data');
            }

            // Process previous month data
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



    const monthLabel = months.find(m => m.value === month)?.label;

    return (
        <div className="sales-report-page space-y-8">

            {/* Control Center / Filter Bar */}
            <div className="flex flex-wrap items-center justify-between bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/80 relative z-50 gap-3">

                {/* Left - Title */}
                <div className="px-2">
                    <h2 className="text-lg font-bold text-gray-700">
                        รายงานยอดขาย Telesale
                    </h2>
                    <p className="text-xs text-gray-500">
                        {month === 0 ? `ทั้งปี ${year}` : `${months.find(m => m.value === month)?.label} ${year}`}
                    </p>
                </div>

                {/* Right - Controls */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* Date Navigation Group - Symmetrical */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                        {/* Previous Month Button */}
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="เดือนที่แล้ว"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>

                        {/* Month Picker */}
                        <CustomSelect
                            value={month}
                            onChange={(val) => setMonth(val)}
                            options={months}
                        />

                        <div className="w-px h-6 bg-gray-200"></div>

                        {/* Year Picker */}
                        <CustomSelect
                            value={year}
                            onChange={(val) => setYear(val)}
                            options={[
                                { value: 2026, label: '2026' },
                                { value: 2025, label: '2025' },
                                { value: 2024, label: '2024' },
                                { value: 2023, label: '2023' },
                            ]}
                        />

                        {/* Next Month Button */}
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
                        <span className="text-sm font-bold">รวมยกเลิก/ตีกลับ</span>
                    </label>

                    <button
                        onClick={() => setShowTargetModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">target</span>
                        <span className="text-sm">ตั้งเป้า</span>
                    </button>

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
                    {/* Main Content - Full Width */}
                    <div className="space-y-6">
                        {/* Summary Cards (4 columns) */}
                        <SummaryTable data={data.summary} prevData={prevMonthData?.summary} totalOrdersDistinct={data.total_orders_distinct} />

                        {/* Ranking + Product Breakdown Table */}
                        <Top10Table
                            data={data.by_salesperson}
                            meta={meta}
                            cancellationTypes={data.cancellation_types}
                            onViewCancelledOrders={({ userId, userName, cancelTypeId, cancelTypeLabel }) => {
                                setCancelModal({ open: true, userId, userName, cancelTypeId, cancelTypeLabel });
                            }}
                            onViewReturnedOrders={({ userId, userName }) => {
                                setReturnedModal({ open: true, userId, userName });
                            }}
                        />
                    </div>
                </>
            )}

            {/* Cancelled Orders Modal */}
            <CancelledOrdersModal
                isOpen={cancelModal.open}
                onClose={() => setCancelModal({ ...cancelModal, open: false })}
                userId={cancelModal.userId}
                userName={cancelModal.userName}
                cancelTypeId={cancelModal.cancelTypeId}
                cancelTypeLabel={cancelModal.cancelTypeLabel}
                companyId={user?.company_id}
                month={month}
                year={apiYear}
                mode="cancelled"
            />

            {/* Returned Orders Modal */}
            <CancelledOrdersModal
                isOpen={returnedModal.open}
                onClose={() => setReturnedModal({ ...returnedModal, open: false })}
                userId={returnedModal.userId}
                userName={returnedModal.userName}
                companyId={user?.company_id}
                month={month}
                year={apiYear}
                mode="returned"
            />

            {/* Target Management Modal */}
            {showTargetModal && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowTargetModal(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[80vh] overflow-y-auto">
                        {/* Target Page Content */}
                        <div className="p-6">
                            <TargetManagementPage user={user} />
                        </div>
                    </div>

                    {/* Close Button - Below Modal */}
                    <button
                        onClick={() => {
                            setShowTargetModal(false);
                            fetchData(); // Refresh data when closing
                        }}
                        className="relative mt-4 w-12 h-12 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-gray-600 flex items-center justify-center transition-all shadow-lg z-10"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default SalesReportPage;

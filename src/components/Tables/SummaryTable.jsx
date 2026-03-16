
function SummaryTable({ data, prevData, totalOrdersDistinct }) {
    const getDataByType = (arr, type) => (arr || []).find(d => d.product_type === type) || {};

    const fertData = getDataByType(data, 'fertilizer');
    const bioData = getDataByType(data, 'bio');
    const prevFertData = getDataByType(prevData, 'fertilizer');
    const prevBioData = getDataByType(prevData, 'bio');

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH').format(val || 0);
    const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    const calcGrowth = (current, previous) => {
        const curr = parseFloat(current) || 0;
        const prev = parseFloat(previous) || 0;
        if (prev === 0) return null;
        return ((curr - prev) / prev * 100).toFixed(1);
    };

    const fertGrowth = calcGrowth(fertData.total_sales, prevFertData.total_sales);
    const bioGrowth = calcGrowth(bioData.total_sales, prevBioData.total_sales);

    const GrowthBadge = ({ growth }) => {
        if (growth === null) {
            return (
                <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full border border-gray-200">
                    ไม่มีข้อมูลเดือนก่อน
                </div>
            );
        }
        const isPositive = parseFloat(growth) >= 0;
        return (
            <div className={`px-3 py-1 text-xs font-bold rounded-full border ${isPositive
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                {isPositive ? '+' : ''}{growth}% จากเดือนก่อน
            </div>
        );
    };

    // Calculate totals
    const totalSales = (parseFloat(fertData.total_sales) || 0) + (parseFloat(bioData.total_sales) || 0);
    const totalOrders = totalOrdersDistinct != null
        ? parseInt(totalOrdersDistinct)
        : (parseInt(fertData.order_count) || 0) + (parseInt(bioData.order_count) || 0);
    const totalQuantity = (parseInt(fertData.total_quantity) || 0) + (parseInt(bioData.total_quantity) || 0);
    const totalCustomers = (parseInt(fertData.customer_count) || 0) + (parseInt(bioData.customer_count) || 0);

    const prevTotalSales = (parseFloat(prevFertData.total_sales) || 0) + (parseFloat(prevBioData.total_sales) || 0);
    const totalGrowth = calcGrowth(totalSales, prevTotalSales);

    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const fertPercent = totalSales > 0 ? ((parseFloat(fertData.total_sales) || 0) / totalSales * 100).toFixed(0) : 0;
    const bioPercent = totalSales > 0 ? ((parseFloat(bioData.total_sales) || 0) / totalSales * 100).toFixed(0) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Summary Card */}
            <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-primary/10 to-amber-500/10 border-primary/20">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-bold text-gray-700">ยอดขายรวมทั้งหมด</h2>
                        <p className="text-[10px] text-gray-500">ปุ๋ย + ชีวภัณฑ์</p>
                    </div>
                    <GrowthBadge growth={totalGrowth} />
                </div>
                <div className="mb-4">
                    <span className="text-3xl font-extrabold text-primary tracking-tight">฿{formatCurrency(totalSales)}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-primary/20">
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ออเดอร์</p>
                        <p className="text-base font-bold text-primary">{formatNumber(totalOrders)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">สินค้า</p>
                        <p className="text-base font-bold">{formatNumber(totalQuantity)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ลูกค้า</p>
                        <p className="text-base font-bold">{formatNumber(totalCustomers)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">เฉลี่ย/ออเดอร์</p>
                        <p className="text-base font-bold text-amber-600">฿{formatCurrency(avgOrderValue)}</p>
                    </div>
                </div>
            </div>

            {/* Fertilizer Card */}
            <div className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-bold">ประเภทปุ๋ย</h3>
                        <p className="text-[10px] text-gray-500">ปุ๋ยเคมี & NPK ({fertPercent}%)</p>
                    </div>
                    <GrowthBadge growth={fertGrowth} />
                </div>
                <div className="mb-4">
                    <span className="text-2xl font-extrabold text-primary">฿{formatCurrency(fertData.total_sales)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/50">
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ออเดอร์</p>
                        <p className="text-sm font-bold">{formatNumber(fertData.order_count)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">สินค้า</p>
                        <p className="text-sm font-bold">{formatNumber(fertData.total_quantity)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ลูกค้า</p>
                        <p className="text-sm font-bold">{formatNumber(fertData.customer_count)}</p>
                    </div>
                </div>
            </div>

            {/* Bio-products Card */}
            <div className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-bold">ประเภทชีวภัณฑ์</h3>
                        <p className="text-[10px] text-gray-500">ชีวภัณฑ์ & อินทรีย์ ({bioPercent}%)</p>
                    </div>
                    <GrowthBadge growth={bioGrowth} />
                </div>
                <div className="mb-4">
                    <span className="text-2xl font-extrabold text-primary">฿{formatCurrency(bioData.total_sales)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/50">
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ออเดอร์</p>
                        <p className="text-sm font-bold">{formatNumber(bioData.order_count)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">สินค้า</p>
                        <p className="text-sm font-bold">{formatNumber(bioData.total_quantity)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ลูกค้า</p>
                        <p className="text-sm font-bold">{formatNumber(bioData.customer_count)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SummaryTable;

function DetailTable({ data, title, showBasketSize }) {
    const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    return (
        <section className="glass-card rounded-3xl overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-glass-border flex justify-between items-center">
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-3">พนักงานขาย</th>
                            <th className="px-4 py-3 text-center">ตำแหน่ง</th>
                            <th className="px-4 py-3 text-right">ปุ๋ย (฿) / ออเดอร์</th>
                            <th className="px-4 py-3 text-right">ชีวภัณฑ์ (฿) / ออเดอร์</th>
                            <th className="px-4 py-3 text-right">รวม (฿)</th>
                            {showBasketSize && (
                                <>
                                    <th className="px-4 py-3 text-center">ออเดอร์</th>
                                    <th className="px-4 py-3 text-right">เฉลี่ย/ออเดอร์ ปุ๋ย</th>
                                    <th className="px-4 py-3 text-right">เฉลี่ย/ออเดอร์ ชีวภัณฑ์</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {data.map((row, index) => {
                            const totalOrders = parseInt(row.total_orders) || 0;
                            const fertOrders = parseInt(row.fertilizer_orders) || 0;
                            const bioOrders = parseInt(row.bio_orders) || 0;
                            const fertSales = parseFloat(row.fertilizer_sales) || 0;
                            const bioSales = parseFloat(row.bio_sales) || 0;
                            const avgFert = fertOrders > 0 ? Math.round(fertSales / fertOrders) : 0;
                            const avgBio = bioOrders > 0 ? Math.round(bioSales / bioOrders) : 0;

                            return (
                                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4 font-bold text-primary">{row.salesperson_name || 'N/A'}</td>
                                    <td className="px-4 py-4 text-center text-gray-500 text-xs">{row.role_name}</td>
                                    <td className="px-4 py-4 text-right text-gray-600">
                                        {formatNumber(row.fertilizer_sales)}
                                        <span className="text-[10px] text-gray-400 ml-1">/ {fertOrders}</span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-gray-600">
                                        {formatNumber(row.bio_sales)}
                                        <span className="text-[10px] text-gray-400 ml-1">/ {bioOrders}</span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-gray-800">{formatNumber(row.total_sales)}</td>
                                    {showBasketSize && (
                                        <>
                                            <td className="px-4 py-4 text-center text-gray-600">
                                                {formatNumber(totalOrders)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                                {fertOrders > 0 ? `฿${formatNumber(avgFert)}` : '-'}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-amber-600">
                                                {bioOrders > 0 ? `฿${formatNumber(avgBio)}` : '-'}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default DetailTable;

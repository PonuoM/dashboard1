import { useState, useEffect } from 'react';

function ProvinceProductsModal({ isOpen, onClose, province, regionName, companyId, month, year, department, userId, dateRange }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH').format(Math.round(val || 0));

    const categoryBadge = (category) => {
        if (!category) return { label: 'อื่นๆ', cls: 'bg-gray-100 text-gray-500' };
        if (category.includes('ปุ๋ย')) return { label: 'ปุ๋ย', cls: 'bg-amber-100 text-amber-700' };
        if (category === 'ชีวภัณฑ์') return { label: 'ชีวภัณฑ์', cls: 'bg-green-100 text-green-700' };
        return { label: category, cls: 'bg-gray-100 text-gray-500' };
    };

    useEffect(() => {
        if (!isOpen || !province || !companyId) return;
        setLoading(true);
        setError(null);
        setData(null);

        const params = new URLSearchParams({
            company_id: companyId,
            month: month,
            year: year,
            department: department,
            user_id: userId || '',
            province: province,
        });
        if (dateRange?.active) {
            params.set('start_date', dateRange.startParam);
            params.set('end_date', dateRange.endParam);
        }

        fetch(`./api/reports/province_products.php?${params}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.message || 'โหลดข้อมูลไม่สำเร็จ');
                }
            })
            .catch(() => setError('เชื่อมต่อไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, [isOpen, province, companyId, month, year, department, userId, dateRange?.key]);

    if (!isOpen) return null;

    const totalSales = data?.total_sales || 0;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 font-kanit">
                            <span className="material-symbols-outlined text-primary">location_on</span>
                            สินค้าที่ขายใน {province}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            {regionName && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">{regionName}</span>
                            )}
                            <span className="text-sm text-gray-500">ยอดเงิน · จำนวนที่ขายได้</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-red-100 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-8 h-8 border-4 border-green-200 border-t-primary rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-500 text-sm">กำลังโหลด...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <p className="text-red-500 font-bold">{error}</p>
                        </div>
                    ) : data && data.products.length > 0 ? (
                        <>
                            {/* Sticky summary */}
                            <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-3 border-b border-gray-100 shadow-sm flex-shrink-0">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-2.5 bg-primary/5 rounded-xl">
                                        <div className="text-[10px] text-gray-500 mb-1">ยอดขายรวม</div>
                                        <div className="text-sm font-bold text-primary">฿{formatCurrency(data.total_sales)}</div>
                                    </div>
                                    <div className="text-center p-2.5 bg-blue-50 rounded-xl">
                                        <div className="text-[10px] text-gray-500 mb-1">จำนวนรวม</div>
                                        <div className="text-sm font-bold text-blue-600">{data.total_qty.toLocaleString()} ชิ้น</div>
                                    </div>
                                    <div className="text-center p-2.5 bg-amber-50 rounded-xl">
                                        <div className="text-[10px] text-gray-500 mb-1">รายการสินค้า</div>
                                        <div className="text-sm font-bold text-amber-600">{data.product_count} รายการ</div>
                                    </div>
                                </div>
                            </div>

                            {/* Products table */}
                            <div className="flex-1 overflow-y-auto px-6 pb-4">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white z-[5]">
                                        <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                            <th className="px-3 py-3 text-left w-8">#</th>
                                            <th className="px-3 py-3 text-left">สินค้า</th>
                                            <th className="px-3 py-3 text-center">จำนวน</th>
                                            <th className="px-3 py-3 text-center">ออเดอร์</th>
                                            <th className="px-3 py-3 text-right">ยอดขาย</th>
                                            <th className="px-3 py-3 text-right">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.products.map((prod, i) => {
                                            const badge = categoryBadge(prod.category);
                                            const percent = totalSales > 0 ? ((prod.total_sales / totalSales) * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="font-medium text-gray-800 text-xs">{prod.product_name}</div>
                                                        <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${badge.cls}`}>{badge.label}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-blue-600 text-xs">{prod.total_qty.toLocaleString()}</td>
                                                    <td className="px-3 py-3 text-center text-gray-500 text-xs">{prod.order_count}</td>
                                                    <td className="px-3 py-3 text-right font-bold text-primary text-xs">฿{formatCurrency(prod.total_sales)}</td>
                                                    <td className="px-3 py-3 text-right text-xs text-gray-600">{percent}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
                            <p className="mt-2 text-gray-400 text-sm">ไม่มีสินค้าที่ขายในจังหวัดนี้</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProvinceProductsModal;

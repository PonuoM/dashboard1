import { useState, useEffect } from 'react';

function CancelledOrdersModal({ isOpen, onClose, userId, userName, cancelTypeId, cancelTypeLabel, companyId, month, year, mode = 'cancelled' }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState({});
    const [loadingItems, setLoadingItems] = useState(null);

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH').format(val || 0);
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const isReturned = mode === 'returned';

    useEffect(() => {
        if (!isOpen || !userId) return;
        setLoading(true);
        setError(null);
        setExpandedOrder(null);
        setOrderItems({});

        const params = new URLSearchParams({
            company_id: companyId,
            user_id: userId,
            month: month,
            year: year,
            mode: mode,
        });
        if (!isReturned) {
            params.append('cancel_type_id', cancelTypeId);
        }

        fetch(`./api/reports/cancelled_orders.php?${params}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.message || 'Failed to load');
                }
            })
            .catch(() => setError('Connection error'))
            .finally(() => setLoading(false));
    }, [isOpen, userId, cancelTypeId, companyId, month, year, mode]);

    // Fetch order items when expanding an order
    const toggleOrderItems = (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
            return;
        }
        setExpandedOrder(orderId);

        // Already cached
        if (orderItems[orderId]) return;

        // Fetch
        setLoadingItems(orderId);
        fetch(`./api/reports/order_items.php?order_id=${orderId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setOrderItems(prev => ({ ...prev, [orderId]: result.data.items }));
                }
            })
            .catch(() => {})
            .finally(() => setLoadingItems(null));
    };

    if (!isOpen) return null;

    const statusColors = {
        'Cancelled': 'bg-red-100 text-red-700',
        'Returned': 'bg-orange-100 text-orange-700',
        'BadDebt': 'bg-purple-100 text-purple-700',
    };

    const statusLabels = {
        'Cancelled': 'ยกเลิก',
        'Returned': 'ตีกลับ',
        'BadDebt': 'หนี้สูญ',
    };

    const headerGradient = isReturned ? 'from-orange-50 to-amber-50' : 'from-red-50 to-orange-50';
    const headerIcon = isReturned ? 'undo' : 'cancel';
    const headerTitle = isReturned ? 'รายละเอียดออเดอร์ตีกลับ' : 'รายละเอียดออเดอร์ยกเลิก';
    const amountColor = isReturned ? 'text-orange-600' : 'text-red-600';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className={`px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r ${headerGradient} flex-shrink-0`}>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className={`material-symbols-outlined ${isReturned ? 'text-orange-500' : 'text-red-500'}`}>{headerIcon}</span>
                            {headerTitle}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600 font-medium">{userName}</span>
                            {!isReturned && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                                    {cancelTypeLabel || 'ไม่ระบุประเภท'}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-red-100 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className={`w-8 h-8 border-4 ${isReturned ? 'border-orange-200 border-t-orange-500' : 'border-red-200 border-t-red-500'} rounded-full animate-spin`}></div>
                            <p className="mt-4 text-gray-500 text-sm">กำลังโหลด...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <p className="text-red-500 font-bold">{error}</p>
                        </div>
                    ) : data && data.orders.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-600">
                                    ทั้งหมด <span className="font-bold text-gray-800">{data.total_count}</span> ออเดอร์
                                    <span className="text-xs text-gray-400 ml-2">(คลิกเพื่อดูสินค้า)</span>
                                </span>
                                <span className={`text-sm font-bold ${amountColor}`}>
                                    รวม ฿{formatCurrency(data.total_amount)}
                                </span>
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="px-4 py-3 text-left w-8"></th>
                                        <th className="px-4 py-3 text-left">#</th>
                                        <th className="px-4 py-3 text-left">เลขออเดอร์</th>
                                        <th className="px-4 py-3 text-left">วันที่</th>
                                        <th className="px-4 py-3 text-left">ลูกค้า</th>
                                        <th className="px-4 py-3 text-center">สถานะ</th>
                                        <th className="px-4 py-3 text-right">ยอดเงิน</th>
                                        {isReturned ? (
                                            <>
                                                <th className="px-4 py-3 text-left">หมายเหตุจากพนักงานขาย</th>
                                                <th className="px-4 py-3 text-left">หมายเหตุจากคลัง</th>
                                            </>
                                        ) : (
                                            <th className="px-4 py-3 text-left">หมายเหตุ</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.orders.map((order, i) => {
                                        const isOrderExpanded = expandedOrder === order.order_id;
                                        const items = orderItems[order.order_id];
                                        const isItemsLoading = loadingItems === order.order_id;

                                        return (
                                            <>
                                                <tr
                                                    key={order.order_id}
                                                    className={`hover:bg-gray-50/70 transition-colors cursor-pointer ${isOrderExpanded ? 'bg-blue-50/50' : ''}`}
                                                    onClick={() => toggleOrderItems(order.order_id)}
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className={`material-symbols-outlined text-sm text-gray-400 transition-transform ${isOrderExpanded ? 'rotate-90' : ''}`}>
                                                            chevron_right
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{order.order_id}</td>
                                                    <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(order.order_date)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-gray-800">{order.customer_name || '-'}</div>
                                                        {order.customer_phone && (
                                                            <div className="text-[10px] text-gray-400">{order.customer_phone}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors[order.order_status] || 'bg-gray-100 text-gray-600'}`}>
                                                            {statusLabels[order.order_status] || order.order_status}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-bold ${amountColor}`}>
                                                        ฿{formatCurrency(order.net_total)}
                                                    </td>
                                                    {isReturned ? (
                                                        <>
                                                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                                                                {order.cancel_notes || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={order.warehouse_by ? `บันทึกโดย: ${order.warehouse_by}` : ''}>
                                                                {order.warehouse_notes || (order.warehouse_by ? <span className="italic text-gray-400">ไม่มีหมายเหตุ</span> : '-')}
                                                                {order.warehouse_by && (
                                                                    <span className="block text-[10px] text-gray-400">โดย {order.warehouse_by}</span>
                                                                )}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                                                            {order.cancel_notes || '-'}
                                                        </td>
                                                    )}
                                                </tr>

                                                {/* Expanded: Product details */}
                                                {isOrderExpanded && (
                                                    <tr key={`${order.order_id}-items`}>
                                                        <td colSpan={isReturned ? "9" : "8"} className="px-0 py-0">
                                                            <div className="mx-4 mb-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-100 overflow-hidden" style={{ animation: 'fadeSlideIn 0.15s ease-out' }}>
                                                                {isItemsLoading ? (
                                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                                        <span className="text-xs text-gray-400">กำลังโหลดรายละเอียดสินค้า...</span>
                                                                    </div>
                                                                ) : items && items.length > 0 ? (
                                                                    <>
                                                                        <div className="px-4 py-2 bg-gray-100/80 border-b border-gray-200/50 flex items-center gap-2">
                                                                            <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                                                                            <span className="text-[11px] font-bold text-gray-600">รายการสินค้า ({items.length} รายการ)</span>
                                                                        </div>
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                                                                                    <th className="px-4 py-2 text-left">สินค้า</th>
                                                                                    <th className="px-4 py-2 text-left">SKU</th>
                                                                                    <th className="px-4 py-2 text-left">หมวดหมู่</th>
                                                                                    <th className="px-4 py-2 text-center">จำนวน</th>
                                                                                    <th className="px-4 py-2 text-right">ราคา/หน่วย</th>
                                                                                    <th className="px-4 py-2 text-right">รวม</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                {items.map((item) => (
                                                                                    <tr key={item.item_id} className="hover:bg-white/60 transition-colors">
                                                                                        <td className="px-4 py-2 font-medium text-gray-800">
                                                                                            {item.product_name}
                                                                                            {item.is_freebie === 1 && (
                                                                                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">ฟรี</span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 font-mono text-gray-400">{item.product_sku || '-'}</td>
                                                                                        <td className="px-4 py-2 text-gray-500">{item.product_category || '-'}</td>
                                                                                        <td className="px-4 py-2 text-center font-bold">{item.quantity}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-600">฿{formatCurrency(item.unit_price)}</td>
                                                                                        <td className="px-4 py-2 text-right font-bold text-gray-800">฿{formatCurrency(item.net_total)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </>
                                                                ) : (
                                                                    <div className="py-4 text-center text-xs text-gray-400">ไม่พบรายการสินค้า</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
                            <p className="mt-2 text-gray-400 text-sm">ไม่มีออเดอร์</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default CancelledOrdersModal;

import { useState, useEffect, Fragment } from 'react';

// สภาพกล่องที่ตีกลับ (order_boxes.return_status) — ตรงกับหน้า ReturnedDetails
const RETURN_STATUS_MAP = {
    good: { label: 'ดี', cls: 'bg-green-100 text-green-700' },
    damaged: { label: 'ชำรุด', cls: 'bg-red-100 text-red-700' },
    returning: { label: 'กำลังส่งคืน', cls: 'bg-amber-100 text-amber-700' },
    lost: { label: 'สูญหาย', cls: 'bg-gray-200 text-gray-700' },
    returned: { label: 'คืนแล้ว', cls: 'bg-blue-100 text-blue-700' },
};
const returnStatusInfo = (s) => RETURN_STATUS_MAP[s] || { label: s || '-', cls: 'bg-gray-100 text-gray-500' };

function OtherOrdersModal({ isOpen, onClose, productId, productName, salespersonId, salespersonName, department, companyId, month, year, statusType = 'other', cancelTypeId, dateRangeParams = '' }) {
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

    const statusConfig = {
        other: { gradient: 'from-amber-50 to-orange-50', icon: 'pending_actions', title: 'รายละเอียดออเดอร์ (อื่นๆ)', color: 'text-amber-600', borderColor: 'border-t-amber-500', badgeBg: 'bg-amber-100 text-amber-700' },
        delivered: { gradient: 'from-green-50 to-emerald-50', icon: 'check_circle', title: 'รายละเอียดออเดอร์ (สำเร็จ)', color: 'text-green-600', borderColor: 'border-t-green-500', badgeBg: 'bg-green-100 text-green-700' },
        returned: { gradient: 'from-red-50 to-orange-50', icon: 'undo', title: 'รายละเอียดออเดอร์ (ตีกลับ)', color: 'text-red-600', borderColor: 'border-t-red-500', badgeBg: 'bg-red-100 text-red-700' },
        cancelled: { gradient: 'from-gray-50 to-gray-100', icon: 'cancel', title: 'รายละเอียดออเดอร์ (ยกเลิก)', color: 'text-gray-600', borderColor: 'border-t-gray-500', badgeBg: 'bg-gray-100 text-gray-700' },
        baddebt: { gradient: 'from-purple-50 to-purple-100', icon: 'money_off', title: 'รายละเอียดออเดอร์ (หนี้สูญ)', color: 'text-purple-600', borderColor: 'border-t-purple-500', badgeBg: 'bg-purple-100 text-purple-700' },
        unpaid: { gradient: 'from-orange-50 to-red-50', icon: 'payments', title: 'รายละเอียดออเดอร์ (ค้างชำระ)', color: 'text-orange-600', borderColor: 'border-t-orange-500', badgeBg: 'bg-orange-100 text-orange-700' },
        Pending: { gradient: 'from-yellow-50 to-amber-50', icon: 'hourglass_empty', title: 'รายละเอียดออเดอร์ (รอดำเนินการ)', color: 'text-yellow-600', borderColor: 'border-t-yellow-500', badgeBg: 'bg-yellow-100 text-yellow-700' },
        Preparing: { gradient: 'from-blue-50 to-indigo-50', icon: 'inventory_2', title: 'รายละเอียดออเดอร์ (กำลังจัดเตรียม)', color: 'text-blue-600', borderColor: 'border-t-blue-500', badgeBg: 'bg-blue-100 text-blue-700' },
        Shipping: { gradient: 'from-indigo-50 to-purple-50', icon: 'local_shipping', title: 'รายละเอียดออเดอร์ (กำลังจัดส่ง)', color: 'text-indigo-600', borderColor: 'border-t-indigo-500', badgeBg: 'bg-indigo-100 text-indigo-700' },
        Confirmed: { gradient: 'from-cyan-50 to-blue-50', icon: 'task_alt', title: 'รายละเอียดออเดอร์ (ยืนยันแล้ว)', color: 'text-cyan-600', borderColor: 'border-t-cyan-500', badgeBg: 'bg-cyan-100 text-cyan-700' },
        Packing: { gradient: 'from-purple-50 to-pink-50', icon: 'inventory', title: 'รายละเอียดออเดอร์ (กำลังแพ็ค)', color: 'text-purple-600', borderColor: 'border-t-purple-500', badgeBg: 'bg-purple-100 text-purple-700' },
        Processing: { gradient: 'from-cyan-50 to-teal-50', icon: 'sync', title: 'รายละเอียดออเดอร์ (กำลังดำเนินการ)', color: 'text-cyan-600', borderColor: 'border-t-cyan-500', badgeBg: 'bg-cyan-100 text-cyan-700' },
    };
    
    const getTitle = () => {
        let suffix = "";
        if (statusType === 'delivered') suffix = 'ออเดอร์สำเร็จ';
        else if (statusType === 'returned') suffix = 'ออเดอร์ตีกลับ';
        else if (statusType === 'cancelled') {
            if (cancelTypeId === 1) suffix = 'ออเดอร์ยกเลิก (ก่อนเข้าระบบ)';
            else if (cancelTypeId === 2) suffix = 'ออเดอร์ยกเลิก (หลังเข้าระบบ)';
            else if (cancelTypeId === 3) suffix = 'ออเดอร์ยกเลิก (ปฏิเสธรับของ)';
            else suffix = 'ออเดอร์ยกเลิก (ทั้งใบ และกล่องที่ยกเลิกบางส่วน)';
        }
        else if (statusType === 'baddebt') suffix = 'ออเดอร์หนี้สูญ';
        else if (statusType === 'unpaid') suffix = 'ออเดอร์ค้างชำระ (ส่งสำเร็จ ยังไม่ได้รับเงินครบ หลังหักยอดยกเลิกกล่อง)';
        else if (statusType === 'Pending') suffix = 'ออเดอร์รอดำเนินการ';
        else if (statusType === 'Preparing') suffix = 'ออเดอร์กำลังจัดเตรียม';
        else if (statusType === 'Shipping') suffix = 'ออเดอร์กำลังจัดส่ง';
        else if (statusType === 'Confirmed') suffix = 'ออเดอร์ยืนยันแล้ว';
        else if (statusType === 'Packing') suffix = 'ออเดอร์กำลังแพ็ค';
        else if (statusType === 'Processing') suffix = 'ออเดอร์กำลังดำเนินการ';
        else suffix = 'ออเดอร์สถานะอื่นๆ';
        
        if (salespersonName) return `[${salespersonName}] ${suffix}`;
        if (productName) return `[${productName}] ${suffix}`;
        return suffix;
    };

    const config = statusConfig[statusType] || statusConfig.other;
    const hasNotesColumn = statusType === 'returned' || statusType === 'cancelled';
    const totalCols = hasNotesColumn ? 12 : 11;

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError(null);
        setExpandedOrder(null);
        setOrderItems({});

        const params = new URLSearchParams({
            company_id: companyId,
            department: department,
            month: month,
            year: year,
            status_type: statusType,
        });
        if (productId) params.append('product_id', productId);
        if (salespersonId) params.append('salesperson_id', salespersonId);
        if (cancelTypeId) params.append('cancel_type_id', cancelTypeId);

        // dateRangeParams (วันนี้ / เมื่อวาน / กำหนดวัน) มาเป็น query string สำเร็จรูปแล้ว
        // backend จะให้ค่านี้ override ปี/เดือน เหมือนที่หน้าหลักทำ
        fetch(`./api/reports/other_orders.php?${params}${dateRangeParams}`)
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
    }, [isOpen, productId, salespersonId, department, companyId, month, year, statusType, cancelTypeId, dateRangeParams]);

    const toggleOrderItems = (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
            return;
        }
        setExpandedOrder(orderId);
        if (orderItems[orderId]) return;

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

    const getStatusBadge = (status) => {
        const colors = {
            'Delivered': 'bg-green-100 text-green-700',
            'Returned': 'bg-red-100 text-red-700',
            'Cancelled': 'bg-gray-100 text-gray-600',
            'Pending': 'bg-yellow-100 text-yellow-700',
            'Confirmed': 'bg-blue-100 text-blue-700',
            'Shipping': 'bg-indigo-100 text-indigo-700',
            'Packing': 'bg-purple-100 text-purple-700',
            'Processing': 'bg-cyan-100 text-cyan-700',
        };
        const labels = {
            'Delivered': 'สำเร็จ',
            'Returned': 'ตีกลับ',
            'Cancelled': 'ยกเลิก',
            'Pending': 'รอดำเนินการ',
            'Confirmed': 'ยืนยันแล้ว',
            'Shipping': 'กำลังจัดส่ง',
            'Packing': 'กำลังแพ็ค',
            'Processing': 'กำลังดำเนินการ',
        };
        return {
            className: colors[status] || 'bg-amber-100 text-amber-700',
            label: labels[status] || status
        };
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className={`px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r ${config.gradient} flex-shrink-0`}>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
                            {config.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600 font-medium">
                                {productName ? `สินค้า: ${productName}` : (salespersonName ? `พนักงาน: ${salespersonName}` : 'ทุกสินค้า')}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">{department}</span>
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
                            <div className={`w-8 h-8 border-4 border-amber-200 ${config.borderColor} rounded-full animate-spin`}></div>
                            <p className="mt-4 text-gray-500 text-sm">กำลังโหลด...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <p className="text-red-500 font-bold">{error}</p>
                        </div>
                    ) : data && data.orders.length > 0 ? (
                        <>
                            {/* Sticky: Status Summary + Summary Bar */}
                            <div className="sticky top-0 z-10 bg-white px-6 pt-5 pb-3 border-b border-gray-100 shadow-sm flex-shrink-0">
                                {/* Status Summary Cards */}
                                {data.status_summary.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mb-3">
                                        {data.status_summary.map((s, i) => {
                                            const badge = getStatusBadge(s.status);
                                            return (
                                                <div key={i} className={`px-4 py-2.5 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center gap-3`}>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-gray-800">{s.order_count} ออเดอร์</div>
                                                        <div className="text-[10px] text-gray-400">{s.total_qty} ชิ้น · ฿{formatCurrency(s.total_sales)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Summary Bar */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600">
                                        ทั้งหมด <span className="font-bold text-gray-800">{data.total_count}</span> ออเดอร์
                                        <span className="text-xs text-gray-400 ml-2">(คลิกเพื่อดูสินค้า)</span>
                                    </span>
                                    <span className={`text-sm font-bold ${config.color}`}>
                                        {statusType === 'unpaid' ? 'รวมค้างชำระ' : 'รวม'} ฿{formatCurrency(data.total_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Orders Table — scrollable */}
                            <div className="flex-1 overflow-y-auto px-6 pb-4">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white z-[5]">
                                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                        <th className="px-3 py-3 text-left w-8"></th>
                                        <th className="px-3 py-3 text-left w-8">#</th>
                                        <th className="px-3 py-3 text-left">เลขออเดอร์</th>
                                        <th className="px-3 py-3 text-left">วันที่</th>
                                        <th className="px-3 py-3 text-left">ลูกค้า</th>
                                        <th className="px-3 py-3 text-left">ผู้สร้าง</th>
                                        {hasNotesColumn && (
                                            <th className="px-3 py-3 text-left">{statusType === 'returned' ? 'เหตุผลตีกลับ' : 'หมายเหตุยกเลิก'}</th>
                                        )}
                                        <th className="px-3 py-3 text-center">สถานะ</th>
                                        <th className="px-3 py-3 text-center">ชำระเงิน</th>
                                        <th className="px-3 py-3 text-center">สถานะจ่าย</th>
                                        <th className="px-3 py-3 text-center">จำนวน</th>
                                        <th className="px-3 py-3 text-right">{statusType === 'unpaid' ? 'ค้างชำระ' : 'ยอดเงิน'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.orders.map((order, i) => {
                                        const isOrderExpanded = expandedOrder === order.order_id;
                                        const items = orderItems[order.order_id];
                                        const isItemsLoading = loadingItems === order.order_id;
                                        const badge = getStatusBadge(order.order_status);

                                        return (
                                            <Fragment key={order.order_id}>
                                                <tr
                                                    className={`hover:bg-gray-50/70 transition-colors cursor-pointer ${isOrderExpanded ? 'bg-blue-50/50' : ''}`}
                                                    onClick={() => toggleOrderItems(order.order_id)}
                                                >
                                                    <td className="px-3 py-3">
                                                        <span className={`material-symbols-outlined text-sm text-gray-400 transition-transform ${isOrderExpanded ? 'rotate-90' : ''}`}>
                                                            chevron_right
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                                                    <td className="px-3 py-3 font-mono text-xs font-bold text-primary">{order.order_id}</td>
                                                    <td className="px-3 py-3 text-gray-600 text-xs">{formatDate(order.order_date)}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-sm font-medium text-gray-800">{order.customer_name || '-'}</div>
                                                        {order.customer_phone && (
                                                            <div className="text-[10px] text-gray-400">{order.customer_phone}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="text-xs text-gray-600">{order.creator_name || '-'}</div>
                                                        <div className="text-[10px] text-gray-400">{order.creator_role || ''}</div>
                                                    </td>
                                                    {hasNotesColumn && (() => {
                                                        const isCancelled = statusType === 'cancelled';
                                                        // ตีกลับ: เหตุผลอยู่ที่ระดับกล่อง (order_boxes) — orders.notes ใช้เป็น fallback
                                                        const note = isCancelled
                                                            ? (order.cancel_notes || '')
                                                            : (order.return_note || order.order_notes || '');
                                                        const boxStatuses = (!isCancelled && order.return_status)
                                                            ? order.return_status.split(',').filter(Boolean)
                                                            : [];
                                                        const cellCls = isCancelled ? 'text-gray-600' : 'text-red-600';
                                                        const tooltip = isCancelled ? (note || '') : [
                                                            boxStatuses.map(s => `สภาพ: ${returnStatusInfo(s).label}`).join(', '),
                                                            note,
                                                            order.return_date ? `บันทึกเมื่อ ${formatDate(order.return_date)}` : '',
                                                        ].filter(Boolean).join('\n');
                                                        return (
                                                            <td className="px-3 py-3 max-w-[220px]" title={tooltip} onClick={(e) => e.stopPropagation()}>
                                                                {/* เหตุผลจริง (คลังพิมพ์) — ถ้าไม่มีก็บอกตรงๆ ว่าไม่ได้ระบุ ไม่เอาสภาพมาแทน */}
                                                                {note ? (
                                                                    <div className={`text-xs ${cellCls} line-clamp-2 break-words whitespace-pre-wrap leading-snug`}>
                                                                        {note}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] italic text-gray-300">
                                                                        {isCancelled ? '—' : 'ไม่ได้ระบุเหตุผล'}
                                                                    </span>
                                                                )}
                                                                {boxStatuses.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                                                        <span className="text-[9px] text-gray-400">สภาพ:</span>
                                                                        {boxStatuses.map((s) => {
                                                                            const info = returnStatusInfo(s);
                                                                            return (
                                                                                <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${info.cls}`}>
                                                                                    {info.label}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {isCancelled && order.cancel_type_name && (
                                                                    <div className="text-[9px] text-gray-400 mt-0.5">{order.cancel_type_name}</div>
                                                                )}
                                                            </td>
                                                        );
                                                    })()}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {(() => {
                                                            const pm = order.payment_method;
                                                            const pmMap = {
                                                                'COD': { label: 'COD', cls: 'bg-blue-100 text-blue-700' },
                                                                'Transfer': { label: 'โอน', cls: 'bg-green-100 text-green-700' },
                                                                'PayAfter': { label: 'จ่ายทีหลัง', cls: 'bg-amber-100 text-amber-700' },
                                                                'Claim': { label: 'เคลม', cls: 'bg-purple-100 text-purple-700' },
                                                                'FreeGift': { label: 'ของแถม', cls: 'bg-pink-100 text-pink-700' },
                                                                'DiscountCoupon': { label: 'คูปอง', cls: 'bg-cyan-100 text-cyan-700' },
                                                            };
                                                            const info = pmMap[pm] || { label: pm || '-', cls: 'bg-gray-100 text-gray-500' };
                                                            return <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${info.cls}`}>{info.label}</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {(() => {
                                                            const paid = parseFloat(order.amount_paid) || 0;
                                                            const total = parseFloat(order.total_amount) || 0;
                                                            let info;
                                                            if (paid >= total && total > 0) {
                                                                info = { label: 'จ่ายแล้ว', cls: 'bg-green-100 text-green-700' };
                                                            } else if (paid > 0) {
                                                                info = { label: 'จ่ายบางส่วน', cls: 'bg-amber-100 text-amber-700' };
                                                            } else {
                                                                info = { label: 'ยังไม่จ่าย', cls: 'bg-red-100 text-red-600' };
                                                            }
                                                            return <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${info.cls}`}>{info.label}</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold">{order.item_qty}</td>
                                                    <td className={`px-3 py-3 text-right font-bold ${config.color}`}
                                                        title={statusType === 'unpaid'
                                                            ? `ยอดสินค้าหลังหัก waive (ของคุณ): ฿${formatCurrency(order.item_total)}\nยอดออเดอร์เต็ม: ฿${formatCurrency(order.total_amount)}\nรับเงินแล้ว (amount_paid): ฿${formatCurrency(order.amount_paid)}\nยอดยกเลิกกล่อง (waive): ฿${formatCurrency(order.waived_total)}\nค้างจริง: ฿${formatCurrency(Math.max(0, (order.total_amount || 0) - (order.amount_paid || 0) - (order.waived_total || 0)))}\nสัดส่วนของคุณ: ฿${formatCurrency(order.unpaid_share)}`
                                                            : (statusType === 'cancelled' && order.waived_total > 0
                                                                ? `ยอดยกเลิกเต็ม (ไม่หัก waive): ฿${formatCurrency(order.item_total)}\nยอด waive ของกล่อง: ฿${formatCurrency(order.waived_total)}`
                                                                : (order.waived_total > 0
                                                                    ? `ยอดหลังหักยกเลิกกล่อง: ฿${formatCurrency(order.item_total)}\nยอดยกเลิกกล่อง (waive): ฿${formatCurrency(order.waived_total)}`
                                                                    : ''))}>
                                                        <div>฿{formatCurrency(statusType === 'unpaid' ? order.unpaid_share : order.item_total)}</div>
                                                        {order.waived_total > 0 && statusType === 'cancelled' && (
                                                            <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                                                                มีกล่องยกเลิก
                                                            </div>
                                                        )}
                                                        {order.waived_total > 0 && statusType !== 'cancelled' && (
                                                            <div className="text-[10px] font-bold text-rose-500 mt-0.5">
                                                                ยกเลิกกล่อง −฿{formatCurrency(order.waived_total)}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded: Product details */}
                                                {isOrderExpanded && (
                                                    <tr key={`${order.order_id}-items`}>
                                                <td colSpan={totalCols} className="px-0 py-0">
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
                                                                                    <th className="px-4 py-2 text-center">จำนวน</th>
                                                                                    <th className="px-4 py-2 text-right">ราคา/หน่วย</th>
                                                                                    <th className="px-4 py-2 text-right">รวม</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                {items.map((item) => {
                                                                                    const isHighlighted = productId && String(item.product_id) === String(productId);
                                                                                    const boxCancelled = String(item.box_status || '').toUpperCase() === 'CANCELLED';
                                                                                    const itemWaived = (item.waived_amount || 0) > 0;
                                                                                    const fullyWaived = itemWaived && item.collection_amount > 0 && item.waived_amount >= item.collection_amount;
                                                                                    const showWaiveStrike = itemWaived && statusType !== 'cancelled';
                                                                                    return (
                                                                                    <tr key={item.item_id} className={`transition-colors ${isHighlighted ? 'bg-amber-50/80 ring-1 ring-amber-200/60' : 'opacity-60 hover:opacity-100 hover:bg-white/60'}`}>
                                                                                        <td className={`px-4 py-2 font-medium ${isHighlighted ? 'text-amber-900 font-bold' : 'text-gray-800'}`}>
                                                                                            {isHighlighted && <span className="material-symbols-outlined text-amber-500 text-xs mr-1 align-middle">star</span>}
                                                                                            {item.product_name}
                                                                                            {item.is_freebie === 1 && (
                                                                                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">ฟรี</span>
                                                                                            )}
                                                                                            {boxCancelled && (
                                                                                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full font-bold">ยกเลิกกล่อง</span>
                                                                                            )}
                                                                                            {!boxCancelled && itemWaived && (
                                                                                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold">
                                                                                                    {fullyWaived ? 'ยกเลิกกล่องทั้งก้อน' : `ยกเลิกกล่อง −฿${formatCurrency(item.waived_amount)}`}
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 font-mono text-gray-400">{item.product_sku || '-'}</td>
                                                                                        <td className={`px-4 py-2 text-center font-bold ${isHighlighted ? 'text-amber-700' : ''}`}>{item.quantity}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-600">฿{formatCurrency(item.unit_price)}</td>
                                                                                        <td className={`px-4 py-2 text-right font-bold ${isHighlighted ? 'text-amber-700' : 'text-gray-800'}`}>
                                                                                            {showWaiveStrike ? (
                                                                                                <div>
                                                                                                    <div className="line-through text-gray-400 font-medium">฿{formatCurrency(item.net_total)}</div>
                                                                                                    <div className="text-rose-600">฿{formatCurrency(item.net_after_waive)}</div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <>฿{formatCurrency(item.net_total)}</>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                        {order.waived_total > 0 && statusType === 'cancelled' && (
                                                                            <div className="px-4 py-2.5 bg-gray-100/80 border-t border-gray-200 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px]">
                                                                                <span className="text-gray-500">รวมสินค้า ฿{formatCurrency(items.reduce((s, it) => s + (it.net_total || 0), 0))}</span>
                                                                                <span className={`font-bold ${config.color}`}>ยอดยกเลิกในรายงาน (เต็ม) ฿{formatCurrency(order.item_total)}</span>
                                                                            </div>
                                                                        )}
                                                                        {order.waived_total > 0 && statusType !== 'cancelled' && (
                                                                            <div className="px-4 py-2.5 bg-rose-50/80 border-t border-rose-100 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px]">
                                                                                <span className="text-gray-500">รวมสินค้า ฿{formatCurrency(items.reduce((s, it) => s + (it.net_total || 0), 0))}</span>
                                                                                <span className="font-bold text-rose-600">ยกเลิกกล่อง −฿{formatCurrency(order.waived_total)}</span>
                                                                                <span className={`font-bold ${config.color}`}>ยอดในรายงาน ฿{formatCurrency(statusType === 'unpaid' ? order.unpaid_share : order.item_total)}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className="py-4 text-center text-xs text-gray-400">ไม่พบรายการสินค้า</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
                            <p className="mt-2 text-gray-400 text-sm">ไม่มีออเดอร์ในหมวดนี้</p>
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

export default OtherOrdersModal;

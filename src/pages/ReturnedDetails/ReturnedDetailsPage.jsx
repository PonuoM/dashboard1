import { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/UI';

const ReturnedDetailsPage = ({ user }) => {
    // Current date logic for defaults
    const currentDate = new Date();
    
    // Check if we have saved filter state
    const savedMonth = sessionStorage.getItem('returnedDetails_month');
    const savedYear = sessionStorage.getItem('returnedDetails_year');

    const [month, setMonth] = useState(savedMonth ? parseInt(savedMonth) : currentDate.getMonth() + 1);
    const [year, setYear] = useState(savedYear ? parseInt(savedYear) : currentDate.getFullYear());
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const months = [
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const years = [];
    for (let y = currentDate.getFullYear(); y >= 2024; y--) {
        years.push(y);
    }

    useEffect(() => {
        sessionStorage.setItem('returnedDetails_month', month.toString());
        sessionStorage.setItem('returnedDetails_year', year.toString());
    }, [month, year]);

    useEffect(() => {
        fetchData();
    }, [month, year, user.company_id]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiYear = year > 2500 ? year - 543 : year;
            const params = new URLSearchParams({
                company_id: user.company_id,
                month: month,
                year: apiYear,
            });
            const response = await fetch(`./api/reports/returned_orders_report.php?${params}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (!result.success || !result.data || !result.data.by_salesperson) {
                setData([]);
                return;
            }

            // Flatten data for table rendering
            const flatData = [];
            result.data.by_salesperson.forEach(person => {
                person.orders.forEach(order => {
                    const baseData = {
                        sales_name: person.sales_name || '',
                        sales_phone: person.sales_phone || '',
                        customer_name: order.customer_name || '',
                        customer_phone: order.customer_phone || '',
                        order_id: order.order_id || '',
                        net_total: order.net_total || 0,
                        products: order.products || '',
                        order_date: order.order_date || '',
                        delivery_date: order.delivery_date || '',
                    };

                    if (order.call_matches && order.call_matches.length > 0) {
                        order.call_matches.forEach(call => {
                            flatData.push({
                                ...baseData,
                                call_from: call.call_from || '',
                                call_to: call.call_to || '',
                                call_date: call.call_date ? call.call_date.split('T')[0] : '',
                                start_time: call.start_time || '',
                                duration: call.duration || '',
                                status: call.status || '',
                                charging_group: call.charging_group || ''
                            });
                        });
                    } else {
                        flatData.push({
                            ...baseData,
                            call_from: '',
                            call_to: '',
                            call_date: '',
                            start_time: '',
                            duration: '',
                            status: '',
                            charging_group: ''
                        });
                    }
                });
            });
            setData(flatData);

        } catch (err) {
            console.error('Fetch returned details error:', err);
            setError('เกิดข้อผิดพลาดในการดึงข้อมูลรายการตีกลับ');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) return;
        
        const headers = [
            'ชื่อพนักงาน',
            'เบอร์พนักงาน',
            'ชื่อลูกค้า',
            'เบอร์ลูกค้า',
            'รหัสออเดอร์',
            'ยอดเงิน',
            'สินค้า',
            'วันที่สร้างออเดอร์',
            'วันที่ส่ง',
            'เบอร์โทรเข้า/ออก',
            'เบอร์ปลายทาง',
            'วันที่โทร',
            'เวลาโทร',
            'ระยะเวลาสาย',
            'สถานะสาย (1=รับสาย)',
            'รหัสไฟล์เสียง (charging_group)'
        ];

        const rows = [];
        rows.push(headers.map(h => `"${h}"`).join(','));

        data.forEach(row => {
            const rowData = [
                `"${row.sales_name}"`,
                `"${row.sales_phone}"`,
                `"${row.customer_name}"`,
                `"${row.customer_phone}"`,
                `"${row.order_id}"`,
                row.net_total,
                `"${row.products}"`,
                `"${row.order_date}"`,
                `"${row.delivery_date}"`,
                `"${row.call_from}"`,
                `"${row.call_to}"`,
                `"${row.call_date}"`,
                `"${row.start_time}"`,
                `"${row.duration}"`,
                `"${row.status}"`,
                `"${row.charging_group}"`
            ];
            rows.push(rowData.join(','));
        });

        const apiYear = year > 2500 ? year - 543 : year;
        const csvContent = '\uFEFF' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Returned_Orders_Details_${apiYear}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">รายละเอียดตีกลับ</h2>
                    <p className="text-sm text-gray-500 mt-1">ข้อมูลออเดอร์ที่ถูกตีกลับพร้อมรายละเอียดบันทึกการโทร</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="w-full sm:w-48">
                        <CustomSelect
                            label="เดือน"
                            options={months}
                            value={month}
                            onChange={(val) => setMonth(parseInt(val))}
                        />
                    </div>
                    <div className="w-full sm:w-32">
                        <CustomSelect
                            label="ปี"
                            options={years.map(y => ({ value: y, label: y + 543 }))}
                            value={year}
                            onChange={(val) => setYear(parseInt(val))}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={loading || data.length === 0}
                        className="btn-primary w-full sm:w-auto whitespace-nowrap h-[42px] mt-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 text-gray-500">
                        <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                        <p>ไม่มีข้อมูลสำหรับเดือน/ปีที่เลือก</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar max-h-[800px]">
                        <table className="w-full relative">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-20 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 w-32">ชื่อพนักงาน</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">เบอร์พนักงาน</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 border-l border-gray-200">ชื่อลูกค้า</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">เบอร์ลูกค้า</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">รหัสออเดอร์</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">ยอดเงิน</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 min-w-[150px]">สินค้า</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">วันที่ออเดอร์</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 border-r-2 border-gray-300">วันที่ส่ง</th>
                                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 bg-orange-50/50">เวลาโทร</th>
                                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 bg-orange-50/50">สถานะสาย</th>
                                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-10 min-w-[200px] bg-orange-50/50">ฟังเสียง</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, index) => (
                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors duration-150 group">
                                        <td className="py-2 px-3 text-xs text-gray-800 font-medium sticky left-0 bg-white group-hover:bg-blue-50/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 z-10">{row.sales_name}</td>
                                        <td className="py-2 px-3 text-xs text-gray-600">{row.sales_phone}</td>
                                        <td className="py-2 px-3 text-xs text-gray-800 border-l border-gray-100">{row.customer_name}</td>
                                        <td className="py-2 px-3 text-xs text-gray-600">{row.customer_phone}</td>
                                        <td className="py-2 px-3 text-xs text-blue-600 font-medium">{row.order_id}</td>
                                        <td className="py-2 px-3 text-xs text-gray-800 text-right font-medium">฿{Number(row.net_total).toLocaleString()}</td>
                                        <td className="py-2 px-3 text-xs text-gray-600 truncate max-w-[150px]" title={row.products}>{row.products}</td>
                                        <td className="py-2 px-3 text-xs text-gray-600">{row.order_date}</td>
                                        <td className="py-2 px-3 text-xs text-gray-600 border-r-2 border-gray-300">{row.delivery_date}</td>
                                        <td className="py-2 px-3 text-xs text-gray-800 text-right font-medium bg-orange-50/20 group-hover:bg-transparent">{row.duration ? `${row.duration}s` : ''}</td>
                                        <td className="py-2 px-3 text-xs text-center bg-orange-50/20 group-hover:bg-transparent">
                                            {row.status ? (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${row.status.toString() === '1' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {row.status.toString() === '1' ? 'รับสาย' : 'ไม่รับสาย'}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="py-2 px-3 text-xs text-gray-500 bg-orange-50/20 group-hover:bg-transparent min-w-[200px]">
                                            {(row.call_from || row.call_to) && row.call_date ? (
                                                <audio controls preload="none" src={`./api/audio_search.php?phone1=${encodeURIComponent(row.call_from)}&phone2=${encodeURIComponent(row.call_to)}&date=${encodeURIComponent(row.call_date)}&company_id=${user.company_id}&time=${encodeURIComponent(row.start_time || '')}`} className="h-8 w-48 shadow-sm rounded-full" />
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Total Count */}
            {!loading && data.length > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-500 px-2 pb-4">
                    <p>แสดงข้อมูลทั้งหมด <span className="font-bold text-gray-800">{data.length}</span> รายการ</p>
                </div>
            )}
        </div>
    );
};

export default ReturnedDetailsPage;

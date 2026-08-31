import { useState, useEffect } from 'react';
import CustomSelect from '../../components/UI/CustomSelect';
import MultiSelect from '../../components/UI/MultiSelect';
import DateRangeFilter from '../../components/UI/DateRangeFilter';
import useDateRange from '../../hooks/useDateRange';

export function ProductAnalysisPage({ user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('value'); // 'value' or 'quantity'
    const [pivotViewMode, setPivotViewMode] = useState('value'); // 'value' or 'quantity' for pivot table
    const [distViewMode, setDistViewMode] = useState('count'); // 'count' or 'percent' for distribution table
    const [distSelectedMonths, setDistSelectedMonths] = useState([]); // independent month filter for distribution card; [] = all year
    const [distShowTop10, setDistShowTop10] = useState(false); // show only top 10 products
    const [distSelectedYear, setDistSelectedYear] = useState(() => {
        const saved = sessionStorage.getItem('productAnalysis_distYear');
        return saved ? parseInt(saved) : 2026;
    });
    const [distYearData, setDistYearData] = useState(null); // independent fetch result if year differs from page

    // Initialize from sessionStorage
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = sessionStorage.getItem('productAnalysis_year');
        return saved ? parseInt(saved) : 2026;
    });
    const [selectedMonths, setSelectedMonths] = useState(() => {
        const saved = sessionStorage.getItem('productAnalysis_months');
        return saved ? JSON.parse(saved) : [new Date().getMonth() + 1];
    });
    const [selectedDepartment, setSelectedDepartment] = useState(() => {
        const saved = sessionStorage.getItem('productAnalysis_department');
        return saved || 'all';
    });
    // ดูเฉพาะรายบุคคล — เก็บเป็น string ('all' หรือ id พนักงาน)
    const [selectedSalesperson, setSelectedSalesperson] = useState(() => {
        return sessionStorage.getItem('productAnalysis_salesperson') || 'all';
    });

    // Date range filter (วันนี้ / เมื่อวาน / กำหนดวัน) — overrides year/month when active
    const dateRange = useDateRange('productAnalysis');

    const formatCurrency = (value) => {
        if (!value || value === 0) return '-';
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toLocaleString('th-TH');
    };

    const formatFullCurrency = (value) => {
        return (value || 0).toLocaleString('th-TH');
    };

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('productAnalysis_year', selectedYear.toString());
        sessionStorage.setItem('productAnalysis_months', JSON.stringify(selectedMonths));
        sessionStorage.setItem('productAnalysis_department', selectedDepartment);
        sessionStorage.setItem('productAnalysis_salesperson', selectedSalesperson);
    }, [selectedYear, selectedMonths, selectedDepartment, selectedSalesperson]);

    useEffect(() => {
        fetchData();
    }, [selectedYear, selectedDepartment, selectedSalesperson, dateRange.key]);

    // Save dist year + fetch independently when it differs from page year
    useEffect(() => {
        sessionStorage.setItem('productAnalysis_distYear', distSelectedYear.toString());
        if (distSelectedYear === selectedYear) {
            setDistYearData(null); // use main data
            return;
        }
        const fetchDistYear = async () => {
            try {
                const params = new URLSearchParams({
                    company_id: user?.company_id || 1,
                    year: distSelectedYear,
                    department: selectedDepartment,
                    salesperson: selectedSalesperson,
                    user_id: user?.id || ''
                });
                const response = await fetch(`./api/reports/product_analysis.php?${params}`);
                const result = await response.json();
                if (result.success) {
                    setDistYearData(result.data.qty_distribution || []);
                }
            } catch (err) {
                console.error('Failed to fetch dist year data', err);
            }
        };
        fetchDistYear();
    }, [distSelectedYear, selectedDepartment, selectedYear, selectedSalesperson]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                company_id: user?.company_id || 1,
                year: selectedYear,
                department: selectedDepartment,
                salesperson: selectedSalesperson,
                user_id: user?.id || ''
            });
            if (dateRange.active) {
                params.set('start_date', dateRange.startParam);
                params.set('end_date', dateRange.endParam);
            }
            const response = await fetch(`./api/reports/product_analysis.php?${params}`);
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate max value for bar chart scaling
    const getBarHeight = (value, max) => {
        if (!max || max === 0) return 10;
        return Math.max(10, (value / max) * 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-primary animate-spin">progress_activity</span>
                    <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-red-400">error</span>
                    <p className="mt-4 text-red-500">{error}</p>
                </div>
            </div>
        );
    }

    // Mock data for now - will be replaced by API
    const mockData = data || {
        summary: {
            bio_sales: 261350,
            bio_growth: 12.4,
            fertilizer_sales: 88650,
            fertilizer_growth: 0,
            total_sales: 350000
        },
        by_customer_type: [
            { category: 'ชีวภัณฑ์', new_sales: 150000, new_qty: 50, reorder_sales: 111350, reorder_qty: 30 },
            { category: 'ปุ๋ย', new_sales: 50000, new_qty: 100, reorder_sales: 38650, reorder_qty: 80 }
        ],
        monthly_products: [
            { product_name: 'ปุ๋ย แสงราชสีห์', monthly: [45000, 48000, 51000, 59000, 54000, 52000, 61000, 63000, 59000, 0, 0, 0], total: 492000 },
            { product_name: 'ปุ๋ยกินกับอะไรก็อร่อย', monthly: [12000, 13500, 14000, 15500, 18000, 16500, 17000, 19000, 21000, 0, 0, 0], total: 146500 }
        ],
        category_performance: [
            { category: 'ชีวภัณฑ์', monthly: [40, 60, 45, 85, 70, 95], growth: 12.4 },
            { category: 'ปุ๋ย', monthly: [60, 55, 65, 80, 75, 70], growth: 0 }
        ],
        employees: [
            { id: 'all', name: 'ทุกคน' }
        ]
    };

    // Compute filtered values based on selectedMonths
    // เมื่ออยู่โหมดช่วงวัน ข้อมูลถูกกรองที่ backend แล้ว จึงไม่กรองเดือนซ้ำฝั่ง client
    const activeMonths = (dateRange.active || selectedMonths.length === 0)
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        : selectedMonths;

    const sumMonths = (arr) => activeMonths.reduce((sum, m) => sum + (arr?.[m - 1] || 0), 0);

    const filteredSummary = (() => {
        if (!mockData.category_performance) return mockData.summary;
        const bioPerf = mockData.category_performance.find(c => c.category === 'ชีวภัณฑ์');
        const fertPerf = mockData.category_performance.find(c => c.category === 'ปุ๋ย');
        const otherPerf = mockData.category_performance.find(c => c.category === 'อื่นๆ');
        const bioSales = sumMonths(bioPerf?.monthly_raw);
        const fertSales = sumMonths(fertPerf?.monthly_raw);
        const otherSales = sumMonths(otherPerf?.monthly_raw);
        return {
            ...mockData.summary,
            bio_sales: bioSales,
            fertilizer_sales: fertSales,
            other_sales: otherSales,
            total_sales: bioSales + fertSales + otherSales
        };
    })();

    const filteredCustomerType = (() => {
        if (!mockData.by_customer_type_monthly) return mockData.by_customer_type;
        return mockData.by_customer_type_monthly
            .map(item => ({
                category: item.category,
                new_sales: sumMonths(item.new_monthly),
                new_qty: sumMonths(item.new_qty_monthly),
                reorder_sales: sumMonths(item.reorder_monthly),
                reorder_qty: sumMonths(item.reorder_qty_monthly),
            }))
            .filter(item => item.new_sales > 0 || item.reorder_sales > 0);
    })();

    const distRaw = distYearData !== null ? distYearData : (mockData.qty_distribution || []);

    // Compute distData based on independent distSelectedMonths
    const distActiveMonths = distSelectedMonths.length === 0
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        : distSelectedMonths;

    // First pass: aggregate per-product and collect all qty values in scope
    const allQtysSet = new Set();
    const distData = distRaw
        .map(item => {
            const qtyCounts = {}; // {qtyValue: count}
            let totalOrders = 0;
            let totalQty = 0;

            distActiveMonths.forEach(m => {
                const md = item.monthly?.[m] || {};
                const qtys = md.qtys || {};
                Object.entries(qtys).forEach(([q, c]) => {
                    const qNum = parseInt(q);
                    const cNum = parseInt(c) || 0;
                    if (cNum > 0) {
                        qtyCounts[qNum] = (qtyCounts[qNum] || 0) + cNum;
                        allQtysSet.add(qNum);
                    }
                });
                totalOrders += (md._orders || 0);
                totalQty += (md._qty || 0);
            });

            // Find mode (the qty with the highest order count)
            let mode = null;
            let maxCount = 0;
            Object.entries(qtyCounts).forEach(([q, c]) => {
                if (c > maxCount) {
                    maxCount = c;
                    mode = parseInt(q);
                }
            });

            return {
                product_name: item.product_name,
                qtyCounts,
                total_orders: totalOrders,
                avg: totalOrders > 0 ? totalQty / totalOrders : 0,
                mode,
            };
        })
        .filter(item => item.total_orders > 0)
        .sort((a, b) => b.total_orders - a.total_orders);

    // All unique qty values sorted ascending — these become columns
    const distBuckets = [...allQtysSet].sort((a, b) => a - b);

    const distDataDisplayed = distShowTop10 ? distData.slice(0, 10) : distData;

    const toggleDistMonth = (m) => {
        if (distSelectedMonths.includes(m)) {
            setDistSelectedMonths(distSelectedMonths.filter(x => x !== m));
        } else {
            setDistSelectedMonths([...distSelectedMonths, m]);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analytics</span>
                        <span className="material-symbols-outlined text-xs text-gray-400">chevron_right</span>
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Product Analysis</span>
                    </div>
                    <h1 className="text-2xl font-bold font-kanit text-gray-800">
                        วิเคราะห์ผลิตภัณฑ์ / Product Analysis
                    </h1>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <DateRangeFilter value={dateRange} />
                    <div className={`flex items-center gap-3 flex-wrap ${dateRange.active ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CustomSelect
                            value={selectedDepartment}
                            onChange={(val) => {
                                setSelectedDepartment(val);
                                setSelectedSalesperson('all'); // รายชื่อพนักงานเปลี่ยนตามแผนก จึงรีเซ็ต
                            }}
                            options={[
                                { value: 'all', label: 'ทั้งหมด' },
                                { value: 'telesale', label: 'Telesale' },
                                { value: 'admin', label: 'Admin Page' },
                                { value: 'others', label: 'Others' }
                            ]}
                        />
                        <CustomSelect
                            value={selectedSalesperson}
                            onChange={(val) => setSelectedSalesperson(val)}
                            options={[
                                { value: 'all', label: 'ดูเฉพาะรายบุคคล: ทุกคน' },
                                ...(mockData.employees || [])
                                    .filter(e => e.id !== 'all')
                                    .map(e => ({ value: String(e.id), label: e.name }))
                            ]}
                        />
                        <MultiSelect
                            value={selectedMonths}
                            onChange={setSelectedMonths}
                            options={thaiMonths.map((m, i) => ({ value: i + 1, label: m }))}
                            placeholder="เดือน"
                            allLabel="ทุกเดือน"
                            showAllOption={true}
                        />
                        <CustomSelect
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            options={[
                                { value: 2026, label: 'ปี 2026' },
                                { value: 2025, label: 'ปี 2025' }
                            ]}
                        />
                    </div>
                    <button className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export
                    </button>
                </div>
            </div>

            {/* Performance Charts - 3 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bio Products Chart */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-gray-500 font-kanit uppercase tracking-tight">
                            ชีวภัณฑ์ Performance
                        </h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${mockData.summary.bio_growth >= 0
                            ? 'text-green-600 bg-green-50'
                            : 'text-red-500 bg-red-50'
                            }`}>
                            {mockData.summary.bio_growth >= 0 ? '+' : ''}{mockData.summary.bio_growth}%
                        </span>
                    </div>
                    <div className="flex items-end gap-1 h-28">
                        {(mockData.category_performance?.[0]?.monthly_raw || Array(12).fill(0)).map((val, idx) => {
                            const maxVal = Math.max(...(mockData.category_performance?.[0]?.monthly_raw || [1]));
                            const height = maxVal > 0 ? Math.max(5, (val / maxVal) * 100) : 5;
                            const monthNum = idx + 1;
                            const isSelected = selectedMonths.length === 0 || selectedMonths.includes(monthNum);
                            return (
                                <div
                                    key={idx}
                                    className={`flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-pointer ${isSelected
                                        ? 'bg-gradient-to-t from-primary to-primary/60'
                                        : 'bg-gray-200'
                                        }`}
                                    style={{ height: `${height}%` }}
                                    title={`${thaiMonths[idx]}: ฿${formatFullCurrency(val)}`}
                                    onClick={() => {
                                        if (selectedMonths.includes(monthNum)) {
                                            const newMonths = selectedMonths.filter(m => m !== monthNum);
                                            setSelectedMonths(newMonths.length === 0 ? [] : newMonths);
                                        } else {
                                            setSelectedMonths([...selectedMonths.filter(m => m !== 'all'), monthNum]);
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-gray-400 font-bold">
                        {thaiMonths.map((m, i) => (
                            <span key={i} className={selectedMonths.includes(i + 1) ? 'text-primary font-bold' : ''}>
                                {m.replace('.', '')}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-2xl font-bold font-kanit text-gray-800">
                        ฿{formatFullCurrency(filteredSummary.bio_sales)}
                    </p>
                </div>

                {/* Fertilizer Chart */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-gray-500 font-kanit uppercase tracking-tight">
                            ปุ๋ย Performance
                        </h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${mockData.summary.fertilizer_growth >= 0
                            ? 'text-green-600 bg-green-50'
                            : 'text-red-500 bg-red-50'
                            }`}>
                            {mockData.summary.fertilizer_growth >= 0 ? '+' : ''}{mockData.summary.fertilizer_growth}%
                        </span>
                    </div>
                    <div className="flex items-end gap-1 h-28">
                        {(mockData.category_performance?.[1]?.monthly_raw || Array(12).fill(0)).map((val, idx) => {
                            const maxVal = Math.max(...(mockData.category_performance?.[1]?.monthly_raw || [1]));
                            const height = maxVal > 0 ? Math.max(5, (val / maxVal) * 100) : 5;
                            const monthNum = idx + 1;
                            const isSelected = selectedMonths.length === 0 || selectedMonths.includes(monthNum);
                            return (
                                <div
                                    key={idx}
                                    className={`flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-pointer ${isSelected
                                        ? 'bg-gradient-to-t from-primary to-primary/60'
                                        : 'bg-gray-200'
                                        }`}
                                    style={{ height: `${height}%` }}
                                    title={`${thaiMonths[idx]}: ฿${formatFullCurrency(val)}`}
                                    onClick={() => {
                                        if (selectedMonths.includes(monthNum)) {
                                            const newMonths = selectedMonths.filter(m => m !== monthNum);
                                            setSelectedMonths(newMonths.length === 0 ? [] : newMonths);
                                        } else {
                                            setSelectedMonths([...selectedMonths.filter(m => m !== 'all'), monthNum]);
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-gray-400 font-bold">
                        {thaiMonths.map((m, i) => (
                            <span key={i} className={selectedMonths.includes(i + 1) ? 'text-primary font-bold' : ''}>
                                {m.replace('.', '')}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-2xl font-bold font-kanit text-gray-800">
                        ฿{formatFullCurrency(filteredSummary.fertilizer_sales)}
                    </p>
                </div>

                {/* Total Sales Chart */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-gray-500 font-kanit uppercase tracking-tight">
                            ยอดขายรวม
                        </h3>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            Active
                        </span>
                    </div>
                    <div className="flex items-end gap-1 h-28">
                        {(() => {
                            // Combine both categories for total
                            const bioData = mockData.category_performance?.[0]?.monthly_raw || Array(12).fill(0);
                            const fertData = mockData.category_performance?.[1]?.monthly_raw || Array(12).fill(0);
                            const totalData = bioData.map((v, i) => v + (fertData[i] || 0));
                            const maxVal = Math.max(...totalData) || 1;
                            return totalData.map((val, idx) => {
                                const height = maxVal > 0 ? Math.max(5, (val / maxVal) * 100) : 5;
                                const monthNum = idx + 1;
                                const isSelected = selectedMonths.length === 0 || selectedMonths.includes(monthNum);
                                return (
                                    <div
                                        key={idx}
                                        className={`flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-pointer ${isSelected
                                            ? 'bg-gradient-to-t from-primary to-primary/60'
                                            : 'bg-gray-200'
                                            }`}
                                        style={{ height: `${height}%` }}
                                        title={`${thaiMonths[idx]}: ฿${formatFullCurrency(val)}`}
                                        onClick={() => {
                                            if (selectedMonths.includes(monthNum)) {
                                                const newMonths = selectedMonths.filter(m => m !== monthNum);
                                                setSelectedMonths(newMonths.length === 0 ? [] : newMonths);
                                            } else {
                                                setSelectedMonths([...selectedMonths.filter(m => m !== 'all'), monthNum]);
                                            }
                                        }}
                                    />
                                );
                            });
                        })()}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-gray-400 font-bold">
                        {thaiMonths.map((m, i) => (
                            <span key={i} className={selectedMonths.includes(i + 1) ? 'text-primary font-bold' : ''}>
                                {m.replace('.', '')}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-2xl font-bold font-kanit text-gray-800">
                        ฿{formatFullCurrency(filteredSummary.total_sales)}
                    </p>
                </div>
            </div>

            {/* Sales by Customer Type Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 font-kanit">
                        ยอดขายตามประเภทลูกค้า / Sales by Customer Type
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('quantity')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${viewMode === 'quantity'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            จำนวน (ชิ้น)
                        </button>
                        <button
                            onClick={() => setViewMode('value')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${viewMode === 'value'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            มูลค่า (฿)
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4 border-b border-gray-100">หมวดหมู่</th>
                                <th className="px-6 py-4 border-b border-gray-100">ลูกค้าใหม่</th>
                                <th className="px-6 py-4 border-b border-gray-100">รีออเดอร์</th>
                                <th className="px-6 py-4 border-b border-gray-100 text-right">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium font-kanit">
                            {filteredCustomerType.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 border-b border-gray-100">{row.category}</td>
                                    <td className="px-6 py-4 border-b border-gray-100">
                                        {viewMode === 'value'
                                            ? `฿${formatFullCurrency(row.new_sales)}`
                                            : formatFullCurrency(row.new_qty)
                                        }
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-100">
                                        {viewMode === 'value'
                                            ? `฿${formatFullCurrency(row.reorder_sales)}`
                                            : formatFullCurrency(row.reorder_qty)
                                        }
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-100 text-right font-bold">
                                        {viewMode === 'value'
                                            ? `฿${formatFullCurrency(row.new_sales + row.reorder_sales)}`
                                            : formatFullCurrency(row.new_qty + row.reorder_qty)
                                        }
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-primary/5 text-primary">
                                <td className="px-6 py-5 font-bold">ยอดรวมทั้งหมด</td>
                                <td className="px-6 py-5 font-bold">
                                    {viewMode === 'value'
                                        ? `฿${formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.new_sales, 0))}`
                                        : formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.new_qty, 0))
                                    }
                                </td>
                                <td className="px-6 py-5 font-bold">
                                    {viewMode === 'value'
                                        ? `฿${formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.reorder_sales, 0))}`
                                        : formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.reorder_qty, 0))
                                    }
                                </td>
                                <td className="px-6 py-5 text-right font-bold text-lg">
                                    {viewMode === 'value'
                                        ? `฿${formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.new_sales + r.reorder_sales, 0))}`
                                        : formatFullCurrency(filteredCustomerType.reduce((sum, r) => sum + r.new_qty + r.reorder_qty, 0))
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quantity Distribution per Order Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                {/* Card Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 font-kanit text-lg">
                        การกระจายตัวจำนวนต่อออเดอร์ / Order Quantity Distribution
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        ใน 1 ออเดอร์ ลูกค้าซื้อสินค้านี้กี่ชิ้น — <span className="text-primary font-bold">⭐</span> คือจำนวนที่ลูกค้าซื้อบ่อยที่สุด
                    </p>
                </div>

                {/* Independent Filter Bar — single wrapping row with | separators */}
                <div className="px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Year filter */}
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">ปี:</span>
                        {[2026, 2025].map((y) => (
                            <button
                                key={y}
                                onClick={() => setDistSelectedYear(y)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${distSelectedYear === y
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                    }`}
                            >
                                {y}
                            </button>
                        ))}

                        <span className="text-gray-300 font-light mx-2 select-none">|</span>

                        {/* Month filter */}
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">เดือน:</span>
                        <button
                            onClick={() => setDistSelectedMonths([])}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${distSelectedMonths.length === 0
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            ทั้งปี
                        </button>
                        {thaiMonths.map((m, i) => {
                            const monthNum = i + 1;
                            const isActive = distSelectedMonths.includes(monthNum);
                            return (
                                <button
                                    key={i}
                                    onClick={() => toggleDistMonth(monthNum)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${isActive
                                        ? 'bg-primary text-white border-primary shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:bg-primary/5'
                                        }`}
                                >
                                    {m}
                                </button>
                            );
                        })}

                        <span className="text-gray-300 font-light mx-2 select-none">|</span>

                        {/* Display mode */}
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">แสดงผล:</span>
                        <button
                            onClick={() => setDistViewMode('count')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${distViewMode === 'count'
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            จำนวนออเดอร์
                        </button>
                        <button
                            onClick={() => setDistViewMode('percent')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${distViewMode === 'percent'
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            % สัดส่วน
                        </button>

                        <span className="text-gray-300 font-light mx-2 select-none">|</span>

                        {/* Top 10 / All */}
                        <button
                            onClick={() => setDistShowTop10(true)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${distShowTop10
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            Top 10
                        </button>
                        <button
                            onClick={() => setDistShowTop10(false)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${!distShowTop10
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">list</span>
                            ทั้งหมด ({distData.length})
                        </button>
                    </div>
                </div>

                {/* Table — no height lock, show all */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/30">
                                <th className="px-6 py-4 border-b border-gray-100 sticky left-0 bg-gray-50/80 backdrop-blur-sm z-20 min-w-[260px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                                    สินค้า
                                </th>
                                {distBuckets.map((b) => (
                                    <th key={b} className="px-4 py-4 border-b border-gray-100 text-center min-w-[80px]">
                                        {b} ชิ้น
                                    </th>
                                ))}
                                <th className="px-4 py-4 border-b border-gray-100 text-center min-w-[110px] bg-gray-100/80 backdrop-blur-sm sticky right-0 z-20 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                                    รวมออเดอร์
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium font-kanit">
                            {distDataDisplayed.length === 0 ? (
                                <tr>
                                    <td colSpan={distBuckets.length + 2} className="px-6 py-12 text-center text-gray-400">
                                        ไม่มีข้อมูลในช่วงเวลาที่เลือก
                                    </td>
                                </tr>
                            ) : (
                                distDataDisplayed.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-6 py-4 border-b border-gray-100 sticky left-0 bg-white group-hover:bg-primary/5 z-10 font-medium text-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-bold w-5">{idx + 1}</span>
                                                <span>{row.product_name}</span>
                                            </div>
                                        </td>
                                        {distBuckets.map((b) => {
                                            const count = row.qtyCounts?.[b] || 0;
                                            const pct = row.total_orders > 0
                                                ? (count / row.total_orders) * 100
                                                : 0;
                                            const isMode = row.mode === b && count > 0;
                                            return (
                                                <td
                                                    key={b}
                                                    className={`px-4 py-4 border-b border-gray-100 text-center ${isMode
                                                        ? 'bg-primary/10 font-bold text-primary'
                                                        : 'text-gray-700'
                                                        }`}
                                                >
                                                    {count === 0 ? (
                                                        <span className="text-gray-300">-</span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span>
                                                                {isMode && <span className="mr-1">⭐</span>}
                                                                {distViewMode === 'count'
                                                                    ? formatFullCurrency(count)
                                                                    : `${pct.toFixed(1)}%`
                                                                }
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {distViewMode === 'count'
                                                                    ? `${pct.toFixed(0)}%`
                                                                    : formatFullCurrency(count)
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-4 border-b border-gray-100 text-center bg-gray-50/80 group-hover:bg-primary/5 backdrop-blur-sm font-bold text-gray-800 sticky right-0 z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                                            {formatFullCurrency(row.total_orders)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {distData.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex justify-between items-center">
                        <span>
                            แสดง <span className="font-bold text-gray-700">{distDataDisplayed.length}</span> จาก <span className="font-bold text-gray-700">{distData.length}</span> สินค้า
                            {distSelectedMonths.length > 0 && (
                                <span className="ml-2 text-primary">
                                    • เดือน: {distSelectedMonths.map(m => thaiMonths[m - 1]).join(', ')}
                                </span>
                            )}
                        </span>
                        <span>เรียงตามยอดออเดอร์ มาก → น้อย</span>
                    </div>
                )}
            </div>

            {/* Monthly Sales Pivot Table - Glassmorphism Style */}
            <div className="glass-table-container p-6 overflow-hidden">
                {/* Header with toggle buttons */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 font-kanit">
                        ยอดขายรายผลิตภัณฑ์ (รายเดือน)
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPivotViewMode('value')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${pivotViewMode === 'value'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            ยอดขาย (บาท)
                        </button>
                        <button
                            onClick={() => setPivotViewMode('quantity')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${pivotViewMode === 'quantity'
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
                                }`}
                        >
                            จำนวน (ชิ้น)
                        </button>
                    </div>
                </div>

                {/* Glassmorphism Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="glass-header">
                                <th className="p-4 border-b border-white/20 font-medium sticky left-0 glass-sticky-cell z-10">
                                    ชื่อสินค้า
                                </th>
                                <th className="p-4 border-b border-white/20 font-medium text-gray-800">
                                    รวม
                                </th>
                                {thaiMonths.map((month, idx) => (
                                    <th key={idx} className="p-4 border-b border-white/20 font-medium text-gray-600 text-center">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 font-kanit">
                            {mockData.monthly_products.map((product, idx) => {
                                const monthlyData = pivotViewMode === 'value'
                                    ? product.monthly
                                    : (product.monthly_qty || product.monthly.map(() => 0));
                                const totalValue = pivotViewMode === 'value'
                                    ? product.total
                                    : (product.total_qty || monthlyData.reduce((a, b) => a + b, 0));

                                return (
                                    <tr key={idx} className="glass-row-hover border-b border-white/10">
                                        <td className="p-4 font-medium text-gray-800 glass-sticky-cell sticky left-0 z-10">
                                            {product.product_name}
                                        </td>
                                        <td className="p-4 font-bold text-primary">
                                            {pivotViewMode === 'value'
                                                ? `฿${formatFullCurrency(totalValue)}`
                                                : formatFullCurrency(totalValue)
                                            }
                                        </td>
                                        {monthlyData.map((val, mIdx) => (
                                            <td key={mIdx} className="p-4 text-sm text-center">
                                                {val > 0
                                                    ? (pivotViewMode === 'value' ? `฿${formatFullCurrency(val)}` : formatFullCurrency(val))
                                                    : '-'
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {/* Total Row */}
                            <tr className="glass-header border-t-2 border-gray-200">
                                <td className="p-4 font-bold text-gray-800 glass-sticky-cell sticky left-0 z-10">
                                    รวมทั้งหมด
                                </td>
                                <td className="p-4 font-bold text-primary text-lg">
                                    {pivotViewMode === 'value'
                                        ? `฿${formatFullCurrency(mockData.monthly_products.reduce((sum, p) => sum + p.total, 0))}`
                                        : formatFullCurrency(mockData.monthly_products.reduce((sum, p) => sum + (p.total_qty || 0), 0))
                                    }
                                </td>
                                {thaiMonths.map((_, mIdx) => {
                                    const monthTotal = mockData.monthly_products.reduce(
                                        (sum, p) => {
                                            const monthlyData = pivotViewMode === 'value'
                                                ? p.monthly
                                                : (p.monthly_qty || p.monthly.map(() => 0));
                                            return sum + (monthlyData[mIdx] || 0);
                                        }, 0
                                    );
                                    return (
                                        <td key={mIdx} className="p-4 font-bold text-center">
                                            {monthTotal > 0
                                                ? (pivotViewMode === 'value' ? `฿${formatFullCurrency(monthTotal)}` : formatFullCurrency(monthTotal))
                                                : '-'
                                            }
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ProductAnalysisPage;


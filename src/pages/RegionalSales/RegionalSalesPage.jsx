import { useState, useEffect, useRef, useMemo } from 'react';
import * as d3Geo from 'd3-geo';
import { interpolateRgb } from 'd3-interpolate';
import { CustomSelect, DateRangeFilter } from '../../components/UI';
import ProvinceProductsModal from '../../components/Modals/ProvinceProductsModal';
import useDateRange from '../../hooks/useDateRange';

function RegionalSalesPage({ user }) {
    const [geoData, setGeoData] = useState(null);
    const [provinceData, setProvinceData] = useState([]);
    const [provinceSales, setProvinceSales] = useState({});
    const [regionData, setRegionData] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [modalProvince, setModalProvince] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, province: '', sales: 0, orders: 0 });
    const [channelTooltip, setChannelTooltip] = useState({ show: false, x: 0, y: 0, data: null });
    const svgRef = useRef(null);

    // Filters - Initialize from sessionStorage
    const currentDate = new Date();
    const [month, setMonth] = useState(() => {
        const saved = sessionStorage.getItem('regionalSales_month');
        return saved ? parseInt(saved) : currentDate.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const saved = sessionStorage.getItem('regionalSales_year');
        return saved ? parseInt(saved) : currentDate.getFullYear();
    });
    const dateRange = useDateRange('regionalSales');
    const [department, setDepartment] = useState(() => {
        const saved = sessionStorage.getItem('regionalSales_department');
        return saved || 'all';
    });

    // Save filter values to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('regionalSales_month', month.toString());
        sessionStorage.setItem('regionalSales_year', year.toString());
        sessionStorage.setItem('regionalSales_department', department);
    }, [month, year, department]);

    const months = [
        { value: 0, label: 'ทั้งหมด' },
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const departments = [
        { value: 'all', label: 'ทั้งหมด' },
        { value: 'admin', label: 'Admin Page' },
        { value: 'telesale', label: 'Telesale' },
        { value: 'others', label: 'Others' },
    ];

    // Load GeoJSON
    useEffect(() => {
        fetch('/assets/thailand-provinces.geojson')
            .then(res => res.json())
            .then(data => {
                setGeoData(data);
            })
            .catch(err => {
                console.error('Failed to load GeoJSON:', err);
            });
    }, []);

    // Fetch sales data from new API
    useEffect(() => {
        if (!user?.company_id) return;

        const fetchSalesData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    company_id: user.company_id,
                    month: month,
                    year: year,
                    department: department,
                    user_id: user.id || ''
                });
                if (dateRange.active) {
                    params.set('start_date', dateRange.startParam);
                    params.set('end_date', dateRange.endParam);
                }
                const response = await fetch(`./api/reports/regional_sales.php?${params}`);
                if (!response.ok) throw new Error('API Error');
                const result = await response.json();

                if (result.success) {
                    // Store full province data for table
                    setProvinceData(result.data.provinces || []);

                    // Convert to lookup object for map
                    const salesMap = {};
                    (result.data.provinces || []).forEach(p => {
                        salesMap[p.province_name] = {
                            sales: p.total_sales || 0,
                            orders: p.order_count || 0,
                            region: p.region_name
                        };
                    });
                    setProvinceSales(salesMap);
                    setRegionData(result.data.regions || []);
                } else {
                    setError(result.message);
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setError('ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };

        fetchSalesData();
    }, [user?.company_id, month, year, department, dateRange.key]);

    // Calculate max sales for color scale - use log scale for better contrast
    const salesValues = Object.values(provinceSales).map(p => p.sales).filter(s => s > 0);
    const maxSales = Math.max(...salesValues, 10000);
    const minSales = Math.min(...salesValues.filter(s => s > 0), 1000);

    // Color scale for choropleth - use sqrt for better distribution
    // Custom color: light (#e8f5e8) to #80D47C
    const colorInterpolate = interpolateRgb('#e8f5e8', '#80D47C');
    const colorScale = (value) => {
        if (value <= 0) return '#e5e7eb';
        // Use sqrt scale for better color distribution
        const normalized = Math.sqrt(value) / Math.sqrt(maxSales);
        return colorInterpolate(normalized);
    };

    // Get sales for a province
    const getSalesForProvince = (provinceName) => {
        return provinceSales[provinceName]?.sales || 0;
    };

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toString();
    };

    // Provinces sorted by sales (copy to avoid mutating state)
    const sortedProvinces = useMemo(
        () => [...provinceData].sort((a, b) => b.total_sales - a.total_sales),
        [provinceData]
    );

    // Aggregate summary numbers (computed once per data change)
    const summary = useMemo(() => {
        return provinceData.reduce((acc, p) => {
            acc.totalSales += p.total_sales || 0;
            if (p.total_sales > 0) acc.provincesWithSales += 1;
            acc.totalNew += p.new_customer_sales || 0;
            acc.totalReorder += p.reorder_customer_sales || 0;
            acc.totalFert += p.fertilizer_sales || 0;
            acc.totalBio += p.bio_sales || 0;
            acc.totalOther += p.other_category_sales || 0;
            return acc;
        }, {
            totalSales: 0,
            provincesWithSales: 0,
            totalNew: 0,
            totalReorder: 0,
            totalFert: 0,
            totalBio: 0,
            totalOther: 0,
        });
    }, [provinceData]);

    const topProvince = sortedProvinces[0];

    // Render map
    const renderMap = () => {
        if (!geoData) return null;

        const width = 350;
        const height = 420;

        // Use geoIdentity with reflectY for correct orientation
        // and no clip extent to avoid the rectangle issue
        const projection = d3Geo.geoIdentity()
            .reflectY(true)
            .fitExtent([[10, 10], [width - 10, height - 10]], geoData);

        // Create path generator with no clipping
        const pathGenerator = d3Geo.geoPath(projection)
            .projection(projection);

        return (
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="mx-auto"
            >
                <g>
                    {geoData.features.map((feature, idx) => {
                        const provinceName = feature.properties.ADM1_TH;
                        const sales = getSalesForProvince(provinceName);
                        const fillColor = sales > 0 ? colorScale(sales) : '#e5e7eb';
                        const isSelected = selectedProvince === provinceName;
                        const provinceData = provinceSales[provinceName];

                        return (
                            <path
                                key={idx}
                                d={pathGenerator(feature)}
                                fill={fillColor}
                                stroke={isSelected ? '#22c55e' : '#fff'}
                                strokeWidth={isSelected ? 2 : 0.5}
                                className="cursor-pointer transition-all"
                                onClick={() => setSelectedProvince(provinceName)}
                                onMouseEnter={(e) => {
                                    e.target.style.opacity = '0.85';
                                    e.target.style.filter = 'brightness(1.1)';
                                }}
                                onMouseMove={(e) => {
                                    const rect = svgRef.current.getBoundingClientRect();
                                    setTooltip({
                                        show: true,
                                        x: e.clientX - rect.left + 15,
                                        y: e.clientY - rect.top - 10,
                                        province: provinceName,
                                        sales: provinceData?.sales || 0,
                                        orders: provinceData?.orders || 0
                                    });
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.opacity = '1';
                                    e.target.style.filter = 'none';
                                    setTooltip(prev => ({ ...prev, show: false }));
                                }}
                            />
                        );
                    })}
                </g>
            </svg>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-primary">analytics</span>
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Regional Sales</span>
                    </div>
                    <h1 className="text-2xl font-bold font-kanit text-gray-800">
                        ยอดขายตามภูมิภาค / Regional Sales
                    </h1>
                </div>
                {/* Filters */}
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur rounded-xl p-1 border border-gray-200 relative z-50">
                    <CustomSelect
                        value={department}
                        onChange={(val) => setDepartment(val)}
                        options={departments}
                    />
                    <div className="w-px h-6 bg-gray-200"></div>
                    <DateRangeFilter value={dateRange} />
                    <div className={dateRange.active ? 'opacity-50 pointer-events-none flex items-center gap-2' : 'flex items-center gap-2'}>
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
                    </div>
                </div>
            </div>

            {/* Main Content - New 3-Column Layout */}
            <div className="grid grid-cols-12 gap-5">
                {/* Map Section - 4 cols */}
                <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-4">
                    <h3 className="font-bold text-gray-800 text-base font-kanit mb-3">
                        แผนที่ยอดขายตามจังหวัด
                    </h3>

                    {loading ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-gray-500">กำลังโหลดแผนที่...</div>
                        </div>
                    ) : geoData ? (
                        <div className="relative">
                            {renderMap()}

                            {/* Floating Tooltip */}
                            {tooltip.show && (
                                <div
                                    className="absolute pointer-events-none z-50 transition-opacity duration-150"
                                    style={{
                                        left: tooltip.x,
                                        top: tooltip.y,
                                        opacity: tooltip.show ? 1 : 0
                                    }}
                                >
                                    <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl px-4 py-3 border border-gray-100">
                                        <div className="font-bold text-gray-800 font-kanit text-sm mb-2">
                                            {tooltip.province || 'ไม่ทราบชื่อ'}
                                        </div>
                                        {tooltip.sales > 0 ? (
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4 text-xs">
                                                    <span className="text-gray-500">ยอดขาย</span>
                                                    <span className="font-bold text-primary">฿{tooltip.sales.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 text-xs">
                                                    <span className="text-gray-500">ออเดอร์</span>
                                                    <span className="font-medium text-gray-700">{tooltip.orders}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400">ไม่มีข้อมูลยอดขาย</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                                <div className="text-xs font-bold text-gray-600 mb-2">ยอดขาย (บาท)</div>
                                <div className="flex items-center gap-1">
                                    <div className="w-24 h-3 rounded" style={{
                                        background: 'linear-gradient(to right, #e8f5e8, #80D47C)'
                                    }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1 w-24">
                                    <span>0</span>
                                    <span>{formatCurrency(maxSales)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-red-500">ไม่สามารถโหลดแผนที่ได้</div>
                        </div>
                    )}
                </div>

                {/* Insights Section - 4 cols - Single Container */}
                <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-4 space-y-4">
                    {/* Summary Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Total Sales */}
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-1">ยอดขายรวม</div>
                            <div className="text-sm font-bold text-primary">
                                ฿{summary.totalSales.toLocaleString()}
                            </div>
                        </div>
                        {/* Provinces with Sales */}
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-1">จังหวัดที่มียอด</div>
                            <div className="text-sm font-bold text-blue-600">
                                {summary.provincesWithSales} จังหวัด
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* Top Province */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <img src="/icons/championship.png" alt="Top" className="w-5 h-5" />
                            <span className="text-xs font-bold text-gray-600">จังหวัดขายดีที่สุด</span>
                        </div>
                        {topProvince && (
                            <div>
                                <div className="font-bold text-gray-800">{topProvince.province_name}</div>
                                <div className="text-sm text-primary font-bold">
                                    ฿{topProvince.total_sales?.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    {topProvince.order_count} ออเดอร์
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* New vs Reorder */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <img src="/icons/customer.png" alt="Customer" className="w-5 h-5" />
                            <span className="text-xs font-bold text-gray-600">ลูกค้าใหม่ vs รีออเดอร์</span>
                        </div>
                        {(() => {
                            const totalNew = summary.totalNew;
                            const totalReorder = summary.totalReorder;
                            const total = totalNew + totalReorder;
                            const newPercent = total > 0 ? ((totalNew / total) * 100).toFixed(1) : 0;
                            const reorderPercent = total > 0 ? ((totalReorder / total) * 100).toFixed(1) : 0;
                            return (
                                <div className="space-y-2">
                                    {/* Labels row */}
                                    <div className="flex justify-between items-end">
                                        {/* Left - New */}
                                        <div className="text-left">
                                            <div className="text-[10px] text-gray-400">ลูกค้าใหม่</div>
                                            <div className="text-sm font-bold text-blue-600">฿{totalNew.toLocaleString()}</div>
                                        </div>
                                        {/* Right - Reorder */}
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-400">รีออเดอร์</div>
                                            <div className="text-sm font-bold text-red-500">฿{totalReorder.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    {/* Dual color progress bar */}
                                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                        {/* Blue - New */}
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                                            style={{ width: `${newPercent}%` }}
                                        ></div>
                                        {/* Red - Reorder */}
                                        <div
                                            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                                            style={{ width: `${reorderPercent}%` }}
                                        ></div>
                                    </div>
                                    {/* Percent labels */}
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-blue-600 font-bold">{newPercent}%</span>
                                        <span className="text-red-500 font-bold">{reorderPercent}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* Product Mix */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <img src="/icons/fertilizer.png" alt="Product" className="w-5 h-5" />
                            <span className="text-xs font-bold text-gray-600">สัดส่วนสินค้า</span>
                        </div>
                        {(() => {
                            const totalFert = summary.totalFert;
                            const totalBio = summary.totalBio;
                            const totalOther = summary.totalOther;
                            const total = totalFert + totalBio + totalOther;
                            return (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span className="flex-1">ปุ๋ย</span>
                                        <span className="font-bold text-amber-600">{total > 0 ? ((totalFert / total) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="flex-1">ชีวภัณฑ์</span>
                                        <span className="font-bold text-green-600">{total > 0 ? ((totalBio / total) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                        <span className="flex-1">อื่นๆ</span>
                                        <span className="font-bold text-gray-500">{total > 0 ? ((totalOther / total) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Region Summary - 4 cols */}
                <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-4">
                    <h3 className="font-bold text-gray-800 text-sm font-kanit mb-3">
                        สรุปตามภูมิภาค
                    </h3>
                    <div className="space-y-3">
                        {(() => {
                            const totalAllRegions = regionData.reduce((sum, r) => sum + parseFloat(r.total_sales || 0), 0);
                            const sortedRegions = regionData
                                .filter(r => r.region_name)
                                .sort((a, b) => parseFloat(b.total_sales) - parseFloat(a.total_sales));
                            const maxRegionSales = sortedRegions.length > 0 ? parseFloat(sortedRegions[0].total_sales) : 1;

                            return sortedRegions.length > 0 ? (
                                sortedRegions.map((region, idx) => {
                                    const sales = parseFloat(region.total_sales) || 0;
                                    const percent = totalAllRegions > 0 ? ((sales / totalAllRegions) * 100).toFixed(1) : 0;
                                    const barWidth = maxRegionSales > 0 ? (sales / maxRegionSales) * 100 : 0;

                                    // Get top 5 provinces for this region
                                    const regionProvinces = provinceData
                                        .filter(p => p.region_name === region.region_name && p.total_sales > 0)
                                        .sort((a, b) => b.total_sales - a.total_sales)
                                        .slice(0, 5);

                                    return (
                                        <div key={idx} className="space-y-1.5 relative group cursor-pointer">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">{region.region_name}</span>
                                                <span className="text-xs text-gray-400">{region.order_count} orders</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${barWidth}%`,
                                                            backgroundColor: '#80D47C'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-primary w-10 text-right">{percent}%</span>
                                            </div>
                                            <div className="text-sm font-bold text-gray-800">
                                                ฿{sales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </div>

                                            {/* Tooltip - Top 5 Provinces - White style like map tooltip */}
                                            {regionProvinces.length > 0 && (
                                                <div className={`absolute left-0 z-50 hidden group-hover:block min-w-52 ${idx >= sortedRegions.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                                                    <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl px-4 py-3 border border-gray-100">
                                                        <div className="font-bold text-gray-800 font-kanit text-sm mb-2 border-b border-gray-100 pb-2">
                                                            Top 5 จังหวัด - {region.region_name}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {regionProvinces.map((prov, pIdx) => (
                                                                <div key={pIdx} className="flex justify-between gap-4 text-xs">
                                                                    <span className="text-gray-600">{pIdx + 1}. {prov.province_name}</span>
                                                                    <span className="font-bold text-primary">฿{prov.total_sales?.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-gray-400 text-center py-4">ไม่มีข้อมูล</div>
                            );
                        })()}
                    </div>
                </div>

                {/* Province Table - Full Width Bottom */}
                <div className="col-span-12 glass-card rounded-2xl p-5">
                    {/* Scrollable container with max height */}
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-white">
                                {/* Title row */}
                                <tr>
                                    <th colSpan="10" className="text-left pb-3">
                                        <h3 className="font-bold text-gray-800 text-base font-kanit">
                                            ยอดขายแยกตามจังหวัด
                                        </h3>
                                    </th>
                                </tr>
                                {/* Header row */}
                                <tr className="text-left text-gray-500 text-xs border-b border-gray-200 bg-gray-50/80">
                                    <th className="py-2 pr-2 font-medium">จังหวัด</th>
                                    <th className="py-2 px-2 font-medium text-center">ออเดอร์</th>
                                    <th className="py-2 px-2 font-medium text-right">ลูกค้าใหม่</th>
                                    <th className="py-2 px-2 font-medium text-right">รีออเดอร์</th>
                                    <th className="py-2 px-2 font-medium text-right">ปุ๋ย</th>
                                    <th className="py-2 px-2 font-medium text-right">ชีวภัณฑ์</th>
                                    <th className="py-2 px-2 font-medium text-right">อื่นๆ</th>
                                    <th className="py-2 px-2 font-medium text-right">ยอดรวม</th>
                                    <th className="py-2 px-2 font-medium text-center">%</th>
                                    <th className="py-2 pl-2 font-medium text-center">ช่องทาง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const totalAllSales = summary.totalSales;
                                    return sortedProvinces
                                        .map((prov, idx) => {
                                            const percent = totalAllSales > 0 ? ((prov.total_sales / totalAllSales) * 100).toFixed(1) : 0;
                                            return (
                                                <tr
                                                    key={idx}
                                                    className={`border-b border-gray-50 hover:bg-primary/5 cursor-pointer transition-colors ${selectedProvince === prov.province_name ? 'bg-primary/10' : ''}`}
                                                    onClick={() => {
                                                        setSelectedProvince(prov.province_name);
                                                        setModalProvince(prov);
                                                    }}
                                                    title="คลิกเพื่อดูสินค้าที่ขายในจังหวัดนี้"
                                                >
                                                    <td className="py-2 pr-2">
                                                        <div className="font-medium text-gray-800 text-xs flex items-center gap-1">
                                                            {prov.province_name}
                                                            <span className="material-symbols-outlined text-[14px] text-gray-300">open_in_new</span>
                                                        </div>
                                                        {prov.region_name && (
                                                            <div className="text-[10px] text-gray-400">{prov.region_name}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 text-center text-gray-600 text-xs">{prov.order_count}</td>
                                                    <td className="py-2 px-2 text-right text-xs text-blue-600">
                                                        ฿{prov.new_customer_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-xs text-purple-600">
                                                        ฿{prov.reorder_customer_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-xs text-amber-600">
                                                        ฿{prov.fertilizer_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-xs text-green-600">
                                                        ฿{prov.bio_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-right text-xs text-gray-500">
                                                        ฿{prov.other_category_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-right font-bold text-primary text-xs">
                                                        ฿{prov.total_sales?.toLocaleString() || 0}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-bold text-xs text-gray-700">
                                                        {percent}%
                                                    </td>
                                                    <td className="py-2 pl-2">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {/* Channel Icons with Tooltips */}
                                                            {prov.channels?.phone > 0 && (
                                                                <div className="relative group">
                                                                    <img src="/icons/phone-call.png" alt="Phone" className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">
                                                                        โทร: ฿{prov.channels.phone.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {prov.channels?.facebook > 0 && (
                                                                <div className="relative group">
                                                                    <img src="/icons/facebook (1).png" alt="Facebook" className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">
                                                                        Facebook: ฿{prov.channels.facebook.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {prov.channels?.line > 0 && (
                                                                <div className="relative group">
                                                                    <img src="/icons/line.png" alt="Line" className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">
                                                                        Line: ฿{prov.channels.line.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {prov.channels?.tiktok > 0 && (
                                                                <div className="relative group">
                                                                    <img src="/icons/tiktok.png" alt="TikTok" className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">
                                                                        TikTok: ฿{prov.channels.tiktok.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {prov.channels?.other > 0 && (
                                                                <div className="relative group">
                                                                    <img src="/icons/oth.png" alt="Other" className="w-4 h-4 opacity-70 hover:opacity-100" />
                                                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap z-50">
                                                                        อื่นๆ: ฿{prov.channels.other.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(!prov.channels || Object.values(prov.channels).every(v => v <= 0)) && (
                                                                <span className="text-[10px] text-gray-300">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                })()}
                                {provinceData.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Province Products Modal */}
            <ProvinceProductsModal
                isOpen={!!modalProvince}
                onClose={() => setModalProvince(null)}
                province={modalProvince?.province_name}
                regionName={modalProvince?.region_name}
                companyId={user?.company_id}
                month={month}
                year={year}
                department={department}
                userId={user?.id}
                dateRange={dateRange}
            />
        </div >
    );
}

export default RegionalSalesPage;

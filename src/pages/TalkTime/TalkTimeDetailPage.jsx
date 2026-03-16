import React, { useState, useEffect, useRef } from 'react';

export function TalkTimeDetailPage({ user, selectedUserId, selectedUserName, selectedDate, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentDate, setCurrentDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
    const [notification, setNotification] = useState(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (selectedUserId) {
            fetchData(isFirstLoad.current);
            isFirstLoad.current = false;
        }
    }, [selectedUserId, currentDate]);

    const fetchData = async (autoLatest = false) => {
        setLoading(true);
        setNotification(null);
        try {
            const autoParam = autoLatest ? '&auto_latest=true' : '';
            const response = await fetch(
                `./api/reports/talk_time_detail.php?user_id=${selectedUserId}&date=${currentDate}${autoParam}`
            );
            const result = await response.json();
            if (result.success) {
                setData(result);
                // If redirected to a different date, update currentDate and show notification
                if (result.redirected && result.date !== currentDate) {
                    setCurrentDate(result.date);
                    const formattedDate = new Date(result.date).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    setNotification(`📅 ข้อมูลล่าสุดคือวันที่ ${formattedDate} จึงแสดงข้อมูลวันนี้`);
                }
            } else {
                setError(result.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    // Calculate max values for chart scaling - separate scales for calls and duration
    const maxCalls = data?.hourly ? Math.max(...data.hourly.map(h => Math.max(h.connected_calls, h.missed_calls))) : 0;
    const maxDuration = data?.hourly ? Math.max(...data.hourly.map(h => h.duration_minutes)) : 0;
    const chartHeight = 200;

    const getBarHeight = (value, max) => {
        if (max === 0) return 0;
        return Math.max((value / max) * chartHeight, value > 0 ? 4 : 0);
    };

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                        title="กลับ"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            📊 แดชบอร์ด Talk Time
                        </h2>
                        <p className="text-gray-500">
                            สถิติการโทรประจำวัน - {data?.user?.name || selectedUserName}
                        </p>
                        <p className="text-sm text-primary font-medium mt-1">
                            📅 {new Date(currentDate).toLocaleDateString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                {/* Date Picker with Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const d = new Date(currentDate);
                            d.setDate(d.getDate() - 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                        title="ย้อน 1 วัน"
                    >
                        <span className="material-symbols-outlined text-gray-600">chevron_left</span>
                    </button>
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                        onClick={() => {
                            const d = new Date(currentDate);
                            d.setDate(d.getDate() + 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                        title="วันถัดไป"
                    >
                        <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">info</span>
                    <span className="text-sm">{notification}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-auto text-amber-500 hover:text-amber-700"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-500">{error}</div>
            ) : data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">จำนวนการรับสาย</div>
                                    <div className="text-2xl font-bold text-primary">{data.summary.total_calls} <span className="text-sm font-normal text-gray-400">สาย</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">call</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">จำนวนสายที่ได้คุย</div>
                                    <div className="text-2xl font-bold text-emerald-600">{data.summary.connected_calls} <span className="text-sm font-normal text-gray-400">สาย</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-600">phone_in_talk</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">ระยะเวลาการสนทนา</div>
                                    <div className="text-2xl font-bold text-orange-500">{data.summary.total_duration_minutes} <span className="text-sm font-normal text-gray-400">นาที</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-500">timer</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">ค่าเฉลี่ยเวลาสนทนา</div>
                                    <div className="text-2xl font-bold text-blue-600">{data.summary.avg_call_duration} <span className="text-sm font-normal text-gray-400">นาที</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600">avg_pace</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">เฉลี่ยโทรต่อชม.</div>
                                    <div className="text-2xl font-bold text-purple-600">{data.summary.avg_per_hour} <span className="text-sm font-normal text-gray-400">นาที</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-purple-600">schedule</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">สายที่ไม่ได้คุย</div>
                                    <div className="text-2xl font-bold text-red-500">{data.summary.missed_calls} <span className="text-sm font-normal text-gray-400">สาย</span></div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500">call_missed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Chart */}
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 สถิติรายชั่วโมง</h3>

                        {/* Legend */}
                        <div className="flex gap-6 mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                                <span className="text-sm text-gray-600">สายที่ได้คุย</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-400"></div>
                                <span className="text-sm text-gray-600">สายที่ไม่ได้คุย</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-300"></div>
                                <span className="text-sm text-gray-600">ระยะเวลาสนทนา (นาที)</span>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="overflow-x-auto">
                            <div className="flex items-end gap-1 min-w-[800px]" style={{ height: chartHeight + 40 }}>
                                {data.hourly.map((hour) => (
                                    <div key={hour.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                        {/* Tooltip - position based on hour to avoid edge overflow */}
                                        <div className={`absolute top-0 bg-white text-gray-800 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-xl border border-gray-200
                                            ${hour.hour < 4 ? 'left-0' : hour.hour > 19 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                                            <div className="font-bold text-gray-800 mb-1">{hour.time_range || hour.label}</div>
                                            <div className="text-emerald-600">รับสาย: {hour.total_calls} สาย</div>
                                            <div className="text-green-600">ได้คุย: {hour.connected_calls} สาย</div>
                                            <div className="text-red-500">ไม่ได้คุย: {hour.missed_calls} สาย</div>
                                            <div className="text-orange-500">เวลา: {hour.duration_formatted || '0:00'}</div>
                                        </div>

                                        {/* Bars - Duration bar behind, Call bars in front */}
                                        <div className="relative h-[200px] w-full flex items-end justify-center cursor-pointer">
                                            {/* Duration bar (background - yellow) */}
                                            <div
                                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 bg-yellow-200 rounded-t transition-all opacity-60"
                                                style={{ height: getBarHeight(hour.duration_minutes, maxDuration) }}
                                            ></div>
                                            {/* Call bars (foreground) */}
                                            <div className="relative z-10 flex items-end gap-0.5">
                                                <div
                                                    className="w-3 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                                                    style={{ height: getBarHeight(hour.connected_calls, maxCalls) }}
                                                ></div>
                                                <div
                                                    className="w-3 bg-red-400 rounded-t transition-all hover:bg-red-300"
                                                    style={{ height: getBarHeight(hour.missed_calls, maxCalls) }}
                                                ></div>
                                            </div>
                                        </div>
                                        {/* Label */}
                                        <span className="text-xs text-gray-500">{hour.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center text-sm text-gray-500 mt-4">ช่วงเวลา</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default TalkTimeDetailPage;

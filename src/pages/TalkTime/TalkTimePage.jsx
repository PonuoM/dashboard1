import React, { useState, useEffect } from 'react';
import { TalkTimeDetailPage } from './TalkTimeDetailPage';

export function TalkTimePage({ user }) {
    const [data, setData] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Initialize from sessionStorage or default to current month/year
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const saved = sessionStorage.getItem('talkTime_selectedMonth');
        return saved ? parseInt(saved) : new Date().getMonth() + 1;
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = sessionStorage.getItem('talkTime_selectedYear');
        return saved ? parseInt(saved) : new Date().getFullYear();
    });

    // State for detail view
    const [selectedUser, setSelectedUser] = useState(null);

    const months = [
        { value: 1, label: 'มกราคม' },
        { value: 2, label: 'กุมภาพันธ์' },
        { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' },
        { value: 5, label: 'พฤษภาคม' },
        { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' },
        { value: 8, label: 'สิงหาคม' },
        { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' },
        { value: 11, label: 'พฤศจิกายน' },
        { value: 12, label: 'ธันวาคม' },
    ];

    // Save filter values to sessionStorage when they change
    useEffect(() => {
        sessionStorage.setItem('talkTime_selectedMonth', selectedMonth.toString());
        sessionStorage.setItem('talkTime_selectedYear', selectedYear.toString());
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const companyId = user?.company_id || '';
            const userId = user?.id || '';
            const response = await fetch(
                `./api/reports/talk_time.php?year=${selectedYear}&month=${selectedMonth}&company_id=${companyId}&user_id=${userId}`
            );
            const result = await response.json();
            if (result.success) {
                setData(result.data);
                setGroups(result.groups || []);
                setLastUpdate(result.call_data_last_update);
            } else {
                setError(result.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    // Summary statistics
    const totalCalls = data.reduce((sum, u) => sum + u.total_calls, 0);
    const totalConnected = data.reduce((sum, u) => sum + u.connected_calls, 0);
    const totalMinutes = data.reduce((sum, u) => sum + u.total_duration_minutes, 0);
    const totalSales = data.reduce((sum, u) => sum + (u.total_sales || 0), 0);

    const renderUserRow = (row, isTeamMember = false) => (
        <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors`}>
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    {isTeamMember && <span className="text-gray-300 pl-4">└</span>}
                    <div>
                        <div
                            className="font-bold text-primary hover:underline cursor-pointer"
                            onClick={() => setSelectedUser({ id: row.id, name: row.name || row.username })}
                        >
                            {row.name || row.username}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-gray-500 text-xs">
                {row.role === 'Supervisor Telesale' ? 'หัวหน้า' : 'Telesale'}
            </td>
            <td className="px-4 py-4 text-center text-gray-500">
                {row.team_count > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                        <span className="material-symbols-outlined text-sm">group</span>
                        {row.team_count}
                    </span>
                ) : (
                    <span className="text-gray-300">-</span>
                )}
            </td>
            <td className="px-4 py-4 text-sm text-gray-600 font-mono">{row.phone || '-'}</td>
            <td className="px-4 py-4 text-right text-gray-600">{row.total_calls.toLocaleString()}</td>
            <td className="px-4 py-4 text-right text-gray-600">{row.connected_calls.toLocaleString()}</td>
            <td className="px-4 py-4 text-right text-gray-600">{row.total_duration_minutes.toLocaleString()}</td>
            <td className="px-4 py-4 text-right text-gray-600">{row.avg_per_day_minutes}</td>
            <td className="px-4 py-4 text-right text-gray-600">{parseFloat(row.work_days || 0).toFixed(1)}</td>
            <td className="px-4 py-4 text-right font-bold text-gray-800">฿{(row.total_sales || 0).toLocaleString()}</td>
        </tr>
    );

    const renderGroupHeader = (title, icon) => (
        <tr className="border-t-2 border-gray-200">
            <td colSpan="10" className="px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                    {title}
                </div>
            </td>
        </tr>
    );

    // If a user is selected, show detail view
    if (selectedUser) {
        return (
            <TalkTimeDetailPage
                user={user}
                selectedUserId={selectedUser.id}
                selectedUserName={selectedUser.name}
                selectedDate={new Date().toISOString().split('T')[0]}
                onBack={() => setSelectedUser(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Talk Time Report</h2>
                    <p className="text-gray-500">สถิติการโทรของทีม Telesale</p>
                    {lastUpdate && (
                        <p className="text-xs text-gray-400 mt-1">
                            ข้อมูลเวลาโทรอัพเดทถึง: {new Date(lastUpdate).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        {months.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        {[2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">พนักงาน</div>
                    <div className="text-2xl font-bold text-gray-800">{data.length}</div>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">สายโทรทั้งหมด</div>
                    <div className="text-2xl font-bold text-primary">{totalCalls.toLocaleString()}</div>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">สายที่ได้คุย (≥40วิ)</div>
                    <div className="text-2xl font-bold text-emerald-600">{totalConnected.toLocaleString()}</div>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">เวลาโทรรวม</div>
                    <div className="text-2xl font-bold text-blue-600">{totalMinutes.toLocaleString()} นาที</div>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">ยอดขายรวม</div>
                    <div className="text-2xl font-bold text-pink-600">฿{totalSales.toLocaleString()}</div>
                </div>
            </div>

            {/* Data Table */}
            <section className="glass-card rounded-3xl overflow-hidden">
                <div className="px-8 py-6 border-b border-glass-border flex justify-between items-center">
                    <h3 className="text-lg font-bold">รายละเอียดการโทร</h3>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-500">{error}</div>
                ) : (
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">ชื่อ</th>
                                    <th className="px-4 py-3">ตำแหน่ง</th>
                                    <th className="px-4 py-3 text-center">ลูกทีม</th>
                                    <th className="px-4 py-3">เบอร์โทร</th>
                                    <th className="px-4 py-3 text-right">สายทั้งหมด</th>
                                    <th className="px-4 py-3 text-right">สายที่ได้คุย</th>
                                    <th className="px-4 py-3 text-right">เวลาโทร (นาที)</th>
                                    <th className="px-4 py-3 text-right">เฉลี่ย/วัน</th>
                                    <th className="px-4 py-3 text-right">วันทำงาน</th>
                                    <th className="px-4 py-3 text-right">ยอดขาย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {groups.map((group, groupIndex) => (
                                    <React.Fragment key={groupIndex}>
                                        {/* Group Header */}
                                        {group.group_type === 'team' && group.supervisor && (
                                            <>
                                                {renderGroupHeader(
                                                    `ทีม ${group.supervisor.name || group.supervisor.username}`,
                                                    'supervised_user_circle'
                                                )}
                                                {renderUserRow(group.supervisor, false)}
                                                {group.members.map(member => renderUserRow(member, true))}
                                            </>
                                        )}

                                        {group.group_type === 'unassigned' && (
                                            <>
                                                {renderGroupHeader(
                                                    'ไม่มีทีม / หัวหน้าที่ไม่มีลูกน้อง',
                                                    'person_outline'
                                                )}
                                                {group.members.map(member => renderUserRow(member, false))}
                                            </>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default TalkTimePage;

import { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/UI';

function TargetManagementPage({ user, onSave }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // user_id being saved
    const [users, setUsers] = useState([]);
    const [targets, setTargets] = useState({}); // { user_id: amount }

    // Format number with commas
    const formatNumber = (val) => {
        if (!val && val !== 0) return '';
        return new Intl.NumberFormat('th-TH').format(val);
    };

    // Parse formatted number back to raw value
    const parseFormattedNumber = (str) => {
        if (!str) return '';
        return str.replace(/,/g, '');
    };

    // Filters
    const currentDate = new Date();
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const months = [
        { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
        { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
        { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
        { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
    ];

    const years = [];
    for (let y = currentDate.getFullYear() + 1; y >= 2024; y--) {
        years.push(y);
    }

    useEffect(() => {
        fetchTargets();
    }, [month, year, user?.company_id]);

    const fetchTargets = async () => {
        if (!user?.company_id) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                month,
                year,
                company_id: user.company_id
            });

            const response = await fetch(`./api/reports/targets.php?${params}`);
            const result = await response.json();

            if (result.success) {
                setUsers(result.data);
                // Build targets map
                const targetsMap = {};
                result.data.forEach(u => {
                    targetsMap[u.user_id] = u.target_amount || '';
                });
                setTargets(targetsMap);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTargetChange = (userId, value) => {
        setTargets(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const saveTarget = async (userId) => {
        setSaving(userId);
        try {
            const response = await fetch('./api/reports/targets.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    month,
                    year,
                    target_amount: parseFloat(targets[userId]) || 0
                })
            });

            const result = await response.json();
            if (result.success) {
                // Show brief success feedback
                setTimeout(() => setSaving(null), 500);
            } else {
                alert('บันทึกไม่สำเร็จ: ' + result.message);
                setSaving(null);
            }
        } catch (err) {
            console.error('Save error:', err);
            setSaving(null);
        }
    };

    const saveAllTargets = async () => {
        for (const u of users) {
            await saveTarget(u.user_id);
        }
        // Call onSave callback to refresh parent data
        if (onSave) {
            onSave();
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    // Group users by role
    const telesaleUsers = users.filter(u => u.role === 'Telesale');
    const supervisorUsers = users.filter(u => u.role === 'Supervisor Telesale');

    return (
        <div className="space-y-6">
            {/* Control Center / Filter Bar - Same style as SalesReportPage */}
            <div className="flex flex-wrap items-center justify-between bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/80 relative z-50 gap-3">

                {/* Left - Title */}
                <h2 className="text-lg font-bold text-gray-700 px-2">
                    ตั้งเป้าหมายยอดขาย {months.find(m => m.value === month)?.label} {year}
                </h2>

                {/* Right - Controls */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* Date Navigation Group - Symmetrical */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                        {/* Month Picker */}
                        <CustomSelect
                            value={month}
                            onChange={setMonth}
                            options={months}
                        />

                        <div className="w-px h-6 bg-gray-200"></div>

                        {/* Year Picker */}
                        <CustomSelect
                            value={year}
                            onChange={setYear}
                            options={years.map(y => ({ value: y, label: y.toString() }))}
                        />
                    </div>

                    <button
                        onClick={saveAllTargets}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-lg">save</span>
                        <span className="text-sm">บันทึกทั้งหมด</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20 glass-card rounded-3xl">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Telesale */}
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-glass-border bg-primary/5">
                            <h3 className="font-bold text-primary">Telesale ({telesaleUsers.length} คน)</h3>
                        </div>
                        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                            {telesaleUsers.map(u => (
                                <div key={u.user_id} className="flex items-center gap-4 p-3 bg-white/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {u.first_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{u.first_name}</p>
                                        <p className="text-[10px] text-gray-500">ID: {u.user_id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">฿</span>
                                        <input
                                            type="text"
                                            value={formatNumber(targets[u.user_id])}
                                            onChange={(e) => handleTargetChange(u.user_id, parseFormattedNumber(e.target.value))}
                                            placeholder="0"
                                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-right font-bold focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                        />
                                        <button
                                            onClick={() => saveTarget(u.user_id)}
                                            disabled={saving === u.user_id}
                                            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${saving === u.user_id
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-100 hover:bg-primary hover:text-white'
                                                }`}
                                        >
                                            {saving === u.user_id ? '✓' : 'บันทึก'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {telesaleUsers.length === 0 && (
                                <p className="text-center text-gray-400 py-8">ไม่พบ Telesale</p>
                            )}
                        </div>
                    </div>

                    {/* Supervisor */}
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-glass-border bg-amber-500/10">
                            <h3 className="font-bold text-amber-600">Supervisor Telesale ({supervisorUsers.length} คน)</h3>
                        </div>
                        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                            {supervisorUsers.map(u => (
                                <div key={u.user_id} className="flex items-center gap-4 p-3 bg-white/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
                                        {u.first_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{u.first_name}</p>
                                        <p className="text-[10px] text-gray-500">ID: {u.user_id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-sm">฿</span>
                                        <input
                                            type="text"
                                            value={formatNumber(targets[u.user_id])}
                                            onChange={(e) => handleTargetChange(u.user_id, parseFormattedNumber(e.target.value))}
                                            placeholder="0"
                                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-right font-bold focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                        />
                                        <button
                                            onClick={() => saveTarget(u.user_id)}
                                            disabled={saving === u.user_id}
                                            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${saving === u.user_id
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-100 hover:bg-amber-500 hover:text-white'
                                                }`}
                                        >
                                            {saving === u.user_id ? '✓' : 'บันทึก'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {supervisorUsers.length === 0 && (
                                <p className="text-center text-gray-400 py-8">ไม่พบ Supervisor</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TargetManagementPage;

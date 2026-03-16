import { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/UI';

function AccountingPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const currentDate = new Date();
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const months = [
        { value: 0, label: 'ทั้งหมด' },
        { value: 1, label: 'ม.ค.' }, { value: 2, label: 'ก.พ.' }, { value: 3, label: 'มี.ค.' },
        { value: 4, label: 'เม.ย.' }, { value: 5, label: 'พ.ค.' }, { value: 6, label: 'มิ.ย.' },
        { value: 7, label: 'ก.ค.' }, { value: 8, label: 'ส.ค.' }, { value: 9, label: 'ก.ย.' },
        { value: 10, label: 'ต.ค.' }, { value: 11, label: 'พ.ย.' }, { value: 12, label: 'ธ.ค.' },
    ];
    const currentYear = currentDate.getFullYear();
    const years = [{ value: currentYear, label: `${currentYear}` }];

    const fmt = (val) => new Intl.NumberFormat('th-TH').format(val || 0);
    const fmtDate = (s) => {
        if (!s) return '-';
        const d = new Date(s);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const fetchData = () => {
        setLoading(true);
        setError(null);
        const apiYear = year;
        const params = new URLSearchParams({
            company_id: user?.company_id || 0,
            month, year: apiYear,
        });
        fetch(`./api/reports/accounting.php?${params}`)
            .then(r => r.json())
            .then(result => {
                if (result.success) setData(result.data);
                else setError(result.message);
            })
            .catch(() => setError('Connection error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [month, year]);

    const SummaryCard = ({ icon, label, value, sub, color = 'primary', iconBg }) => (
        <div className="glass-card rounded-2xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg || 'bg-gradient-to-br from-primary to-amber-500'} text-white flex items-center justify-center shadow-lg`}>
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
                <span className={`text-2xl font-extrabold text-${color}`}>{value}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">{label}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-indigo-500">account_balance</span>
                        รายงานบัญชี
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">รายการเดินบัญชี · ตรวจสอบยอด · เก็บเงินปลายทาง</p>
                </div>
                <div className="flex items-center gap-3">
                    <CustomSelect options={months} value={month} onChange={setMonth} />
                    <CustomSelect options={years} value={year} onChange={setYear} />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            ) : error ? (
                <div className="glass-card rounded-2xl p-10 text-center">
                    <p className="text-red-500 font-bold">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">ลองใหม่</button>
                </div>
            ) : data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard icon="upload_file" label="อัพรายการเดินบัญชี" value={fmt(data.summary.statement_rows)} sub={`${data.summary.statement_batches} ชุด`} iconBg="bg-gradient-to-br from-blue-500 to-cyan-500" />
                        <SummaryCard icon="fact_check" label="ตรวจสอบยอด" value={fmt(data.summary.reconcile_logs)} sub={`฿${fmt(data.summary.reconcile_amount)}`} iconBg="bg-gradient-to-br from-emerald-500 to-teal-500" />
                        <SummaryCard icon="local_shipping" label="นำเข้าเอกสาร COD" value={fmt(data.summary.cod_total)} sub={`ตรงกัน ${data.summary.cod_total > 0 ? ((data.summary.cod_matched / data.summary.cod_total) * 100).toFixed(1) : 0}%`} iconBg="bg-gradient-to-br from-amber-500 to-orange-500" />
                        <SummaryCard icon="warning" label="รายการค้าง" value={fmt(data.summary.unreconciled_count)} sub={`฿${fmt(data.summary.unreconciled_amount)}`} iconBg="bg-gradient-to-br from-red-500 to-pink-500" />
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Statement Upload Table */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-glass-border flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">upload_file</span>
                                <h3 className="font-bold text-sm">อัพรายการเดินบัญชี (รายบุคคล)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-4 py-2.5 text-left">#</th>
                                            <th className="px-4 py-2.5 text-left">ชื่อ</th>
                                            <th className="px-4 py-2.5 text-center">จำนวนชุด</th>
                                            <th className="px-4 py-2.5 text-center">จำนวนรายการ</th>
                                            <th className="px-4 py-2.5 text-left">ล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.statement_by_person || []).map((p, i) => (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-xs">{p.name}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-blue-600">{p.batch_count}</td>
                                                <td className="px-4 py-2.5 text-center font-bold">{fmt(p.total_rows)}</td>
                                                <td className="px-4 py-2.5 text-[10px] text-gray-400">{fmtDate(p.last_upload)}</td>
                                            </tr>
                                        ))}
                                        {(!data.statement_by_person || data.statement_by_person.length === 0) && (
                                            <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Reconcile Table */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-glass-border flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">fact_check</span>
                                <h3 className="font-bold text-sm">ตรวจสอบยอด (รายบุคคล)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-4 py-2.5 text-left">#</th>
                                            <th className="px-4 py-2.5 text-left">ชื่อ</th>
                                            <th className="px-4 py-2.5 text-center">จำนวนชุด</th>
                                            <th className="px-4 py-2.5 text-center">รายการ</th>
                                            <th className="px-4 py-2.5 text-right">ยอดเงิน</th>
                                            <th className="px-4 py-2.5 text-left">ล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.reconcile_by_person || []).map((p, i) => (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-xs">{p.name}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{p.batch_count}</td>
                                                <td className="px-4 py-2.5 text-center font-bold">{fmt(p.log_count)}</td>
                                                <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-600">฿{fmt(p.total_confirmed)}</td>
                                                <td className="px-4 py-2.5 text-[10px] text-gray-400">{fmtDate(p.last_reconcile)}</td>
                                            </tr>
                                        ))}
                                        {(!data.reconcile_by_person || data.reconcile_by_person.length === 0) && (
                                            <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* COD Table - Full Width */}
                    <section className="glass-card rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">local_shipping</span>
                                <h3 className="font-bold text-sm">จัดการ COD (รายบุคคล)</h3>
                            </div>
                            {data.summary.cod_diff !== 0 && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${data.summary.cod_diff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    ส่วนต่างรวม: ฿{fmt(Math.abs(data.summary.cod_diff))} {data.summary.cod_diff > 0 ? '(ขาด)' : '(เกิน)'}
                                </span>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                        <th className="px-4 py-2.5 text-left">#</th>
                                        <th className="px-4 py-2.5 text-left">ชื่อ</th>
                                        <th className="px-4 py-2.5 text-center">รายการ</th>
                                        <th className="px-4 py-2.5 text-center text-green-500">ตรงกัน</th>
                                        <th className="px-4 py-2.5 text-center text-red-500">ไม่ตรง</th>
                                        <th className="px-4 py-2.5 text-right">ยอด COD</th>
                                        <th className="px-4 py-2.5 text-right">ยอดรับจริง</th>
                                        <th className="px-4 py-2.5 text-right">ส่วนต่าง</th>
                                        <th className="px-4 py-2.5 text-center">อัตราตรง</th>
                                        <th className="px-4 py-2.5 text-left">ล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(data.cod_by_person || []).map((p, i) => {
                                        const matchPct = p.record_count > 0 ? ((p.matched_count / p.record_count) * 100) : 0;
                                        return (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-xs">{p.name}</td>
                                                <td className="px-4 py-2.5 text-center font-bold">{fmt(p.record_count)}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-green-600">{fmt(p.matched_count)}</td>
                                                <td className="px-4 py-2.5 text-center font-bold text-red-500">{p.unmatched_count > 0 ? p.unmatched_count : '-'}</td>
                                                <td className="px-4 py-2.5 text-right text-xs">฿{fmt(p.total_cod)}</td>
                                                <td className="px-4 py-2.5 text-right text-xs">฿{fmt(p.total_received)}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    {p.total_diff !== 0 ? (
                                                        <span className={`text-xs font-bold ${p.total_diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                            ฿{fmt(Math.abs(p.total_diff))}
                                                        </span>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${matchPct >= 99 ? 'bg-green-100 text-green-700' : matchPct >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {matchPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-[10px] text-gray-400">{fmtDate(p.last_activity)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(!data.cod_by_person || data.cod_by_person.length === 0) && (
                                        <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Payment Methods + Daily Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Unmatched Comparison */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-glass-border flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-500">compare_arrows</span>
                                <h3 className="font-bold text-sm">สถานะการจับคู่</h3>
                            </div>
                            {data.unmatched ? (
                                <div className="p-5 space-y-5">
                                    {/* Statement reconcile side */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-blue-500 text-sm">receipt_long</span>
                                            <span className="text-xs font-bold text-gray-700">รายการกระทบยอด</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-green-50 rounded-xl p-3 text-center">
                                                <p className="text-lg font-extrabold text-green-600">{fmt(data.unmatched.statements_confirmed)}</p>
                                                <p className="text-[10px] text-green-500 font-medium">ยืนยันแล้ว</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-xl p-3 text-center">
                                                <p className="text-lg font-extrabold text-orange-500">{fmt(data.unmatched.statements_unconfirmed)}</p>
                                                <p className="text-[10px] text-orange-400 font-medium">รอยืนยัน</p>
                                                <p className="text-[9px] text-gray-400 mt-0.5">฿{fmt(data.unmatched.statements_unconfirmed_amount)}</p>
                                            </div>
                                        </div>
                                        {(data.unmatched.statements_confirmed + data.unmatched.statements_unconfirmed) > 0 && (
                                            <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(data.unmatched.statements_confirmed / (data.unmatched.statements_confirmed + data.unmatched.statements_unconfirmed)) * 100}%` }}></div>
                                            </div>
                                        )}
                                        {data.unmatched.statement_logs_unmatched > 0 && (
                                            <div className="mt-2 bg-red-50 rounded-lg p-2 flex items-center justify-between">
                                                <span className="text-[10px] text-red-500">📄 รายการเดินบัญชียังไม่จับคู่</span>
                                                <span className="text-xs font-bold text-red-600">{fmt(data.unmatched.statement_logs_unmatched)} รายการ · ฿{fmt(data.unmatched.statement_logs_unmatched_amount)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <hr className="border-gray-100" />

                                    {/* Order side */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-amber-500 text-sm">shopping_cart</span>
                                            <span className="text-xs font-bold text-gray-700">สถานะออเดอร์</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-green-50 rounded-xl p-3 text-center">
                                                <p className="text-lg font-extrabold text-green-600">{fmt(data.unmatched.orders_delivered)}</p>
                                                <p className="text-[10px] text-green-500 font-medium">จัดส่งแล้ว</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-xl p-3 text-center">
                                                <p className="text-lg font-extrabold text-amber-600">{fmt(data.unmatched.orders_preapproved)}</p>
                                                <p className="text-[10px] text-amber-500 font-medium">รอบัญชีตรวจสอบ</p>
                                                <p className="text-[9px] text-gray-400 mt-0.5">฿{fmt(data.unmatched.orders_preapproved_amount)}</p>
                                            </div>
                                        </div>
                                        {(data.unmatched.orders_delivered + data.unmatched.orders_preapproved) > 0 && (
                                            <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(data.unmatched.orders_delivered / (data.unmatched.orders_delivered + data.unmatched.orders_preapproved)) * 100}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="p-5 text-center text-gray-400 text-xs">ไม่มีข้อมูล</p>
                            )}
                        </section>

                        {/* Daily Activity */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-glass-border flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">timeline</span>
                                <h3 className="font-bold text-sm">กิจกรรมตรวจสอบยอดรายวัน</h3>
                            </div>
                            <div className="p-5">
                                {data.daily_reconcile && data.daily_reconcile.length > 0 ? (
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {data.daily_reconcile.map((d) => {
                                            const maxCount = Math.max(...data.daily_reconcile.map(x => x.count));
                                            const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                                            return (
                                                <div key={d.date} className="flex items-center gap-3 text-xs">
                                                    <span className="text-gray-500 w-24 flex-shrink-0 font-mono">{d.date.split('-').reverse().join('/')}</span>
                                                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                                                        <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700">
                                                            {d.count} · ฿{fmt(d.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400 text-xs py-4">ไม่มีข้อมูล</p>
                                )}
                            </div>
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}

export default AccountingPage;

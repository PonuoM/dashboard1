import { useState, useEffect } from 'react';
import { CustomSelect } from '../../components/UI';

function AccountingPage({ user }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

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

    const SummaryCard = ({ icon, label, value, sub, iconBg }) => (
        <div className="glass-card rounded-2xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${iconBg || 'bg-gradient-to-br from-primary to-amber-500'} text-white flex items-center justify-center shadow-lg`}>
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
                <span className="text-2xl font-extrabold">{value}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">{label}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );

    const SectionHeader = ({ icon, iconColor, title, badge }) => (
        <div className="px-5 py-3.5 border-b border-glass-border flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${iconColor} text-lg`}>{icon}</span>
                <h3 className="font-bold text-sm">{title}</h3>
            </div>
            {badge}
        </div>
    );

    const methodLabels = { 'COD': 'COD', 'Transfer': 'โอน', 'PayAfter': 'จ่ายหลังส่ง', 'Claim': 'เคลม', 'FreeGift': 'ของแถม' };
    const methodColors = { 'COD': 'bg-amber-100 text-amber-700', 'Transfer': 'bg-blue-100 text-blue-700', 'PayAfter': 'bg-purple-100 text-purple-700', 'Claim': 'bg-red-100 text-red-700', 'FreeGift': 'bg-green-100 text-green-700' };

    return (
        <div className="space-y-5">
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
                    {/* ===== ROW 1: Summary Cards ===== */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard icon="upload_file" label="อัพรายการเดินบัญชี" value={fmt(data.summary.statement_rows)} sub={`${data.summary.statement_batches} ชุด`} iconBg="bg-gradient-to-br from-blue-500 to-cyan-500" />
                        <SummaryCard icon="fact_check" label="ตรวจสอบยอด (จับคู่)" value={fmt(data.summary.reconcile_logs)} sub={`฿${fmt(data.summary.reconcile_amount)}`} iconBg="bg-gradient-to-br from-emerald-500 to-teal-500" />
                        <SummaryCard icon="local_shipping" label="นำเข้าเอกสาร COD" value={fmt(data.summary.cod_total)} sub={`ตรงกัน ${data.summary.cod_total > 0 ? ((data.summary.cod_matched / data.summary.cod_total) * 100).toFixed(1) : 0}%`} iconBg="bg-gradient-to-br from-amber-500 to-orange-500" />
                        <SummaryCard icon="warning" label="statement ค้าง" value={fmt(data.summary.unreconciled_count)} sub={`จับคู่ ${fmt(data.summary.statement_matched || 0)}/${fmt(data.summary.statement_total || 0)} · ฿${fmt(data.summary.unreconciled_amount)}`} iconBg="bg-gradient-to-br from-red-500 to-pink-500" />
                    </div>

                    {/* ===== ROW 2: Bank Breakdown + Payment Method (Side by side) ===== */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                        {/* Bank Breakdown - wider */}
                        <section className="lg:col-span-3 glass-card rounded-2xl overflow-hidden">
                            <SectionHeader icon="account_balance" iconColor="text-cyan-500" title="สรุปตามธนาคาร" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-4 py-2 text-left">ธนาคาร</th>
                                            <th className="px-4 py-2 text-center">ทั้งหมด</th>
                                            <th className="px-4 py-2 text-center text-green-500">จับคู่แล้ว</th>
                                            <th className="px-4 py-2 text-center text-red-500">ค้าง</th>
                                            <th className="px-4 py-2 text-right">ยอดค้าง</th>
                                            <th className="px-4 py-2 text-center">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.statement_by_bank || []).map((b) => {
                                            const pct = b.total > 0 ? ((b.matched / b.total) * 100) : 0;
                                            return (
                                                <tr key={b.bank_name} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-2.5 font-bold text-xs">{b.bank_name}</td>
                                                    <td className="px-4 py-2.5 text-center font-bold">{fmt(b.total)}</td>
                                                    <td className="px-4 py-2.5 text-center font-bold text-green-600">{fmt(b.matched)}</td>
                                                    <td className="px-4 py-2.5 text-center font-bold text-red-500">{b.unmatched > 0 ? fmt(b.unmatched) : '-'}</td>
                                                    <td className="px-4 py-2.5 text-right text-xs">{b.unmatched_amount > 0 ? `฿${fmt(b.unmatched_amount)}` : '-'}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <div className="flex items-center gap-1.5 justify-center">
                                                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-[9px] text-gray-500 w-8">{pct.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!data.statement_by_bank || data.statement_by_bank.length === 0) && (
                                            <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Payment Method - narrower */}
                        <section className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
                            <SectionHeader icon="payments" iconColor="text-indigo-500" title="แยกตามช่องทางชำระ"
                                badge={<span className="text-[9px] text-gray-400">1 stmt อาจ = หลาย order</span>} />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-3 py-2 text-left">ช่องทาง</th>
                                            <th className="px-3 py-2 text-center">orders</th>
                                            <th className="px-3 py-2 text-center">stmts</th>
                                            <th className="px-3 py-2 text-right">ยอดเงิน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.statement_by_payment || []).map((p) => {
                                            const avg = p.statement_count > 0 ? (p.reconcile_count / p.statement_count).toFixed(1) : '-';
                                            return (
                                                <tr key={p.payment_method} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${methodColors[p.payment_method] || 'bg-gray-100 text-gray-600'}`}>
                                                            {methodLabels[p.payment_method] || p.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center font-bold text-xs">{fmt(p.reconcile_count)}</td>
                                                    <td className="px-3 py-2.5 text-center text-xs">
                                                        <span className="font-bold text-indigo-600">{fmt(p.statement_count)}</span>
                                                        <span className={`ml-1 text-[9px] ${parseFloat(avg) > 1 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                            ({avg})
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-[11px] font-bold text-emerald-600">฿{fmt(p.total_amount)}</td>
                                                </tr>
                                            );
                                        })}
                                        {(!data.statement_by_payment || data.statement_by_payment.length === 0) && (
                                            <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* ===== ROW 3: Person Tables (3-col) ===== */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Statement Upload - by person */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <SectionHeader icon="upload_file" iconColor="text-blue-500" title="อัพ Statement (รายบุคคล)" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">ชื่อ</th>
                                            <th className="px-3 py-2 text-center">ชุด</th>
                                            <th className="px-3 py-2 text-center">รายการ</th>
                                            <th className="px-3 py-2 text-left">ล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.statement_by_person || []).map((p, i) => (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-3 py-2 font-bold text-xs">{p.name}</td>
                                                <td className="px-3 py-2 text-center font-bold text-blue-600">{p.batch_count}</td>
                                                <td className="px-3 py-2 text-center font-bold">{fmt(p.total_rows)}</td>
                                                <td className="px-3 py-2 text-[10px] text-gray-400">{fmtDate(p.last_upload)}</td>
                                            </tr>
                                        ))}
                                        {(!data.statement_by_person || data.statement_by_person.length === 0) && (
                                            <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Reconcile - by person */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <SectionHeader icon="fact_check" iconColor="text-emerald-500" title="ตรวจสอบยอด (รายบุคคล)" />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                            <th className="px-3 py-2 text-left">#</th>
                                            <th className="px-3 py-2 text-left">ชื่อ</th>
                                            <th className="px-3 py-2 text-center">ชุด</th>
                                            <th className="px-3 py-2 text-center">รายการ</th>
                                            <th className="px-3 py-2 text-right">ยอด</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(data.reconcile_by_person || []).map((p, i) => (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-3 py-2 font-bold text-xs">{p.name}</td>
                                                <td className="px-3 py-2 text-center font-bold text-emerald-600">{p.batch_count}</td>
                                                <td className="px-3 py-2 text-center font-bold">{fmt(p.log_count)}</td>
                                                <td className="px-3 py-2 text-right text-[11px] font-bold text-emerald-600">฿{fmt(p.total_confirmed)}</td>
                                            </tr>
                                        ))}
                                        {(!data.reconcile_by_person || data.reconcile_by_person.length === 0) && (
                                            <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Matching Status Summary */}
                        <section className="glass-card rounded-2xl overflow-hidden">
                            <SectionHeader icon="compare_arrows" iconColor="text-purple-500" title="สถานะการจับคู่" />
                            {data.unmatched ? (
                                <div className="p-4 space-y-4">
                                    {/* Statement reconcile status for this month's statements */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 14 }}>receipt_long</span>
                                            สถานะ Statement เดือนนี้
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-green-50 rounded-lg p-2 text-center">
                                                <p className="text-base font-extrabold text-green-600">{fmt(data.unmatched.statements_confirmed)}</p>
                                                <p className="text-[9px] text-green-500">ยืนยันแล้ว</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-2 text-center">
                                                <p className="text-base font-extrabold text-orange-500">{fmt(data.unmatched.statements_unconfirmed)}</p>
                                                <p className="text-[9px] text-orange-400">รอยืนยัน</p>
                                            </div>
                                        </div>
                                        {(data.unmatched.statements_confirmed + data.unmatched.statements_unconfirmed) > 0 && (
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(data.unmatched.statements_confirmed / (data.unmatched.statements_confirmed + data.unmatched.statements_unconfirmed)) * 100}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Statement logs status */}
                                    {data.summary?.statement_total > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-500">📄 Statement อัพทั้งหมด</span>
                                                <span className="font-bold">{fmt(data.summary.statement_total)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-green-600">✅ จับคู่แล้ว</span>
                                                <span className="font-bold text-green-600">{fmt(data.summary.statement_matched)}</span>
                                            </div>
                                            {data.summary.unreconciled_count > 0 && (
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-red-500">⏳ ค้าง</span>
                                                    <span className="font-bold text-red-500">{fmt(data.summary.unreconciled_count)} · ฿{fmt(data.summary.unreconciled_amount)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Order status */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 mb-2 flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>shopping_cart</span>
                                                ออเดอร์เดือนนี้
                                            </span>
                                            <button onClick={() => setShowOrderModal(true)} className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold cursor-pointer hover:underline">
                                                ดูรายละเอียด →
                                            </button>
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-green-50 rounded-lg p-2 text-center">
                                                <p className="text-base font-extrabold text-green-600">{fmt(data.unmatched.orders_delivered)}</p>
                                                <p className="text-[9px] text-green-500">เสร็จสิ้น</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2 text-center">
                                                <p className="text-base font-extrabold text-amber-600">{fmt(data.unmatched.orders_preapproved)}</p>
                                                <p className="text-[9px] text-amber-500">รอตรวจ</p>
                                            </div>
                                            {(() => {
                                                const otherCount = (data.unmatched.order_status_detail || []).reduce((sum, d) => d.status !== 'Delivered' && d.status !== 'PreApproved' ? sum + d.count : sum, 0);
                                                return otherCount > 0 ? (
                                                    <div className="bg-gray-50 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setShowOrderModal(true)}>
                                                        <p className="text-base font-extrabold text-gray-500">{fmt(otherCount)}</p>
                                                        <p className="text-[9px] text-gray-400">อื่นๆ</p>
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="p-5 text-center text-gray-400 text-xs">ไม่มีข้อมูล</p>
                            )}
                        </section>
                    </div>

                    {/* ===== ROW 4: COD Table (full-width) ===== */}
                    <section className="glass-card rounded-2xl overflow-hidden">
                        <SectionHeader icon="local_shipping" iconColor="text-amber-500" title="จัดการ COD (รายบุคคล)"
                            badge={data.summary.cod_diff !== 0 ? (
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${data.summary.cod_diff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    ส่วนต่าง: ฿{fmt(Math.abs(data.summary.cod_diff))} {data.summary.cod_diff > 0 ? '(ขาด)' : '(เกิน)'}
                                </span>
                            ) : null} />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                                        <th className="px-4 py-2 text-left">#</th>
                                        <th className="px-4 py-2 text-left">ชื่อ</th>
                                        <th className="px-4 py-2 text-center">รายการ</th>
                                        <th className="px-4 py-2 text-center text-green-500">ตรง</th>
                                        <th className="px-4 py-2 text-center text-red-500">ไม่ตรง</th>
                                        <th className="px-4 py-2 text-right">ยอด COD</th>
                                        <th className="px-4 py-2 text-right">รับจริง</th>
                                        <th className="px-4 py-2 text-right">ส่วนต่าง</th>
                                        <th className="px-4 py-2 text-center">อัตรา</th>
                                        <th className="px-4 py-2 text-left">ล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(data.cod_by_person || []).map((p, i) => {
                                        const matchPct = p.record_count > 0 ? ((p.matched_count / p.record_count) * 100) : 0;
                                        return (
                                            <tr key={p.user_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2 font-bold text-xs">{p.name}</td>
                                                <td className="px-4 py-2 text-center font-bold">{fmt(p.record_count)}</td>
                                                <td className="px-4 py-2 text-center font-bold text-green-600">{fmt(p.matched_count)}</td>
                                                <td className="px-4 py-2 text-center font-bold text-red-500">{p.unmatched_count > 0 ? p.unmatched_count : '-'}</td>
                                                <td className="px-4 py-2 text-right text-xs">฿{fmt(p.total_cod)}</td>
                                                <td className="px-4 py-2 text-right text-xs">฿{fmt(p.total_received)}</td>
                                                <td className="px-4 py-2 text-right">
                                                    {p.total_diff !== 0 ? (
                                                        <span className={`text-xs font-bold ${p.total_diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                            ฿{fmt(Math.abs(p.total_diff))}
                                                        </span>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${matchPct >= 99 ? 'bg-green-100 text-green-700' : matchPct >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        {matchPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-[10px] text-gray-400">{fmtDate(p.last_activity)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(!data.cod_by_person || data.cod_by_person.length === 0) && (
                                        <tr><td colSpan="10" className="px-4 py-6 text-center text-gray-400 text-xs">ไม่มีข้อมูล</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ===== ROW 5: Daily Activity (full-width) ===== */}
                    <section className="glass-card rounded-2xl overflow-hidden">
                        <SectionHeader icon="timeline" iconColor="text-indigo-500" title="กิจกรรมตรวจสอบยอดรายวัน" />
                        <div className="p-4">
                            {data.daily_reconcile && data.daily_reconcile.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 max-h-56 overflow-y-auto">
                                    {data.daily_reconcile.map((d) => {
                                        const maxCount = Math.max(...data.daily_reconcile.map(x => x.count));
                                        const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                                        return (
                                            <div key={d.date} className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-500 w-20 flex-shrink-0 font-mono text-[10px]">{d.date.split('-').reverse().join('/')}</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden relative">
                                                    <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-700">
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

                    {/* Order Status Modal */}
                    <OrderStatusModal data={data} show={showOrderModal} onClose={() => setShowOrderModal(false)} fmt={fmt} />
                </>
            )}
        </div>
    );
}

export default AccountingPage;

/* Order Status Detail Modal */
function OrderStatusModal({ data, show, onClose, fmt }) {
    if (!show || !data?.unmatched?.order_status_detail) return null;
    const statusLabels = {
        'Delivered': 'เสร็จสิ้น (Delivered)',
        'PreApproved': 'รอบัญชีตรวจ (PreApproved)',
        'Shipping': 'กำลังจัดส่ง (Shipping)',
        'Shipped': 'กำลังจัดส่ง (Shipped)',
        'Picking': 'กำลังจัดสินค้า (Picking)',
        'Pending': 'รอดำเนินการ (Pending)',
        'Returned': 'คืนสินค้า (Returned)',
        'Cancelled': 'ยกเลิก (Cancelled)',
        'Approved': 'อนุมัติแล้ว (Approved)',
        'Processing': 'กำลังดำเนินการ (Processing)',
        'Refunded': 'คืนเงิน (Refunded)',
    };
    const statusOrder = ['Delivered', 'PreApproved', 'Shipping', 'Shipped', 'Picking', 'Pending', 'Returned', 'Cancelled'];
    const statusColors = {
        'Delivered': 'bg-green-100 text-green-700',
        'PreApproved': 'bg-amber-100 text-amber-700',
        'Shipping': 'bg-indigo-100 text-indigo-700',
        'Shipped': 'bg-indigo-100 text-indigo-700',
        'Picking': 'bg-cyan-100 text-cyan-700',
        'Pending': 'bg-yellow-100 text-yellow-700',
        'Returned': 'bg-orange-100 text-orange-700',
        'Cancelled': 'bg-red-100 text-red-700',
        'Approved': 'bg-blue-100 text-blue-700',
        'Processing': 'bg-cyan-100 text-cyan-700',
        'Refunded': 'bg-pink-100 text-pink-700',
    };
    const details = [...data.unmatched.order_status_detail].sort((a, b) => {
        const ai = statusOrder.indexOf(a.status);
        const bi = statusOrder.indexOf(b.status);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const total = details.reduce((s, d) => s + d.count, 0);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">shopping_cart</span>
                        สถานะออเดอร์ทั้งหมด
                    </h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-sm text-gray-500">close</span>
                    </button>
                </div>
                <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {details.map((d) => {
                        const pct = total > 0 ? ((d.count / total) * 100) : 0;
                        return (
                            <div key={d.status} className="flex items-center gap-3 text-sm">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-36 text-center flex-shrink-0 ${statusColors[d.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {statusLabels[d.status] || d.status}
                                </span>
                                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                                    <div className={`h-full rounded-full ${d.status === 'Delivered' ? 'bg-green-400' : d.status === 'PreApproved' ? 'bg-amber-400' : 'bg-gray-300'}`} style={{ width: `${pct}%` }}></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700">
                                        {fmt(d.count)} ({pct.toFixed(1)}%)
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 w-20 text-right flex-shrink-0">฿{fmt(d.amount)}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>รวมทั้งหมด</span>
                    <span className="font-bold text-gray-800">{fmt(total)} ออเดอร์</span>
                </div>
            </div>
        </div>
    );
}

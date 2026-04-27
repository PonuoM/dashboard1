

function TeamSalesCards({ data, meta, cancellationTypes, onViewCancelledOrders, onViewReturnedOrders }) {
    const fmt = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    const daysInMonth = meta?.days_in_month || 31;
    const daysElapsed = meta?.days_elapsed || 1;

    const calcTrend = (row) => {
        const curr = parseFloat(row.total_sales) || 0;
        const prev = parseFloat(row.prev_month_sales) || 0;
        if (daysElapsed === 0) return { growth: 0 };
        const projected = (curr / daysElapsed) * daysInMonth;
        if (prev === 0) return { growth: projected > 0 ? 100 : 0 };
        return { growth: ((projected - prev) / prev) * 100 };
    };

    // Group by team (supervisor)
    const teams = {};
    const supervisorMap = {};

    // First pass: identify supervisors
    data.forEach(person => {
        if (person.role_name === 'Supervisor Telesale') {
            supervisorMap[person.user_id] = person;
        }
    });

    // Second pass: group into teams
    data.forEach(person => {
        let teamKey;
        if (person.role_name === 'Supervisor Telesale') {
            teamKey = person.user_id;
        } else if (person.supervisor_id && supervisorMap[person.supervisor_id]) {
            teamKey = person.supervisor_id;
        } else {
            teamKey = 'no_team';
        }

        if (!teams[teamKey]) {
            teams[teamKey] = {
                supervisor: supervisorMap[teamKey] || null,
                members: [],
                totalSales: 0,
            };
        }

        if (person.role_name !== 'Supervisor Telesale') {
            teams[teamKey].members.push(person);
        }
        teams[teamKey].totalSales += parseFloat(person.total_sales) || 0;
    });

    // Sort teams by total sales desc
    const sortedTeams = Object.entries(teams)
        .sort(([, a], [, b]) => b.totalSales - a.totalSales);

    // Global top 3 ranking (by net sales = total_sales - returned)
    const globalRanking = [...data]
        .map(p => ({ userId: p.user_id, net: (parseFloat(p.total_sales) || 0) - (parseFloat(p.returned_amount) || 0) }))
        .sort((a, b) => b.net - a.net);
    const medalMap = {};
    if (globalRanking[0]) medalMap[globalRanking[0].userId] = { emoji: '🥇', bg: 'bg-amber-400', text: 'text-white' };
    if (globalRanking[1]) medalMap[globalRanking[1].userId] = { emoji: '🥈', bg: 'bg-gray-400', text: 'text-white' };
    if (globalRanking[2]) medalMap[globalRanking[2].userId] = { emoji: '🥉', bg: 'bg-orange-400', text: 'text-white' };

    const teamColors = [
        { border: 'border-l-primary', headerBg: 'from-primary/5 to-amber-500/5', badge: 'bg-primary text-white' },
        { border: 'border-l-blue-500', headerBg: 'from-blue-50 to-indigo-50', badge: 'bg-blue-500 text-white' },
        { border: 'border-l-purple-500', headerBg: 'from-purple-50 to-pink-50', badge: 'bg-purple-500 text-white' },
        { border: 'border-l-emerald-500', headerBg: 'from-emerald-50 to-green-50', badge: 'bg-emerald-500 text-white' },
        { border: 'border-l-rose-500', headerBg: 'from-rose-50 to-red-50', badge: 'bg-rose-500 text-white' },
    ];

    const Tip = ({ text, position = 'center' }) => (
        <span className="group/tip relative inline-flex ml-0.5 cursor-help">
            <span className="material-symbols-outlined text-[11px] text-gray-300 group-hover/tip:text-primary">info</span>
            <span className={`absolute top-full mt-1 hidden group-hover/tip:block z-[9999] pointer-events-none ${position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                <span className="bg-gray-900 text-white text-[10px] rounded-lg py-1.5 px-2.5 whitespace-pre-line shadow-xl min-w-max max-w-xs block">{text}</span>
            </span>
        </span>
    );

    // Helper to extract amount for a specific cancellation type from cancelled_by_type
    const getTypeAmount = (row, typeId) => {
        const byType = row.cancelled_by_type || {};
        if (typeof byType === 'object' && byType[typeId]) {
            return { amount: byType[typeId].amount || 0, count: byType[typeId].count || 0 };
        }
        return { amount: 0, count: 0 };
    };

    // Short labels for cancellation types
    const cancelTypeShortLabels = {
        1: 'ก่อนเข้าระบบ',
        2: 'หลังเข้าระบบ',
        3: 'ปฏิเสธรับของ',
    };

    const renderRow = (row, index, isSupervisor = false, globalKey) => {
        const target = row.target_amount;
        const hasTarget = target !== null && target > 0;
        const totalSales = parseFloat(row.total_sales) || 0;
        const returnedAmt = parseFloat(row.returned_amount) || 0;
        const netSales = totalSales - returnedAmt;
        const progressPct = hasTarget ? Math.min((totalSales / target) * 100, 100) : 0;
        const cancelledAmt = parseFloat(row.cancelled_amount) || 0;
        const baddebtAmt = parseFloat(row.baddebt_amount) || 0;
        const trend = calcTrend(row);
        const isPos = trend.growth >= 0;

        // Extract individual cancellation type amounts
        const cancel1 = getTypeAmount(row, 1);
        const cancel2 = getTypeAmount(row, 2);
        const cancel3 = getTypeAmount(row, 3);

        const fertS = parseFloat(row.fertilizer_sales) || 0;
        const bioS = parseFloat(row.bio_sales) || 0;
        const fertO = parseInt(row.fertilizer_orders) || 0;
        const bioO = parseInt(row.bio_orders) || 0;
        const avgF = fertO > 0 ? Math.round(fertS / fertO) : 0;
        const avgB = bioO > 0 ? Math.round(bioS / bioO) : 0;

        const medal = medalMap[row.user_id];

        return (
            <tr key={globalKey} className={`text-xs transition-colors ${medal ? 'bg-gradient-to-r from-amber-50/30 to-transparent' : ''} ${isSupervisor ? 'bg-gradient-to-r from-amber-50/50 to-transparent hover:from-amber-50' : 'hover:bg-gray-50/50'}`}>
                <td className="px-2 py-2.5">
                    {medal ? (
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${medal.bg} ${medal.text} shadow-sm`}>
                            {medal.emoji}
                        </div>
                    ) : isSupervisor ? (
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] bg-amber-100 text-amber-700">
                            <span className="material-symbols-outlined text-sm">star</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 font-mono pl-1.5">{index}</span>
                    )}
                </td>
                <td className={`px-2 py-2.5 font-bold text-xs ${medal ? 'text-amber-800' : isSupervisor ? 'text-amber-800' : ''}`}>
                    {row.salesperson_name || 'N/A'}
                    {medal && <span className="ml-1 text-[9px] text-amber-500 font-bold">#{globalRanking.findIndex(g => g.userId === row.user_id) + 1}</span>}
                </td>
                <td className="px-2 py-2.5 text-[10px] text-gray-500">
                    {isSupervisor ? <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold">หัวหน้า</span> : (row.role_name || '-')}
                </td>

                {/* Sales */}
                <td className="px-2 py-2.5 text-right font-bold">฿{fmt(netSales)}</td>
                <td className="px-1 py-2.5 text-center text-orange-500 font-bold">{row.returned_count > 0 ? row.returned_count : <span className="text-gray-300">-</span>}</td>
                <td className="px-2 py-2.5 text-right">
                    {returnedAmt > 0 ? (
                        <button
                            onClick={() => onViewReturnedOrders?.({ userId: row.user_id, userName: row.salesperson_name })}
                            className="font-bold text-orange-500 hover:text-orange-700 cursor-pointer transition-colors hover:underline"
                        >
                            ฿{fmt(returnedAmt)}
                        </button>
                    ) : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-2 py-2.5 text-right font-bold text-blue-600">฿{fmt(totalSales)}</td>

                {/* Cancelled - 3 separate columns */}
                <td className="px-2 py-2.5 text-right">
                    {cancel1.amount > 0 ? (
                        <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 1, cancelTypeLabel: cancelTypeShortLabels[1] })} className="text-red-400 hover:text-red-700 font-bold cursor-pointer transition-colors hover:underline">
                            ฿{fmt(cancel1.amount)}
                        </button>
                    ) : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-2 py-2.5 text-right">
                    {cancel2.amount > 0 ? (
                        <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 2, cancelTypeLabel: cancelTypeShortLabels[2] })} className="text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors hover:underline">
                            ฿{fmt(cancel2.amount)}
                        </button>
                    ) : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-2 py-2.5 text-right">
                    {cancel3.amount > 0 ? (
                        <button onClick={() => onViewCancelledOrders?.({ userId: row.user_id, userName: row.salesperson_name, cancelTypeId: 3, cancelTypeLabel: cancelTypeShortLabels[3] })} className="text-red-600 hover:text-red-800 font-bold cursor-pointer transition-colors hover:underline">
                            ฿{fmt(cancel3.amount)}
                        </button>
                    ) : <span className="text-gray-300">-</span>}
                </td>
                
                <td className="px-2 py-2.5 text-right font-bold text-red-600">
                    {baddebtAmt > 0 ? `฿${fmt(baddebtAmt)}` : <span className="text-gray-300">-</span>}
                </td>

                {/* Product breakdown */}
                <td className="px-2 py-2.5 text-right border-l border-gray-50">฿{fmt(fertS)}</td>
                <td className="px-1 py-2.5 text-center font-bold text-emerald-600">{fertO}</td>
                <td className="px-2 py-2.5 text-right font-bold text-emerald-600">{fertO > 0 ? `฿${fmt(avgF)}` : '-'}</td>
                <td className="px-2 py-2.5 text-right border-l border-gray-50">฿{fmt(bioS)}</td>
                <td className="px-1 py-2.5 text-center font-bold text-amber-600">{bioO}</td>
                <td className="px-2 py-2.5 text-right font-bold text-amber-600">{bioO > 0 ? `฿${fmt(avgB)}` : '-'}</td>

                {/* Performance */}
                <td className="px-2 py-2.5 border-l border-gray-50">
                    {hasTarget ? (
                        <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-primary' : 'bg-red-400'}`} style={{ width: `${Math.min(progressPct, 100)}%` }}></div>
                            </div>
                            <span className="text-[9px] font-bold text-gray-500">{progressPct.toFixed(0)}%</span>
                            <span className="text-[8px] text-gray-400">฿{fmt(totalSales)} / ฿{fmt(target)}</span>
                        </div>
                    ) : <span className="text-[9px] text-gray-300 block text-center">-</span>}
                </td>
                <td className="px-2 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className="material-symbols-outlined text-[11px]">{isPos ? 'trending_up' : 'trending_down'}</span>
                        {Math.abs(trend.growth).toFixed(0)}%
                    </span>
                </td>
            </tr>
        );
    };

    const renderTotalRow = (team, teamKey) => {
        const allMembers = [...team.members, ...(team.supervisor ? [team.supervisor] : [])];
        let tNet = 0, tRet = 0, tRetCount = 0, tTot = 0, tBadDebt = 0;
        let tCan1 = 0, tCan2 = 0, tCan3 = 0;
        let tFertS = 0, tFertO = 0, tBioS = 0, tBioO = 0;
        
        allMembers.forEach(row => {
            const returnedAmt = parseFloat(row.returned_amount) || 0;
            const totalSales = parseFloat(row.total_sales) || 0;
            tNet += (totalSales - returnedAmt);
            tRet += returnedAmt;
            tRetCount += parseInt(row.returned_count) || 0;
            tTot += totalSales;
            tBadDebt += parseFloat(row.baddebt_amount) || 0;
            tCan1 += getTypeAmount(row, 1).amount;
            tCan2 += getTypeAmount(row, 2).amount;
            tCan3 += getTypeAmount(row, 3).amount;
            tFertS += parseFloat(row.fertilizer_sales) || 0;
            tFertO += parseInt(row.fertilizer_orders) || 0;
            tBioS += parseFloat(row.bio_sales) || 0;
            tBioO += parseInt(row.bio_orders) || 0;
        });

        const avgF = tFertO > 0 ? Math.round(tFertS / tFertO) : 0;
        const avgB = tBioO > 0 ? Math.round(tBioS / tBioO) : 0;

        return (
            <tr key={`total-${teamKey}`} className="bg-gradient-to-r from-gray-100 to-gray-50/50 border-t-2 border-gray-200">
                <td colSpan="3" className="px-2 py-3 text-right font-bold text-gray-700 text-xs">
                    รวมทั้งทีม
                </td>
                <td className="px-2 py-3 text-right font-bold text-xs text-gray-800">฿{fmt(tNet)}</td>
                <td className="px-1 py-3 text-center font-bold text-xs text-orange-600">{tRetCount}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-orange-600">฿{fmt(tRet)}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-blue-700">฿{fmt(tTot)}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-red-400">฿{fmt(tCan1)}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-red-500">฿{fmt(tCan2)}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-red-600">฿{fmt(tCan3)}</td>
                <td className="px-2 py-3 text-right font-bold text-xs text-red-700">฿{fmt(tBadDebt)}</td>
                <td className="px-2 py-3 text-right font-bold text-[10px] text-emerald-700 border-l border-gray-200/50">฿{fmt(tFertS)}</td>
                <td className="px-1 py-3 text-center font-bold text-xs text-emerald-700">{tFertO}</td>
                <td className="px-2 py-3 text-right font-bold text-[10px] text-emerald-700">฿{fmt(avgF)}</td>
                <td className="px-2 py-3 text-right font-bold text-[10px] text-amber-700 border-l border-gray-200/50">฿{fmt(tBioS)}</td>
                <td className="px-1 py-3 text-center font-bold text-xs text-amber-700">{tBioO}</td>
                <td className="px-2 py-3 text-right font-bold text-[10px] text-amber-700">฿{fmt(avgB)}</td>
                <td colSpan="2" className="border-l border-gray-200/50"></td>
            </tr>
        );
    };

    return (
        <div className="space-y-5">
            {sortedTeams.map(([teamKey, team], teamIndex) => {
                const color = teamColors[teamIndex % teamColors.length];
                const supervisor = team.supervisor;
                const members = [...team.members].sort((a, b) => parseFloat(b.total_sales) - parseFloat(a.total_sales));
                const teamName = supervisor ? `ทีม ${supervisor.salesperson_name}` : 'ไม่มีทีม';
                const memberCount = members.length + (supervisor ? 1 : 0);

                return (
                    <section key={teamKey} className={`glass-card rounded-3xl overflow-hidden border-l-4 ${color.border}`}>
                        {/* Team Header */}
                        <div className={`px-6 py-4 border-b border-glass-border bg-gradient-to-r ${color.headerBg} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${color.badge} flex items-center justify-center shadow-md`}>
                                    <span className="material-symbols-outlined text-lg">groups</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">{teamName}</h3>
                                    <p className="text-[10px] text-gray-500">{memberCount} คน</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-extrabold text-primary">฿{fmt(team.totalSales)}</p>
                                <p className="text-[10px] text-gray-400">ยอดรวมทีม</p>
                            </div>
                        </div>

                        {/* Team Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ minWidth: '1500px' }}>
                                <thead className="relative z-[100]">
                                    {/* Group Header Row */}
                                    <tr className="text-[9px] font-bold uppercase tracking-wider">
                                        <th colSpan="3" className="px-2 py-1.5"></th>
                                        <th colSpan="4" className="px-2 py-1.5 text-center border-b-2 border-blue-400">
                                            <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[9px]">
                                                <span className="material-symbols-outlined text-[11px]">payments</span>
                                                ยอดขาย
                                            </span>
                                        </th>
                                        <th colSpan="4" className="px-2 py-1.5 text-center border-b-2 border-red-300">
                                            <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full text-[9px]">
                                                <span className="material-symbols-outlined text-[11px]">block</span>
                                                ยกเลิก / หนี้สูญ
                                            </span>
                                        </th>
                                        <th colSpan="3" className="px-2 py-1.5 text-center border-b-2 border-emerald-400">
                                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[9px]">
                                                <span className="material-symbols-outlined text-[11px]">eco</span>
                                                ปุ๋ย
                                            </span>
                                        </th>
                                        <th colSpan="3" className="px-2 py-1.5 text-center border-b-2 border-amber-400">
                                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full text-[9px]">
                                                <span className="material-symbols-outlined text-[11px]">science</span>
                                                ชีวภัณฑ์
                                            </span>
                                        </th>
                                        <th colSpan="2" className="px-2 py-1.5 text-center border-b-2 border-gray-300">
                                            <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full text-[9px]">
                                                <span className="material-symbols-outlined text-[11px]">trending_up</span>
                                                ผลงาน
                                            </span>
                                        </th>
                                    </tr>
                                    {/* Column Header Row */}
                                    <tr className="text-[10px] font-bold tracking-wide border-b border-gray-200">
                                        <th className="px-2 py-2 text-gray-400 w-8"></th>
                                        <th className="px-2 py-2 text-gray-500">ชื่อ</th>
                                        <th className="px-2 py-2 text-gray-500">ตำแหน่ง</th>
                                        <th className="px-2 py-2 text-right text-gray-700">ยอดสุทธิ<Tip text="ยอดขาย หักตีกลับแล้ว" /></th>
                                        <th className="px-1 py-2 text-center text-orange-500">ออเดอร์<Tip text="จำนวนออเดอร์ที่ตีกลับ" /></th>
                                        <th className="px-2 py-2 text-right text-orange-500">ตีกลับ</th>
                                        <th className="px-2 py-2 text-right text-blue-600">ยอดรวม<Tip text="ยอดสุทธิ + ตีกลับ (Gross)" /></th>
                                        <th className="px-2 py-2 text-right text-red-400">ก่อนเข้า<Tip text="ยกเลิกก่อนเข้าระบบ" /></th>
                                        <th className="px-2 py-2 text-right text-red-500">หลังเข้า<Tip text="ยกเลิกหลังเข้าระบบ" /></th>
                                        <th className="px-2 py-2 text-right text-red-600">ปฏิเสธรับ<Tip text="ลูกค้าปฏิเสธการรับสินค้า" /></th>
                                        <th className="px-2 py-2 text-right text-red-700">หนี้สูญ</th>
                                        <th className="px-2 py-2 text-right text-emerald-600 border-l border-gray-100">ยอด(฿)</th>
                                        <th className="px-1 py-2 text-center text-emerald-600">ออเดอร์</th>
                                        <th className="px-2 py-2 text-right text-emerald-600">เฉลี่ย/OD</th>
                                        <th className="px-2 py-2 text-right text-amber-600 border-l border-gray-100">ยอด(฿)</th>
                                        <th className="px-1 py-2 text-center text-amber-600">ออเดอร์</th>
                                        <th className="px-2 py-2 text-right text-amber-600">เฉลี่ย/OD</th>
                                        <th className="px-2 py-2 text-center text-gray-500 border-l border-gray-100">เป้า</th>
                                        <th className="px-2 py-2 text-center text-gray-500">เทียบเดือนก่อน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {supervisor && renderRow(supervisor, 0, true, `sup-${teamKey}`)}
                                    {members.map((member, i) => renderRow(member, i + 1, false, `mem-${member.user_id}`))}
                                    {renderTotalRow(team, teamKey)}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}

            <style>{`
                @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

export default TeamSalesCards;

function Top3Podium({ data }) {
    const top3 = [...data].sort((a, b) => parseFloat(b.total_sales) - parseFloat(a.total_sales)).slice(0, 3);
    const fmt = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

    const medals = [
        { bg: 'from-amber-400 to-yellow-500', ring: 'ring-amber-300', icon: '🥇', label: '1st' },
        { bg: 'from-gray-300 to-gray-400', ring: 'ring-gray-300', icon: '🥈', label: '2nd' },
        { bg: 'from-orange-400 to-amber-600', ring: 'ring-orange-300', icon: '🥉', label: '3rd' },
    ];

    if (top3.length === 0) return null;

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-base">emoji_events</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-700">Top 3 ยอดขาย</h3>
                    <p className="text-[10px] text-gray-400">อันดับประจำเดือน</p>
                </div>
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                {top3.map((person, i) => {
                    const medal = medals[i];
                    const totalSales = parseFloat(person.total_sales) || 0;
                    const returnedAmt = parseFloat(person.returned_amount) || 0;
                    const netSales = totalSales - returnedAmt;

                    return (
                        <div key={person.user_id} className={`flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r ${i === 0 ? 'from-amber-50 to-yellow-50 border border-amber-200/50' : 'from-gray-50 to-white border border-gray-100'} transition-all hover:shadow-sm`}>
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${medal.bg} text-white flex items-center justify-center text-sm font-extrabold shadow-sm flex-shrink-0`}>
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${i === 0 ? 'text-amber-800' : 'text-gray-700'}`}>
                                    {person.salesperson_name}
                                </p>
                                <p className="text-[10px] text-gray-400">{person.role_name === 'Supervisor Telesale' ? 'หัวหน้า' : 'Telesale'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-extrabold ${i === 0 ? 'text-amber-600' : 'text-primary'}`}>
                                    ฿{fmt(netSales)}
                                </p>
                                <p className="text-[9px] text-gray-400">{person.total_orders} OD</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Top3Podium;

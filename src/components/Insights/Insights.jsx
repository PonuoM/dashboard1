function Insights({ data, summary, months, currentMonth, currentYear }) {
    // Helper calculations
    const topPerformer = data[0]; // Assuming sorted by sales
    const totalSales = summary.reduce((sum, s) => sum + (parseFloat(s.total_sales) || 0), 0);

    // Calc ratio
    const bioData = summary.find(s => s.product_type === 'bio') || { total_sales: 0 };
    const fertData = summary.find(s => s.product_type === 'fertilizer') || { total_sales: 0 };
    const total = (parseFloat(bioData.total_sales) + parseFloat(fertData.total_sales)) || 1;
    const bioPercent = Math.round((bioData.total_sales / total) * 100);
    const fertPercent = Math.round((fertData.total_sales / total) * 100);

    return (
        <section className="glass-card rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold">ข้อมูลเชิงลึก</h3>
                    <p className="text-xs text-gray-600">สรุปผลการดำเนินงาน</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Insight 1: Top Performer */}
                <div className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary/30 before:rounded-full">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">พนักงานยอดเยี่ยม</h4>
                    <p className="text-sm leading-relaxed text-gray-800">
                        <span className="font-bold">{topPerformer?.salesperson_name || 'N/A'}</span> มียอดขายสูงสุด
                        <span className="text-primary font-bold"> ฿{new Intl.NumberFormat('th-TH').format(topPerformer?.total_sales || 0)}</span>
                    </p>
                </div>

                {/* Insight 2: Product Ratio */}
                <div className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-green-400/30 before:rounded-full">
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">สัดส่วนสินค้า</h4>
                    <p className="text-sm leading-relaxed text-gray-800">
                        อัตราส่วน <span className="font-bold">ชีวภัณฑ์ : ปุ๋ย</span> = <span className="font-bold">{bioPercent}:{fertPercent}</span> ในเดือนนี้
                        {bioPercent > 40
                            ? " สมดุลดี!"
                            : " โอกาสเพิ่มยอดขายชีวภัณฑ์"}
                    </p>
                </div>

                {/* Insight 3: Status */}
                <div className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-400/30 before:rounded-full">
                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">สถานะรายงาน</h4>
                    <p className="text-sm leading-relaxed text-gray-800">
                        สร้างเมื่อ <span className="font-bold">{new Date().toLocaleDateString('th-TH')}</span>
                        รายได้รวมทั้งเดือน <span className="font-bold">฿{new Intl.NumberFormat('th-TH').format(totalSales)}</span>
                    </p>
                </div>
            </div>

            <div className="mt-10 p-5 rounded-2xl bg-primary/10 border border-primary/20">
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">lightbulb</span>
                    คำแนะนำ
                </h4>
                <p className="text-xs text-gray-700 leading-normal">
                    มุ่งเน้นการเสนอขาย <strong>ชีวภัณฑ์</strong> เพิ่มเติมให้ลูกค้าปุ๋ยเพื่อเพิ่มยอดขายต่อตะกร้าและกำไรโดยรวม
                </p>
            </div>
        </section>
    );
}

export default Insights;

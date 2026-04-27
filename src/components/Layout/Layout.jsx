import { useState } from 'react';
import Sidebar from './Sidebar';

function Layout({ user, onLogout, children, currentPage, onPageChange }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Page title mapping
    const pageTitles = {
        'executive-insight': { title: 'สรุปภาพรวม', subtitle: 'Executive Insight' },
        'dashboard': { title: 'ภาพรวมบริษัท', subtitle: 'Dashboard' },
        'sales': { title: 'รายงาน Telesale', subtitle: 'รายงานรายเดือน' },
        'talk-time': { title: 'Talk Time', subtitle: 'สถิติการโทร' },
        'returned-details': { title: 'รายละเอียดตีกลับ', subtitle: 'รายงาน Telesale' },
        'admin-sales': { title: 'รายงานยอดขาย', subtitle: 'Admin Reports' },
        'page-analysis': { title: 'วิเคราะห์ Page', subtitle: 'Admin Reports' },
        'ads-summary': { title: 'สรุป Ads', subtitle: 'Admin Reports' },
        'product-analysis': { title: 'วิเคราะห์ผลิตภัณฑ์', subtitle: 'รายงาน' },
        'regional-sales': { title: 'ยอดขายตามภูมิภาค', subtitle: 'รายงาน' },
        'team': { title: 'ทีมงาน', subtitle: 'จัดการ' },
        'inventory': { title: 'คลังสินค้า', subtitle: 'จัดการ' },
    };
    const currentTitle = pageTitles[currentPage] || { title: currentPage, subtitle: 'Dashboard' };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                user={user}
                onLogout={onLogout}
                isExpanded={sidebarExpanded}
                setIsExpanded={setSidebarExpanded}
                currentPage={currentPage}
                onPageChange={onPageChange}
            />

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${sidebarExpanded ? 'ml-56' : 'ml-20'
                }`}>

                {/* Top Navbar */}
                <header className="flex items-center justify-between px-8 py-4 glass-card border-b border-glass-border sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold tracking-tight text-[#161513]">
                            {currentTitle.title}
                        </h1>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                        <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">
                            {currentTitle.subtitle}
                        </span>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;

import { useState } from 'react';
import logo from '../icon/logo.png';
import logo1 from '../icon/Logo1.png';
import logo2 from '../icon/Logo2.png';
import logoFree from '../icon/Logofree.png';

function Sidebar({ user, onLogout, isExpanded, setIsExpanded, currentPage, onPageChange }) {
    const [openMenus, setOpenMenus] = useState({});

    // Check if user is Supervisor Telesale (restricted access)
    const isSupervisor = user?.role === 'Supervisor Telesale';

    // Navigation items with categories
    const navItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'แดชบอร์ด', disabled: isSupervisor },
        {
            id: 'telesale-reports',
            icon: 'headset_mic',
            label: 'Telesale Reports',
            isCategory: true,
            children: [
                { id: 'sales', icon: 'analytics', label: 'รายงาน Telesale' },
                { id: 'talk-time', icon: 'call', label: 'Talk Time' },
            ]
        },
        {
            id: 'admin-reports',
            icon: 'admin_panel_settings',
            label: 'Admin Reports',
            isCategory: true,
            disabled: isSupervisor,
            children: [
                { id: 'admin-sales', icon: 'analytics', label: 'รายงานยอดขาย', disabled: isSupervisor },
                { id: 'page-analysis', icon: 'troubleshoot', label: 'วิเคราะห์ Page', disabled: isSupervisor },
                { id: 'ads-summary', icon: 'campaign', label: 'สรุป Ads', disabled: isSupervisor },
            ]
        },
        { id: 'product-analysis', icon: 'inventory', label: 'วิเคราะห์ผลิตภัณฑ์' },
        { id: 'individual-sales', icon: 'person_search', label: 'ยอดขายรายบุคคล', disabled: isSupervisor },
        { id: 'regional-sales', icon: 'map', label: 'ยอดขายตามภูมิภาค' },
        { id: 'accounting', icon: 'account_balance', label: 'รายงานบัญชี', disabled: isSupervisor },
        { id: 'team', icon: 'groups', label: 'ทีมงาน', disabled: true },
        { id: 'inventory', icon: 'inventory_2', label: 'คลังสินค้า', disabled: true },
    ];

    const toggleMenu = (menuId) => {
        // If sidebar is collapsed, expand it first
        if (!isExpanded) {
            setIsExpanded(true);
            // Open the menu after sidebar expands
            setOpenMenus(prev => ({
                ...prev,
                [menuId]: true
            }));
        } else {
            // Toggle menu normally
            setOpenMenus(prev => ({
                ...prev,
                [menuId]: !prev[menuId]
            }));
        }
    };

    const isMenuOpen = (menuId) => openMenus[menuId] || false;

    const isChildActive = (item) => {
        if (!item.children) return false;
        return item.children.some(child => child.id === currentPage);
    };

    const renderNavItem = (item, isChild = false) => {
        const isActive = currentPage === item.id || isChildActive(item);
        const isDisabled = item.disabled;
        const hasChildren = item.children && item.children.length > 0;
        const menuOpen = isMenuOpen(item.id);

        if (hasChildren) {
            return (
                <div key={item.id} className="w-full">
                    <button
                        onClick={() => toggleMenu(item.id)}
                        className={`w-full p-3 rounded-xl transition-all duration-300 flex items-center gap-3 overflow-hidden ${isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-400 hover:text-primary hover:bg-primary/5'
                            } ${!isExpanded ? 'justify-center' : ''}`}
                        title={item.label}
                    >
                        <span className="material-symbols-outlined flex-shrink-0">{item.icon}</span>
                        <span
                            className={`text-sm font-medium whitespace-nowrap transition-all duration-300 flex-1 text-left ${isExpanded
                                ? 'opacity-100 max-w-[150px] translate-x-0'
                                : 'opacity-0 max-w-0 -translate-x-2'
                                }`}
                        >
                            {item.label}
                        </span>
                        {isExpanded && (
                            <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        )}
                    </button>

                    {/* Submenu */}
                    <div
                        className={`overflow-hidden transition-all duration-300 ${menuOpen && isExpanded
                            ? 'max-h-40 opacity-100'
                            : 'max-h-0 opacity-0'
                            }`}
                    >
                        <div className="pl-4 mt-1 space-y-1">
                            {item.children.map(child => renderNavItem(child, true))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <button
                key={item.id}
                onClick={() => !isDisabled && onPageChange && onPageChange(item.id)}
                disabled={isDisabled}
                className={`w-full p-3 rounded-xl transition-all duration-300 flex items-center gap-3 overflow-hidden ${isActive
                    ? 'bg-primary/10 text-primary'
                    : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-primary hover:bg-primary/5'
                    } ${!isExpanded ? 'justify-center' : ''} ${isChild ? 'py-2' : ''}`}
                title={item.label}
            >
                <span className={`material-symbols-outlined flex-shrink-0 ${isChild ? 'text-lg' : ''}`}>{item.icon}</span>
                <span
                    className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isExpanded
                        ? 'opacity-100 max-w-[150px] translate-x-0'
                        : 'opacity-0 max-w-0 -translate-x-2'
                        }`}
                >
                    {item.label}
                </span>
            </button>
        );
    };

    return (
        <aside
            className={`flex flex-col items-center py-8 glass-card border-r border-glass-border z-20 fixed left-0 top-0 bottom-0 transition-all duration-300 ease-in-out ${isExpanded ? 'w-56' : 'w-20'
                }`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute -right-3 top-20 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-30"
                title={isExpanded ? 'ย่อ' : 'ขยาย'}
            >
                <span className="material-symbols-outlined text-sm">
                    {isExpanded ? 'chevron_left' : 'chevron_right'}
                </span>
            </button>

            {/* Logo - based on company */}
            <div className="mb-10">
                <img
                    src={user?.company_id === 1 ? logo1 : user?.company_id === 2 ? logo2 : logoFree}
                    alt="Company Logo"
                    className="w-10 h-10 object-contain"
                />
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2 flex-1 w-full px-3">
                {navItems.map((item) => renderNavItem(item))}
            </nav>

            {/* User Profile */}
            <div className={`mt-auto flex items-center gap-3 transition-all duration-300 ${isExpanded ? 'px-3 w-full' : ''}`}>
                <div
                    className="w-10 h-10 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden cursor-pointer flex-shrink-0"
                    onClick={onLogout}
                    title="ออกจากระบบ"
                >
                    <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                </div>
                <div
                    className={`overflow-hidden transition-all duration-300 ${isExpanded
                        ? 'opacity-100 max-w-[150px] translate-x-0'
                        : 'opacity-0 max-w-0 -translate-x-2'
                        }`}
                >
                    <p className="text-sm font-bold text-gray-700 truncate">{user?.first_name || user?.username || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.role || 'Employee'}</p>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

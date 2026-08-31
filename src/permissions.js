// Role-based page access — single source of truth
// ใช้ทั้งการ render หน้า (App.jsx) และการแสดงเมนู (Sidebar.jsx)
// null = ทุก role ที่ login ได้เข้าถึงได้
// Backoffice = สิทธิ์ดูเทียบเท่า Admin Control (เห็นข้อมูลทั้งบริษัท)
export const PAGE_ACCESS = {
    'executive-insight': ['Admin Control', 'Backoffice'],
    'dashboard': null,
    'sales': ['Admin Control', 'Backoffice', 'Supervisor Telesale', 'Telesale'],
    'talk-time': ['Admin Control', 'Backoffice', 'Supervisor Telesale', 'Telesale'],
    'returned-details': ['Admin Control', 'Backoffice', 'Supervisor Telesale', 'Admin Page'],
    'admin-sales': ['Admin Control', 'Backoffice', 'Admin Page'],
    'page-analysis': ['Admin Control', 'Backoffice', 'Admin Page'],
    'ads-summary': ['Admin Control', 'Backoffice', 'Admin Page'],
    'product-analysis': null,
    'individual-sales': ['Admin Control', 'Backoffice'],
    'regional-sales': null,
    'accounting': ['Admin Control', 'Backoffice'],
};

export const canAccessPage = (role, pageId) => {
    const allowed = PAGE_ACCESS[pageId];
    if (allowed === undefined) return false;
    if (allowed === null) return true;
    const roleLc = (role || '').toLowerCase();
    return allowed.some(r => r.toLowerCase() === roleLc);
};

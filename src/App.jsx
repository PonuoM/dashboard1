import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './Login'
import { Layout } from './components/Layout'
import { SalesReportPage } from './pages/SalesReport'
import { DashboardPage } from './pages/Dashboard'
import { ProductAnalysisPage } from './pages/ProductAnalysis'
import { RegionalSalesPage } from './pages/RegionalSales'
import { TalkTimePage } from './pages/TalkTime'
import { ReturnedDetailsPage } from './pages/ReturnedDetails'
import { AdminSalesReportPage } from './pages/AdminSalesReport'
import { PageAnalysisPage } from './pages/PageAnalysis'
import { AdsSummaryPage } from './pages/AdsSummary'
import { IndividualSalesPage } from './pages/IndividualSales'
import { AccountingPage } from './pages/Accounting'
import { ExecutiveInsightPage } from './pages/ExecutiveInsight'
import { canAccessPage } from './permissions'

function App() {
  // User state from localStorage
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  // Current page state - read from localStorage or default to dashboard
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('currentPage')
    return savedPage || 'dashboard'
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    // Set default page based on role (Supervisor ยังเริ่มที่หน้ารายงาน Telesale เหมือนเดิม)
    const defaultPage = userData?.role === 'Supervisor Telesale' ? 'sales' : 'dashboard'
    setCurrentPage(defaultPage)
    localStorage.setItem('currentPage', defaultPage)
  }

  // SSO handoff จาก CRM: ?sso_token=<token> (query ก่อน hash เพราะใช้ HashRouter)
  // token ใน URL ชนะ user เดิมใน localStorage เสมอ — กันเคส CRM ส่งมาเป็นคนละคน
  const [ssoChecking, setSsoChecking] = useState(() =>
    !!new URLSearchParams(window.location.search).get('sso_token')
  )
  const [ssoError, setSsoError] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('sso_token')
    if (!token) return
    // ล้าง token ออกจาก address bar / history ทันที (เก็บ hash route เดิมไว้)
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)

    fetch('./api/sso.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          handleLogin(data.user)
        } else {
          setUser(null)
          localStorage.removeItem('user')
          setSsoError(data.message || 'เข้าสู่ระบบผ่าน CRM ไม่สำเร็จ')
        }
      })
      .catch(() => {
        setSsoError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      })
      .finally(() => setSsoChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('currentPage')
  }

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId)
    localStorage.setItem('currentPage', pageId)
  }

  // กำลัง verify SSO token — โชว์ loading กันหน้า login กระพริบ
  if (ssoChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">กำลังเข้าสู่ระบบจาก CRM...</p>
      </div>
    )
  }

  // If not logged in, show login page
  if (!user) {
    return <Login onLogin={handleLogin} initialError={ssoError} />
  }

  // Render current page content — pages the role cannot access fall back to dashboard
  const renderPage = () => {
    const page = canAccessPage(user?.role, currentPage) ? currentPage : 'dashboard'
    switch (page) {
      case 'sales':
        return <SalesReportPage user={user} />
      case 'product-analysis':
        return <ProductAnalysisPage user={user} />
      case 'regional-sales':
        return <RegionalSalesPage user={user} />
      case 'talk-time':
        return <TalkTimePage user={user} />
      case 'returned-details':
        return <ReturnedDetailsPage user={user} />
      case 'admin-sales':
        return <AdminSalesReportPage user={user} />
      case 'page-analysis':
        return <PageAnalysisPage user={user} />
      case 'ads-summary':
        return <AdsSummaryPage user={user} />
      case 'individual-sales':
        return <IndividualSalesPage user={user} />
      case 'accounting':
        return <AccountingPage user={user} />
      case 'executive-insight':
        return <ExecutiveInsightPage user={user} />
      case 'dashboard':
      default:
        return <DashboardPage user={user} />
    }
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="*"
          element={
            <Layout
              user={user}
              onLogout={handleLogout}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            >
              {renderPage()}
            </Layout>
          }
        />
      </Routes>
    </HashRouter>
  )
}

export default App

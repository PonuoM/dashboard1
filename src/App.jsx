import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './Login'
import { Layout } from './components/Layout'
import { SalesReportPage } from './pages/SalesReport'
import { DashboardPage } from './pages/Dashboard'
import { ProductAnalysisPage } from './pages/ProductAnalysis'
import { RegionalSalesPage } from './pages/RegionalSales'
import { TalkTimePage } from './pages/TalkTime'
import { AdminSalesReportPage } from './pages/AdminSalesReport'
import { PageAnalysisPage } from './pages/PageAnalysis'
import { AdsSummaryPage } from './pages/AdsSummary'
import { IndividualSalesPage } from './pages/IndividualSales'
import { AccountingPage } from './pages/Accounting'

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
    // Set default page based on role
    const defaultPage = userData?.role === 'Supervisor Telesale' ? 'sales' : 'dashboard'
    setCurrentPage(defaultPage)
    localStorage.setItem('currentPage', defaultPage)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('currentPage')
  }

  const handlePageChange = (pageId) => {
    setCurrentPage(pageId)
    localStorage.setItem('currentPage', pageId)
  }

  // If not logged in, show login page
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // Render current page content
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        // Redirect Supervisor Telesale to sales page
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
        return <DashboardPage user={user} />
      case 'sales':
        return <SalesReportPage user={user} />
      case 'product-analysis':
        return <ProductAnalysisPage user={user} />
      case 'regional-sales':
        return <RegionalSalesPage user={user} />
      case 'talk-time':
        return <TalkTimePage user={user} />
      case 'admin-sales':
        // Redirect Supervisor Telesale to sales page
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
        return <AdminSalesReportPage user={user} />
      case 'page-analysis':
        // Redirect Supervisor Telesale to sales page
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
        return <PageAnalysisPage user={user} />
      case 'ads-summary':
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
        return <AdsSummaryPage user={user} />
      case 'individual-sales':
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
        return <IndividualSalesPage user={user} />
      case 'accounting':
        return <AccountingPage user={user} />
      default:
        if (user?.role === 'Supervisor Telesale') {
          return <SalesReportPage user={user} />
        }
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

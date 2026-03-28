import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function openMenu() {
    setSidebarOpen(true)
    document.documentElement.classList.add('layout-menu-expanded')
  }

  function closeMenu() {
    setSidebarOpen(false)
    document.documentElement.classList.remove('layout-menu-expanded')
  }

  function toggleMenu() {
    if (sidebarOpen) closeMenu()
    else openMenu()
  }

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <Sidebar open={sidebarOpen} onClose={closeMenu} />

        <div className="layout-page" style={{ marginLeft: 260, minHeight: '100vh' }}>
          <Navbar onMenuToggle={toggleMenu} />

          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <Outlet />
            </div>

            <footer className="content-footer footer bg-footer-theme">
              <div className="container-fluid d-flex justify-content-between py-2 px-4 flex-wrap gap-2">
                <div className="text-muted small">
                  © {new Date().getFullYear()} <strong>TakvimApp</strong>
                </div>
                <div className="text-muted small">
                  Eğitim Takvimi &amp; Gelir Takibi
                </div>
              </div>
            </footer>

            <div className="content-backdrop fade" />
          </div>
        </div>
      </div>
    </div>
  )
}

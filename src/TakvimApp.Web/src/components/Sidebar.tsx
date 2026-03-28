import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  to: string
  icon: string
  label: string
  group?: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { to: '/app',           icon: 'ri-calendar-2-line',          label: 'Takvim' },
  { to: '/app/gelir',     icon: 'ri-money-dollar-circle-line', label: 'Gelir', group: 'ANALİZ' },
  { to: '/app/raporlar',  icon: 'ri-bar-chart-grouped-line',   label: 'Raporlar' },
  { to: '/app/beklenen',  icon: 'ri-calendar-todo-line',       label: 'Beklenen Eğitimler' },
  { to: '/app/ayarlar',   icon: 'ri-settings-3-line',          label: 'Ayarlar', group: 'SİSTEM' },
  { to: '/app/admin',     icon: 'ri-shield-user-line',         label: 'Admin Paneli', adminOnly: true },
]

function getStoredTheme(): 'dark' | 'light' {
  return (localStorage.getItem('takvimapp_theme') as 'dark' | 'light') ?? 'light'
}

function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  localStorage.setItem('takvimapp_theme', theme)
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState<boolean>(getStoredTheme() === 'dark')

  useEffect(() => { applyTheme(getStoredTheme()) }, [])

  function toggleDark() {
    const next = dark ? 'light' : 'dark'
    setDark(!dark)
    applyTheme(next)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const visibleItems = menuItems.filter(item => !(item.adminOnly && !isAdmin))

  let lastGroup: string | undefined = undefined

  return (
    <>
      {open && (
        <div className="layout-overlay layout-menu-toggle" onClick={onClose} />
      )}

      <aside
        id="layout-menu"
        className={`layout-menu menu-vertical menu bg-menu-theme${open ? ' show' : ''}`}
        style={{ position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 1045, width: 260 }}
      >
        {/* Brand */}
        <div className="app-brand demo">
          <NavLink to="/app" className="app-brand-link" onClick={onClose}>
            <span className="app-brand-logo demo me-2">
              <span style={{
                display: 'flex', width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #26a69a 0%, #80cbc4 100%)',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff',
              }}>
                <i className="ri ri-calendar-2-line" style={{ fontSize: 18 }} />
              </span>
            </span>
            <span className="app-brand-text demo menu-text fw-bold">TakvimApp</span>
          </NavLink>
          <button
            className="layout-menu-toggle menu-link ms-auto"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            <i className="ri ri-close-line ri-20px" />
          </button>
        </div>

        <div className="menu-inner-shadow" />

        <ul className="menu-inner py-1">
          {visibleItems.map((item) => {
            const showGroup = !!(item.group && item.group !== lastGroup)
            if (item.group) lastGroup = item.group
            return (
              <MenuItemRow key={item.to} item={item} showGroup={showGroup} onClose={onClose} />
            )
          })}

          <li className="menu-item mt-auto">
            <div className="menu-divider my-2" />
          </li>

          <li className="menu-item">
            <button
              className="menu-link d-flex align-items-center gap-2 w-100"
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={toggleDark}
            >
              <i className={`menu-icon icon-base ri ${dark ? 'ri-sun-line' : 'ri-moon-line'}`} />
              <div>{dark ? 'Gündüz Modu' : 'Gece Modu'}</div>
            </button>
          </li>

          <li className="menu-item">
            <button
              className="menu-link d-flex align-items-center gap-2 w-100"
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={handleLogout}
            >
              <i className="menu-icon icon-base ri ri-logout-box-r-line" />
              <div>Çıkış Yap</div>
            </button>
          </li>
        </ul>
      </aside>
    </>
  )
}

function MenuItemRow({
  item, showGroup, onClose,
}: { item: MenuItem; showGroup: boolean; onClose: () => void }) {
  return (
    <>
      {showGroup && (
        <li className="menu-header small text-uppercase mt-2">
          <span className="menu-header-text">{item.group}</span>
        </li>
      )}
      <li className="menu-item">
        <NavLink
          to={item.to}
          end={item.to === '/app'}
          className={({ isActive }) => `menu-link${isActive ? ' active' : ''}`}
          onClick={onClose}
        >
          <i className={`menu-icon icon-base ri ${item.icon}`} />
          <div>{item.label}</div>
        </NavLink>
      </li>
    </>
  )
}

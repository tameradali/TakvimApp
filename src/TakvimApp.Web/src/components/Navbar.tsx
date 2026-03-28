import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

interface NavbarProps {
  onMenuToggle: () => void
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initial = (user?.kullaniciAdi ?? 'U')[0].toUpperCase()

  return (
    <nav className="layout-navbar navbar navbar-expand-xl align-items-center bg-navbar-theme">
      <div className="container-fluid px-4 d-flex align-items-center">
        <button
          className="layout-menu-toggle d-xl-none btn btn-sm me-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}
          onClick={onMenuToggle}
        >
          <i className="ri ri-menu-line ri-22px" />
        </button>

        <div className="flex-grow-1" />

        <div className="nav-item dropdown position-relative">
          <button
            className="nav-link d-flex align-items-center gap-2 btn px-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #26a69a, #80cbc4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0,
            }}>
              {initial}
            </span>
            <span className="d-none d-sm-inline fw-medium">
              {user?.kullaniciAdi ?? 'Kullanıcı'}
            </span>
            <i className="ri ri-arrow-down-s-line ri-18px" />
          </button>

          {dropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 1040 }} onClick={() => setDropdownOpen(false)} />
              <ul className="dropdown-menu dropdown-menu-end show" style={{ zIndex: 1050, minWidth: 180 }}>
                <li>
                  <div className="dropdown-item-text">
                    <div className="fw-medium">{user?.kullaniciAdi}</div>
                    <small className="text-muted">Kullanıcı</small>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2"
                    onClick={() => { setDropdownOpen(false); navigate('/app/ayarlar') }}
                  >
                    <i className="ri ri-settings-3-line ri-16px" />
                    Ayarlar
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 text-danger"
                    onClick={handleLogout}
                  >
                    <i className="ri ri-logout-box-r-line ri-16px" />
                    Çıkış Yap
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

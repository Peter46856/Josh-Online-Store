
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Link to="/" className="site-logo" onClick={closeMenu}>Plumbing & Irrigation Store</Link>
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      <nav className={`site-nav ${menuOpen ? 'open' : ''}`}>
        {user ? (
          <>
            <Link to="/cart" onClick={closeMenu}>Cart</Link>
            <Link to="/orders" onClick={closeMenu}>My Orders</Link>
            <Link to="/my-enquiries" onClick={closeMenu}>My Enquiries</Link>
            {user.role === 'ADMIN' && (
              <>
                <Link to="/admin/dashboard" onClick={closeMenu}>Dashboard (Admin)</Link>
                <Link to="/admin/products" onClick={closeMenu}>Products (Admin)</Link>
                <Link to="/admin/orders" onClick={closeMenu}>Orders (Admin)</Link>
                <Link to="/admin/enquiries" onClick={closeMenu}>Enquiries (Admin)</Link>
              </>
            )}
            <span className="nav-user">Hi, {user.name}</span>
            <button onClick={handleLogout} className="nav-logout">Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu}>Log In</Link>
            <Link to="/signup" onClick={closeMenu}>Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const roleLabel = 'User';

  const handleLogout = () => {
    const shouldLogout = window.confirm('Do you want to log out?');

    if (shouldLogout) {
      logout();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          RB Task Manager
        </Link>

        {isAuthenticated && (
          <div className="navbar-menu">
            <div className="navbar-user-card">
              <span className="navbar-user-avatar" aria-hidden="true">
                {userInitial}
              </span>
              <div className="navbar-user-meta">
                <span className="navbar-user-label">Signed in as</span>
                <span className="navbar-user">{user?.name}</span>
                <span className="navbar-user-role">{roleLabel}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-logout"
              aria-label="Logout"
              title="Logout"
              type="button"
            >
              <span className="power-icon" aria-hidden="true">
                &#x23FB;
              </span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

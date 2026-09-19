import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSession, signOut } from '../lib/auth-client'
import '../styles/Header.css'

export default function Header() {
  const { totalCount } = useCart()
  const { data: session } = useSession()

  return (
    <header className="header">
      <Link to="/" className="header__brand">
        🛍️ E-Shop
      </Link>
      <nav className="header__nav">
        <Link to="/">Products</Link>
        <Link to="/cart" className="header__cart-link">
          Cart
          {totalCount > 0 && <span className="header__cart-badge">{totalCount}</span>}
        </Link>
        {session ? (
          <>
            <Link to="/orders">My Orders</Link>
            <span className="header__user">{session.user.email}</span>
            <button className="header__signout-btn" onClick={() => signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  )
}

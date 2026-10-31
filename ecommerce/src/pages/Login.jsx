import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn, useSession } from '../lib/auth-client'
import '../styles/Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const navigate = useNavigate()
  const location = useLocation()
  const { refetch } = useSession()

  function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')

    signIn.email(
      { email, password },
      {
        onSuccess: async () => {
          // refresh the cached session first, or RequireAuth sees it as signed-out and bounces back to /login
          await refetch()
          navigate(location.state?.from?.pathname ?? '/', { replace: true })
        },
        onError: () => setStatus('error'),
      }
    )
  }

  return (
    <section className="auth">
      <h1>Sign in</h1>
      <p>Sign in to place an order and view your order history.</p>
      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="auth__field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="auth__field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {status === 'error' && <p className="auth__error">Invalid email or password.</p>}
        <button className="auth__submit-btn" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth__switch">
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </section>
  )
}

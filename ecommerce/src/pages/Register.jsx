import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signUp, useSession } from '../lib/auth-client'
import '../styles/Auth.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { refetch } = useSession()

  function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')

    signUp.email(
      { name, email, password },
      {
        onSuccess: async () => {
          // refresh the cached session first, or RequireAuth sees it as signed-out and bounces back to /login
          await refetch()
          navigate(location.state?.from?.pathname ?? '/', { replace: true })
        },
        onError: (ctx) => {
          setError(ctx.error?.message ?? 'Could not create account.')
          setStatus('error')
        },
      }
    )
  }

  return (
    <section className="auth">
      <h1>Create an account</h1>
      <p>Sign up to place orders and view your order history.</p>
      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="auth__field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {status === 'error' && <p className="auth__error">{error}</p>}
        <button className="auth__submit-btn" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth__switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}

import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../lib/auth-client'

export default function RequireAuth({ children }) {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return null
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

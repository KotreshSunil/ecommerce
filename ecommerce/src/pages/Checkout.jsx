import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import '../styles/Checkout.css'

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart()
  const placed = useRef(false)
  const [status, setStatus] = useState('placing')

  useEffect(() => {
    if (placed.current) return
    placed.current = true

    if (items.length === 0) {
      setStatus('placed')
      return
    }

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items, total: totalPrice }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Order failed')
        return res.json()
      })
      .then(() => {
        clearCart()
        setStatus('placed')
      })
      .catch(() => setStatus('error'))
  }, [items, totalPrice, clearCart])

  if (status === 'placing') {
    return (
      <section className="checkout">
        <p>Placing your order…</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="checkout">
        <div className="checkout__icon">⚠️</div>
        <h1>Something went wrong</h1>
        <p>We couldn't place your order. Your cart has been left untouched — please try again.</p>
        <Link to="/cart" className="checkout__continue-btn">
          Back to cart
        </Link>
      </section>
    )
  }

  return (
    <section className="checkout">
      <div className="checkout__icon">✅</div>
      <h1>Order placed!</h1>
      <p>Thanks for your order.</p>
      <Link to="/" className="checkout__continue-btn">
        Continue Shopping
      </Link>
    </section>
  )
}

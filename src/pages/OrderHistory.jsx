import { useEffect, useState } from 'react'
import '../styles/OrderHistory.css'

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch('/api/orders/mine', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load orders')
        return res.json()
      })
      .then((data) => {
        setOrders(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') {
    return (
      <section className="order-history">
        <h1>My Orders</h1>
        <p>Loading orders…</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="order-history">
        <h1>My Orders</h1>
        <p>Couldn't load orders. Please try again later.</p>
      </section>
    )
  }

  if (orders.length === 0) {
    return (
      <section className="order-history">
        <h1>My Orders</h1>
        <p>You haven't placed any orders yet.</p>
      </section>
    )
  }

  return (
    <section className="order-history">
      <h1>My Orders</h1>
      <ul className="order-history__list">
        {orders.map((order) => (
          <li key={order.id} className="order-history__item">
            <div className="order-history__item-header">
              <span>Order #{order.id}</span>
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <ul className="order-history__lines">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.qty} × {item.name}
                </li>
              ))}
            </ul>
            <div className="order-history__total">Total: ${order.total.toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

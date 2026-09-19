import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import '../styles/Cart.css'

export default function Cart() {
  const { items, updateQty, removeItem, totalPrice } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <section className="cart cart--empty">
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/">Browse products</Link>
      </section>
    )
  }

  return (
    <section className="cart">
      <h1>Your Cart</h1>
      <ul className="cart__list">
        {items.map((item) => (
          <li key={item.id} className="cart__item">
            <div className="cart__item-info">
              <span className="cart__item-name">{item.name}</span>
              <span className="cart__item-price">${item.price.toFixed(2)} each</span>
            </div>
            <div className="cart__item-controls">
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => updateQty(item.id, Math.max(1, Number(e.target.value) || 1))}
              />
              <span className="cart__item-subtotal">${(item.qty * item.price).toFixed(2)}</span>
              <button className="cart__remove-btn" onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="cart__summary">
        <span>Total</span>
        <span className="cart__total">${totalPrice.toFixed(2)}</span>
      </div>
      <button className="cart__checkout-btn" onClick={() => navigate('/checkout')}>
        Place Order
      </button>
    </section>
  )
}

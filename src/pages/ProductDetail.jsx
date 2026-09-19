import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setStatus('loading')
    setProduct(null)
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found')
        return res.json()
      })
      .then((data) => {
        setProduct(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'loading') {
    return (
      <section className="product-detail">
        <p>Loading…</p>
      </section>
    )
  }

  if (status === 'error' || !product) {
    return (
      <section className="product-detail">
        <p>Product not found.</p>
        <Link to="/">Back to products</Link>
      </section>
    )
  }

  function handleAddToCart() {
    addItem(product, qty)
    setAdded(true)
  }

  return (
    <section className="product-detail">
      <button className="product-detail__back" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="product-detail__content">
        <div className="product-detail__image">{product.emoji}</div>
        <div className="product-detail__info">
          <span className="product-detail__category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-detail__price">${product.price.toFixed(2)}</p>
          <p className="product-detail__description">{product.description}</p>

          <div className="product-detail__actions">
            <label htmlFor="qty">Quantity</label>
            <input
              id="qty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
            <button className="product-detail__add-btn" onClick={handleAddToCart}>
              Add to Cart
            </button>
          </div>

          {added && (
            <p className="product-detail__added-msg">
              Added to cart! <Link to="/cart">View cart</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

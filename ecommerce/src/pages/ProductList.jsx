import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import '../styles/ProductList.css'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load products')
        return res.json()
      })
      .then((data) => {
        setProducts(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') {
    return (
      <section className="product-list">
        <h1>Products</h1>
        <p>Loading products…</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="product-list">
        <h1>Products</h1>
        <p>Couldn't load products. Please try again later.</p>
      </section>
    )
  }

  return (
    <section className="product-list">
      <h1>Products</h1>
      <div className="product-list__grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  quantity: number;
  available: boolean;
  imageUrl: string | null;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/products`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/categories`).then((res) => res.json()),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>Error: {error}</p>;

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.categoryId === selectedCategoryId)
    : products;

  return (
    <div className="app">
      <div className="hero-band">
        <h1>Plumbing & Irrigation Store</h1>
        <p>Pipes, fittings, pumps and irrigation kits — in stock, ready for pickup or delivery.</p>
      </div>

      <div className="category-filters">
        <button
          className={selectedCategoryId === null ? 'active' : ''}
          onClick={() => setSelectedCategoryId(null)}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={selectedCategoryId === category.id ? 'active' : ''}
            onClick={() => setSelectedCategoryId(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <Link to={`/products/${product.id}`} key={product.id} className="product-card-link">
            <div className="product-card">
              <div className="product-card-image">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <div className="product-card-placeholder">No image</div>
                )}
              </div>
              <h3>{product.name}</h3>
              {product.description && <p className="product-description">{product.description}</p>}
              <p className="product-price">KSh {product.price}</p>
              <p className="product-category">{product.category.name}</p>
              <p className={product.available ? 'in-stock' : 'out-of-stock'}>
                {product.available ? `In stock (${product.quantity})` : 'Unavailable'}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && <p className="no-results">No products in this category yet.</p>}
    </div>
  );
}

export default ProductsPage;
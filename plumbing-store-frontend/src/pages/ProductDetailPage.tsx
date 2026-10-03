import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  quantity: number;
  available: boolean;
  imageUrl: string | null;
  category: {
    id: number;
    name: string;
  };
}

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquiryQuantity, setEnquiryQuantity] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryStatus, setEnquiryStatus] = useState<string | null>(null);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const { token } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setAddStatus(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: Number(id), quantity }),
      });

      if (!res.ok) throw new Error('Failed to add to cart');
      setAddStatus('Added to cart!');
    } catch (err) {
      setAddStatus('Something went wrong.');
    }
  };

  const handleSubmitEnquiry = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!enquiryMessage.trim()) {
      setEnquiryStatus('Please enter a message.');
      return;
    }

    setEnquirySubmitting(true);
    setEnquiryStatus(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: Number(id),
          quantity: enquiryQuantity ? Number(enquiryQuantity) : null,
          message: enquiryMessage,
          phone: enquiryPhone || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit enquiry');

      setEnquiryStatus("Enquiry sent! We'll get back to you soon.");
      setEnquiryMessage('');
      setEnquiryQuantity('');
      setEnquiryPhone('');
    } catch (err) {
      setEnquiryStatus('Something went wrong. Please try again.');
    } finally {
      setEnquirySubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error || !product) return <p>Error: {error}</p>;

  return (
    <div className="app">
      <Link to="/" className="back-link">← Back to products</Link>
      <div className="product-detail">
        <div className="product-detail-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="product-card-placeholder">No image</div>
          )}
        </div>
        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-category">{product.category.name}</p>
          {product.description && <p className="product-description">{product.description}</p>}
          <p className="product-price">KSh {product.price}</p>
          <p className={product.available ? 'in-stock' : 'out-of-stock'}>
            {product.available ? `In stock (${product.quantity} available)` : 'Currently unavailable'}
          </p>

          {product.available && (
            <>
              <div className="add-to-cart-row">
                <input
                  type="number"
                  min={1}
                  max={product.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <button onClick={handleAddToCart}>Add to Cart</button>
              </div>

              <div className="enquiry-section">
                <button
                  className="enquiry-toggle"
                  onClick={() => setShowEnquiryForm(!showEnquiryForm)}
                >
                  {showEnquiryForm ? 'Cancel enquiry' : 'Ask about bulk pricing / enquire'}
                </button>

                {showEnquiryForm && (
                  <div className="enquiry-form">
                    <label>Quantity you're interested in (optional)</label>
                    <input
                      type="number"
                      min={1}
                      value={enquiryQuantity}
                      onChange={(e) => setEnquiryQuantity(e.target.value)}
                      placeholder="e.g. 200"
                    />
                    <label>Phone number (optional)</label>
                    <input
                      type="tel"
                      value={enquiryPhone}
                      onChange={(e) => setEnquiryPhone(e.target.value)}
                      placeholder="0712345678"
                    />
                    <label>Message</label>
                    <textarea
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      rows={3}
                      placeholder="Ask about pricing, availability, delivery..."
                    />
                    {enquiryStatus && <p className="enquiry-status">{enquiryStatus}</p>}
                    <button onClick={handleSubmitEnquiry} disabled={enquirySubmitting}>
                      {enquirySubmitting ? 'Sending...' : 'Send Enquiry'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {addStatus && <p className="add-status">{addStatus}</p>}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
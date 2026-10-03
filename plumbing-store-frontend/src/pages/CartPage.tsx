import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string;
    imageUrl: string | null;
  };
}

interface Cart {
  id: number;
  items: CartItem[];
}

function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetch(`${API_BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCart(data);
        setLoading(false);
      });
  };

  useEffect(fetchCart, [token]);

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    fetchCart();
  };

  const removeItem = async (itemId: number) => {
    await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCart();
  };

  if (loading) return <p>Loading cart...</p>;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="app">
        <h1>Your Cart</h1>
        <p>Your cart is empty. <Link to="/">Browse products</Link></p>
      </div>
    );
  }

  const total = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  return (
    <div className="app">
      <h1>Your Cart</h1>
      <div className="cart-list">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-row">
            <div className="cart-row-info">
              <h3>{item.product.name}</h3>
              <p>KSh {item.product.price} each</p>
            </div>
            <div className="cart-row-controls">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
            </div>
            <p className="cart-row-subtotal">KSh {(Number(item.product.price) * item.quantity).toFixed(2)}</p>
            <button className="cart-row-remove" onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="cart-total">
        <span>Total</span>
        <span>KSh {total.toFixed(2)}</span>
      </div>
      <Link to="/checkout" className="checkout-button">Proceed to Checkout</Link>
    </div>
  );
}

export default CartPage;
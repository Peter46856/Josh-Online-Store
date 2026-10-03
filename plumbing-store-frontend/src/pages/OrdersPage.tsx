import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Order {
  id: number;
  totalPrice: string;
  status: string;
  createdAt: string;
}

function OrdersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetch(`${API_BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div className="app">
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="cart-list">
          {orders.map((order) => (
            <Link to={`/orders/${order.id}`} key={order.id} className="order-row">
              <span>Order #{order.id}</span>
              <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
              <span>KSh {order.totalPrice}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Order {
  id: number;
  totalPrice: string;
  status: string;
  paymentMethod: string;
  deliveryAddress: string;
  createdAt: string;
  user: { id: number; name: string; email: string };
  items: { id: number; quantity: number; product: { name: string } }[];
}

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function AdminOrdersPage() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const location = useLocation();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const fetchOrders = () => {
    fetch(`${API_BASE_URL}/api/orders/admin/all`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  };

  useEffect(fetchOrders, [token]);

  useEffect(() => {
    if (location.hash) {
      const match = location.hash.match(/order-(\d+)/);
      if (match) {
        const targetId = Number(match[1]);
        setHighlightedId(targetId);
        // Wait for the orders list to actually render before trying to scroll to it
        setTimeout(() => {
          document.getElementById(`order-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [location.hash, orders]);

  const updateStatus = async (orderId: number, status: string) => {
    await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  if (user && user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }
  if (loading) return <p>Loading orders...</p>;

  const filteredOrders = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="app">
      <h1>Manage Orders</h1>

      <div className="category-filters">
        <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      <div className="admin-enquiry-list">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            id={`order-${order.id}`}
            className={`admin-enquiry-card ${highlightedId === order.id ? 'order-highlighted' : ''}`}
          >
            <div className="admin-enquiry-header">
              <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
              <span className="admin-enquiry-date">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <p><strong>Order #{order.id}</strong> — {order.user.name} ({order.user.email})</p>
            <p>{order.items.map((item) => `${item.product.name} ×${item.quantity}`).join(', ')}</p>
            <p>KSh {order.totalPrice} — {order.paymentMethod} — {order.deliveryAddress}</p>

            <div className="order-status-control">
              <label>Update status:</label>
              <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminOrdersPage;
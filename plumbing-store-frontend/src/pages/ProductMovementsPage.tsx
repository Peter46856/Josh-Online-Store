import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Movement {
  id: number;
  change: number;
  reason: string;
  note: string | null;
  createdAt: string;
  order: { id: number } | null;
}

function ProductMovementsPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/api/products/${id}/movements`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMovements(data);
        setLoading(false);
      });

    fetch(`${API_BASE_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProductName(data.name));
  }, [id, token]);

  if (!user || user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }

  if (loading) return <p>Loading history...</p>;

  return (
    <div className="app">
      <Link to="/admin/products" className="back-link">
        ← Back to products
      </Link>
      <h1>Stock History: {productName}</h1>

      {movements.length === 0 ? (
        <p>No stock movements recorded yet.</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Order</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    {new Date(m.createdAt).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td
                    className={
                      m.change < 0 ? 'movement-negative' : 'movement-positive'
                    }
                  >
                    {m.change > 0 ? `+${m.change}` : m.change}
                  </td>
                  <td>{m.reason}</td>
                  <td>
                    {m.order ? (
                      <Link to={`/admin/orders`}>#{m.order.id}</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProductMovementsPage;
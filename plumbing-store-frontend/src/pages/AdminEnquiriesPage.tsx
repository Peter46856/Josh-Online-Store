import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Enquiry {
  id: number;
  quantity: number | null;
  status: string;
  createdAt: string;
  product: { id: number; name: string } | null;
  user: { id: number; name: string; email: string };
  messages: { text: string; senderRole: string; createdAt: string }[];
}

function AdminEnquiriesPage() {
  const { token, user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/enquiries`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Access denied or failed to load');
        return res.json();
      })
      .then((data) => {
        setEnquiries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  if (user && user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }

  if (loading) return <p>Loading enquiries...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="app">
      <h1>Enquiries</h1>
      {enquiries.length === 0 ? (
        <p>No enquiries yet.</p>
      ) : (
        <div className="admin-enquiry-list">
          {enquiries.map((enquiry) => {
            const lastMessage = enquiry.messages[0];
            return (
              <Link to={`/admin/enquiries/${enquiry.id}`} key={enquiry.id} className="admin-enquiry-card enquiry-card-link">
                <div className="admin-enquiry-header">
                  <span className={`status-badge status-${enquiry.status.toLowerCase()}`}>{enquiry.status}</span>
                  <span className="admin-enquiry-date">{new Date(enquiry.createdAt).toLocaleDateString()}</span>
                </div>
                <p><strong>{enquiry.user.name}</strong> ({enquiry.user.email})</p>
                {enquiry.product && (
                  <p>Product: {enquiry.product.name}{enquiry.quantity ? ` — qty ${enquiry.quantity}` : ''}</p>
                )}
                {lastMessage && (
                  <p className="admin-enquiry-message">
                    {lastMessage.senderRole === 'ADMIN' ? 'You: ' : 'Customer: '}"{lastMessage.text}"
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminEnquiriesPage;
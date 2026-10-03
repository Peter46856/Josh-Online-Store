import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Enquiry {
  id: number;
  quantity: number | null;
  status: string;
  createdAt: string;
  product: { id: number; name: string } | null;
  messages: { text: string; senderRole: string; createdAt: string }[];
}

function MyEnquiriesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetch(`${API_BASE_URL}/api/enquiries/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEnquiries(data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <p>Loading your enquiries...</p>;

  return (
    <div className="app">
      <h1>My Enquiries</h1>
      {enquiries.length === 0 ? (
        <p>You haven't sent any enquiries yet.</p>
      ) : (
        <div className="admin-enquiry-list">
          {enquiries.map((enquiry) => {
            const lastMessage = enquiry.messages[0];
            return (
              <Link to={`/enquiries/${enquiry.id}`} key={enquiry.id} className="admin-enquiry-card enquiry-card-link">
                <div className="admin-enquiry-header">
                  <span className={`status-badge status-${enquiry.status.toLowerCase()}`}>{enquiry.status}</span>
                  <span className="admin-enquiry-date">{new Date(enquiry.createdAt).toLocaleDateString()}</span>
                </div>
                {enquiry.product && (
                  <p>Product: {enquiry.product.name}{enquiry.quantity ? ` — qty ${enquiry.quantity}` : ''}</p>
                )}
                {lastMessage && (
                  <p className="admin-enquiry-message">
                    {lastMessage.senderRole === 'ADMIN' ? 'Store: ' : 'You: '}"{lastMessage.text}"
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

export default MyEnquiriesPage;
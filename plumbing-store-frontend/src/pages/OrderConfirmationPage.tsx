import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface OrderItem {
  id: number;
  quantity: number;
  price: string;
  product: {
    name: string;
  };
}

interface Order {
  id: number;
  totalPrice: string;
  status: string;
  paymentMethod: string;
  deliveryAddress: string;
  createdAt: string;
  items: OrderItem[];
  paymentPhone: string | null;
  paymentCardLast4: string | null;
}

function OrderConfirmationPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('You must be logged in to view this order');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, token]);

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber,
          cardExpiry,
          cardCvv,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPayError(data.error || 'Payment failed');
        setPaying(false);
        return;
      }

      setOrder(data);
    } catch (err) {
      setPayError('Something went wrong during payment processing.');
    } finally {
      setPaying(false);
    }
  };

  const handleMpesaPay = async () => {
    setPaying(true);
    setPayError(null);
    setMpesaStatus(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}/mpesa/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayError(data.error || 'Failed to send payment prompt');
        setPaying(false);
        return;
      }

      setMpesaStatus('Check your phone and enter your M-Pesa PIN...');
      pollForConfirmation();
    } catch (err) {
      setPayError('Something went wrong.');
      setPaying(false);
    }
  };

  const pollForConfirmation = () => {
    let attempts = 0;
    const maxAttempts = 15; // ~45 seconds at 3s intervals

    const interval = setInterval(async () => {
      attempts++;
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}/mpesa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status === 'CONFIRMED') {
        clearInterval(interval);
        setMpesaStatus(null);
        setPaying(false);
        // Refetch the full order so the receipt shows the new status
        fetch(`${API_BASE_URL}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then(setOrder);
        return;
      }

      if (data.failed) {
        clearInterval(interval);
        setMpesaStatus(null);
        setPaying(false);
        setPayError(`Payment not completed: ${data.reason || 'please try again'}`);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setMpesaStatus(null);
        setPaying(false);
        setPayError('No response received — please try again.');
      }
    }, 3000);
  };

  if (loading) return <p>Loading order...</p>;
  if (error || !order) return <p>Error: {error}</p>;

  return (
    <div className="app">
      <div className="receipt">
        <h1>Order Confirmed</h1>
        <p className="receipt-order-number">Order #{order.id}</p>
        <p className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</p>

        {order.status === 'PENDING' && (
          <div className="pay-section">
            {order.paymentMethod === 'M-Pesa' && (
              <div className="pay-fields">
                <label>M-Pesa phone number</label>
                <input
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {order.paymentMethod === 'Debit/Credit Card' && (
              <div className="pay-fields">
                <label>Card number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <div className="pay-fields-row">
                  <div>
                    <label>Expiry</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {order.paymentMethod === 'PayPal' && (
              <p className="pay-paypal-note">
                You'll be redirected to PayPal to approve this payment.
              </p>
            )}

            <button
              onClick={order.paymentMethod === 'M-Pesa' ? handleMpesaPay : handlePay}
              disabled={paying}
              className="pay-button"
            >
              {paying
                ? mpesaStatus || 'Processing payment...'
                : `Pay KSh ${order.totalPrice} via ${order.paymentMethod}`}
            </button>
            {payError && <p className="form-error">{payError}</p>}
            <p className="pay-disclaimer">
              Simulated payment for development — no real charge will occur.
            </p>
          </div>
        )}

        <div className="receipt-section">
          <h3>Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="receipt-line">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>KSh {(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="receipt-section receipt-total">
          <span>Total</span>
          <span>KSh {order.totalPrice}</span>
        </div>

        <div className="receipt-section">
          <h3>Delivery</h3>
          <p>{order.deliveryAddress}</p>
        </div>

        <div className="receipt-section">
          <h3>Payment</h3>
          <p>{order.paymentMethod}</p>
          {order.paymentPhone && <p>Phone: {order.paymentPhone}</p>}
          {order.paymentCardLast4 && <p>Card ending in {order.paymentCardLast4}</p>}
        </div>

        <p className="receipt-date">
          Placed on {new Date(order.createdAt).toLocaleDateString()}
        </p>

        <Link to="/" className="back-link">
          ← Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;
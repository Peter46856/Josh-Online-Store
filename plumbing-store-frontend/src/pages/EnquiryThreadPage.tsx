import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Message {
    id: number;
    senderRole: 'CUSTOMER' | 'ADMIN';
    text: string;
    createdAt: string;
}

interface EnquiryThread {
    id: number;
    status: string;
    quantity: number | null;
    phone: string | null;
    product: {
        id: number;
        name: string;
        price: string;
        imageUrl: string | null;
        description: string | null;
    } | null;
    user: { id: number; name: string; email: string };
    messages: Message[];
}

interface Product {
    id: number;
    name: string;
    price: string;
}

interface OrderLineItem {
    productId: number;
    quantity: number;
    price: number;
}

function EnquiryThreadPage() {
    const { id } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [thread, setThread] = useState<EnquiryThread | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [showConvertForm, setShowConvertForm] = useState(false);
    const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [convertStatus, setConvertStatus] = useState<string | null>(null);
    const [converting, setConverting] = useState(false);

    const fetchThread = () => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetch(`${API_BASE_URL}/api/enquiries/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error('Enquiry not found');
                return res.json();
            })
            .then((data) => {
                setThread(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(fetchThread, [id, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread?.messages.length]);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetch(`${API_BASE_URL}/api/products`)
                .then((res) => res.json())
                .then(setProducts);
        }
    }, [user]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        setSending(true);

        try {
            await fetch(`${API_BASE_URL}/api/enquiries/${id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: newMessage }),
            });
            setNewMessage('');
            fetchThread();
        } finally {
            setSending(false);
        }
    };

    const startConvert = () => {
        setShowConvertForm(true);
        setConvertStatus(null);
        setDeliveryAddress('');
        setPaymentMethod('M-Pesa');
        if (thread?.product) {
            const initialPrice = parseFloat(thread.product.price) || 0;
            setOrderItems([
                { productId: thread.product.id, quantity: thread.quantity ?? 1, price: initialPrice },
            ]);
        } else if (products.length > 0) {
            const initialPrice = parseFloat(products[0].price) || 0;
            setOrderItems([{ productId: products[0].id, quantity: 1, price: initialPrice }]);
        } else {
            setOrderItems([]);
        }
    };

    const updateLineItem = (index: number, field: keyof OrderLineItem, value: number) => {
        setOrderItems((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;

                if (field === 'productId') {
                    const selectedProduct = products.find((p) => p.id === value);
                    const defaultPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
                    return { ...item, productId: value, price: defaultPrice };
                }

                return { ...item, [field]: value };
            })
        );
    };

    const addLineItem = () => {
        if (products.length === 0) return;
        const defaultPrice = parseFloat(products[0].price) || 0;
        setOrderItems((prev) => [...prev, { productId: products[0].id, quantity: 1, price: defaultPrice }]);
    };

    const removeLineItem = (index: number) => {
        setOrderItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleConvert = async () => {
        if (orderItems.length === 0 || !deliveryAddress.trim()) {
            setConvertStatus('Add at least one item and a delivery address.');
            return;
        }
        if (orderItems.some((item) => item.price <= 0)) {
            setConvertStatus('Every item needs a price greater than 0.');
            return;
        }

        setConverting(true);
        setConvertStatus(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/enquiries/${id}/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ items: orderItems, paymentMethod, deliveryAddress }),
            });

            const data = await res.json();

            if (!res.ok) {
                setConvertStatus(data.error || 'Failed to convert enquiry');
                setConverting(false);
                return;
            }

            setConvertStatus(`Order #${data.id} created successfully.`);
            setShowConvertForm(false);
            fetchThread();
        } catch (err) {
            setConvertStatus('Something went wrong.');
        } finally {
            setConverting(false);
        }
    };

    if (loading) return <p>Loading conversation...</p>;
    if (error || !thread) return <p>Error: {error}</p>;

    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="app">
            <Link to={isAdmin ? '/admin/enquiries' : '/my-enquiries'} className="back-link">
                ← Back to enquiries
            </Link>

            <div className="chat-container">
                <div className="chat-header">
                    <div className="chat-header-top">
                        <div>
                            <p className="chat-header-label">
                                {isAdmin ? `Enquiry from ${thread.user.name}` : 'Your Enquiry'}
                            </p>
                            {isAdmin && <p className="chat-header-email">{thread.user.email}</p>}
                            {thread.phone && <p className="chat-header-phone">Phone: {thread.phone}</p>}
                        </div>
                        <span className={`status-badge status-${thread.status.toLowerCase()}`}>{thread.status}</span>
                    </div>

                    {thread.product && (
                        <Link to={`/products/${thread.product.id}`} className="chat-product-card">
                            <div className="chat-product-image">
                                {thread.product.imageUrl ? (
                                    <img src={thread.product.imageUrl} alt={thread.product.name} />
                                ) : (
                                    <div className="product-card-placeholder">No image</div>
                                )}
                            </div>
                            <div className="chat-product-info">
                                <h3>{thread.product.name}</h3>
                                <p className="chat-product-price">KSh {thread.product.price} each</p>
                                {thread.quantity && <p className="chat-product-qty">Enquiring about: {thread.quantity} units</p>}
                            </div>
                        </Link>
                    )}
                </div>

                <div className="chat-messages">
                    {thread.messages.map((msg) => {
                        const isMine = isAdmin ? msg.senderRole === 'ADMIN' : msg.senderRole === 'CUSTOMER';
                        return (
                            <div key={msg.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                                <div className="chat-bubble">
                                    <p>{msg.text}</p>
                                    <span className="chat-bubble-time">
                                        {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {isAdmin && thread.status !== 'CLOSED' && (
                    <div className="convert-section">
                        {showConvertForm ? (
                            <div className="convert-form">
                                <h4>Create order from this enquiry</h4>
                                {orderItems.map((item, index) => (
                                    <div key={index} className="convert-line-item">
                                        <select
                                            value={item.productId}
                                            onChange={(e) => updateLineItem(index, 'productId', Number(e.target.value))}
                                        >
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                                            placeholder="Qty"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.price || ''}
                                            onChange={(e) => updateLineItem(index, 'price', Number(e.target.value))}
                                            placeholder="Price each"
                                        />
                                        <button type="button" onClick={() => removeLineItem(index)}>×</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addLineItem} className="add-item-button">+ Add another item</button>

                                <label>Delivery address</label>
                                <textarea
                                    rows={2}
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                />
                                <label>Payment method</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="M-Pesa">M-Pesa</option>
                                    <option value="Debit/Credit Card">Debit/Credit Card</option>
                                    <option value="PayPal">PayPal</option>
                                </select>

                                {convertStatus && <p className="convert-status">{convertStatus}</p>}

                                <div className="convert-actions">
                                    <button onClick={handleConvert} disabled={converting}>
                                        {converting ? 'Creating order...' : 'Confirm & Create Order'}
                                    </button>
                                    <button type="button" onClick={() => setShowConvertForm(false)} className="cancel-button">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button className="convert-toggle" onClick={startConvert}>
                                Convert to Order
                            </button>
                        )}
                    </div>
                )}

                {thread.status !== 'CLOSED' ? (
                    <div className="chat-input-row">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                            Send
                        </button>
                    </div>
                ) : (
                    <p className="chat-closed-note">This enquiry has been closed and converted to an order.</p>
                )}
            </div>
        </div>
    );
}

export default EnquiryThreadPage;
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  quantity: number;
  available: boolean;
  categoryId: number;
  lowStockThreshold: number;
  category: { id: number; name: string };
}

function AdminProductsPage() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Product>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', quantity: '', categoryId: '',
  });
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const fetchAll = () => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/products`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/categories`).then((res) => res.json()),
    ]).then(([productsData, categoriesData]) => {
      setProducts(productsData);
      setCategories(categoriesData);
      setLoading(false);
    });
  };

  useEffect(fetchAll, []);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditDraft({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      quantity: product.quantity,
      categoryId: product.categoryId,
      available: product.available,
      lowStockThreshold: product.lowStockThreshold,
    });
  };

  const saveEdit = async (id: number) => {
    await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...editDraft,
        price: Number(editDraft.price),
        quantity: Number(editDraft.quantity),
        categoryId: Number(editDraft.categoryId),
        lowStockThreshold: Number(editDraft.lowStockThreshold),
      }),
    });
    setEditingId(null);
    fetchAll();
  };

  const toggleAvailable = async (product: Product) => {
    await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ available: !product.available }),
    });
    fetchAll();
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) {
      setFormStatus('Name, price, and category are required.');
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newProduct.name,
        description: newProduct.description || null,
        price: Number(newProduct.price),
        quantity: Number(newProduct.quantity) || 0,
        categoryId: Number(newProduct.categoryId),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setFormStatus(data.error || 'Failed to add product');
      return;
    }

    setNewProduct({ name: '', description: '', price: '', quantity: '', categoryId: '' });
    setShowAddForm(false);
    setFormStatus(null);
    fetchAll();
  };

  const handleRestock = async (productId: number) => {
    const amount = Number(restockAmount);
    if (!amount || amount <= 0) return;

    await fetch(`${API_BASE_URL}/api/products/${productId}/restock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, note: restockNote || undefined }),
    });

    setRestockingId(null);
    setRestockAmount('');
    setRestockNote('');
    fetchAll();
  };

  const handleImageUpload = async (productId: number, file: File) => {
    setUploadingId(productId);
    const formData = new FormData();
    formData.append('image', file);

    await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type — the browser sets it, boundary included
      body: formData,
    });

    setUploadingId(null);
    fetchAll();
  };

  if (user && user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }
  if (loading) return <p>Loading products...</p>;

  const lowStockCount = products.filter((p) => p.quantity <= p.lowStockThreshold).length;
  const visibleProducts = showLowStockOnly
    ? products.filter((p) => p.quantity <= p.lowStockThreshold)
    : products;

  return (
    <div className="app">
      <div className="admin-page-header">
        <h1>Manage Products</h1>
        <div className="admin-header-actions">
          <button
            className={`low-stock-toggle ${showLowStockOnly ? 'active' : ''}`}
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            {lowStockCount > 0 && <span className="low-stock-count">{lowStockCount}</span>}
            Low Stock
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="admin-add-button">
            {showAddForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="admin-add-form">
          <input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
          <input placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
          <input type="number" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
          <input type="number" placeholder="Quantity" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} />
          <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {formStatus && <p className="form-error">{formStatus}</p>}
          <button onClick={handleAddProduct}>Save Product</button>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Low Stock At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const isLow = product.quantity <= product.lowStockThreshold;
              return (
                <tr key={product.id} className={isLow ? 'low-stock-row' : ''}>
                  {editingId === product.id ? (
                    <>
                      <td><input value={editDraft.name as string} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} /></td>
                      <td>
                        <select value={editDraft.categoryId as number} onChange={(e) => setEditDraft({ ...editDraft, categoryId: Number(e.target.value) })}>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td><input type="number" value={editDraft.price as string} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} /></td>
                      <td><input type="number" value={editDraft.quantity as number} onChange={(e) => setEditDraft({ ...editDraft, quantity: Number(e.target.value) })} /></td>
                      <td><input type="number" value={editDraft.lowStockThreshold as number} onChange={(e) => setEditDraft({ ...editDraft, lowStockThreshold: Number(e.target.value) })} /></td>
                      <td>{product.available ? 'Available' : 'Unavailable'}</td>
                      <td>
                        <button onClick={() => saveEdit(product.id)}>Save</button>
                        <button onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.name}</td>
                      <td>{product.category.name}</td>
                      <td>KSh {product.price}</td>
                      <td>{isLow && <span className="low-stock-badge" title="Low stock">⚠</span>} {product.quantity}</td>
                      <td>{product.lowStockThreshold}</td>
                      <td>
                        <span className={product.available ? 'in-stock' : 'out-of-stock'}>
                          {product.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => startEdit(product)}>Edit</button>
                        <button onClick={() => toggleAvailable(product)}>
                          {product.available ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                        <button onClick={() => setRestockingId(restockingId === product.id ? null : product.id)}>
                          Restock
                        </button>
                        <Link to={`/admin/products/${product.id}/movements`} className="history-link">History</Link>
                        <Link to={`/admin/products/${product.id}/images`} className="history-link">Photos</Link>

                        {restockingId === product.id && (
                          <div className="restock-popover">
                            <input
                              type="number"
                              min={1}
                              placeholder="Amount received"
                              value={restockAmount}
                              onChange={(e) => setRestockAmount(e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={restockNote}
                              onChange={(e) => setRestockNote(e.target.value)}
                            />
                            <button onClick={() => handleRestock(product.id)}>Confirm</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminProductsPage;
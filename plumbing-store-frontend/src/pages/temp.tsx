import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Stats {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

interface SaleDetail {
  id: string;
  orderId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  createdAt: string;
  paymentMethod: string;
  accountSuffix: string | null;
}

function LineChart({ data }: { data: { date: string; revenue: number }[] }) {
  if (data.length === 0) return <p>No paid orders in this period.</p>;

  const width = 700;
  const height = 180;
  const padding = 20;
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y =
      height - padding - (d.revenue / maxRevenue) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">
      <path d={pathD} fill="none" stroke="#1a1a1a" strokeWidth={2} />
      {points.map((p) => (
        <circle key={p.date} cx={p.x} cy={p.y} r={3.5} fill="#1a1a1a">
          <title>{`${p.date}: KSh ${p.revenue.toLocaleString()}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function AdminDashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [range, setRange] = useState('30');
  const [salesView, setSalesView] = useState<'all' | 'top' | 'recent'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/orders/admin/stats?days=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/orders/admin/sales?days=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ]).then(([statsData, salesData]) => {
      setStats(statsData);
      setSales(salesData);
      setLoading(false);
    });
  }, [token, range]);

  if (!user || user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }

  if (loading || !stats) return <p>Loading dashboard...</p>;

  const displayedSales = (() => {
    if (salesView === 'recent') {
      return sales.slice(0, 10); // backend already returns newest-first
    }
    if (salesView === 'top') {
      return [...sales]
        .sort(
          (a, b) =>
            Number(b.unitPrice) * b.quantity - Number(a.unitPrice) * a.quantity
        )
        .slice(0, 10);
    }
    return sales; // 'all' — full list, as returned
  })();

  return (
    <div className="app">
      <div className="admin-page-header">
        <h1>Sales Dashboard</h1>
        <div className="range-selector">
          {['7', '30', '90', 'all'].map((r) => (
            <button
              key={r}
              className={range === r ? 'active' : ''}
              onClick={() => setRange(r)}
            >
              {r === 'all' ? 'All time' : `${r} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <p className="stat-label">Total Revenue</p>
          <p className="stat-value">
            KSh {stats.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Orders</p>
          <p className="stat-value">{stats.orderCount}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Average Order Value</p>
          <p className="stat-value">
            KSh {stats.averageOrderValue.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Revenue Over Time</h3>
        <div className="chart-container">
          <LineChart data={stats.revenueByDay} />
        </div>
      </div>

      <div className="dashboard-section">
        <div className="sales-section-header">
          <h3>Sales</h3>
          <div className="range-selector">
            <button
              className={salesView === 'all' ? 'active' : ''}
              onClick={() => setSalesView('all')}
            >
              All Sales
            </button>
            <button
              className={salesView === 'top' ? 'active' : ''}
              onClick={() => setSalesView('top')}
            >
              Top Sales
            </button>
            <button
              className={salesView === 'recent' ? 'active' : ''}
              onClick={() => setSalesView('recent')}
            >
              Recent Sales
            </button>
          </div>
        </div>

        {displayedSales.length === 0 ? (
          <p>No sales in this period.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Payment</th>
                  <th>Account</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {displayedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="sales-row"
                    onClick={() =>
                      navigate(`/admin/orders#order-${sale.orderId}`)
                    }
                  >
                    <td>
                      {new Date(sale.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>{sale.productName}</td>
                    <td>{sale.quantity}</td>
                    <td>KSh {sale.unitPrice}</td>
                    <td>{sale.paymentMethod}</td>
                    <td>
                      {sale.accountSuffix
                        ? `•••• ${sale.accountSuffix}`
                        : '—'}
                    </td>
                    <td>#{sale.orderId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
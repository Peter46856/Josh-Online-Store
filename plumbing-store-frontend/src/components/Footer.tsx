import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <p className="footer-logo">Plumbing & Irrigation Store</p>
          <p className="footer-tagline">Pipes, fittings, pumps and irrigation kits for Eldoret and beyond.</p>
        </div>

        <div className="footer-links">
          <p className="footer-heading">Shop</p>
          <Link to="/">All Products</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">My Orders</Link>
        </div>

        <div className="footer-contact">
          <p className="footer-heading">Get in Touch</p>
          <p>Eldoret, Uasin Gishu County</p>
          <p>+254 7XX XXX XXX</p>
          <p>hello@plumbingstore.co.ke</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Plumbing & Irrigation Store. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
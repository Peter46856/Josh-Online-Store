import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import './App.css';
import AdminEnquiriesPage from './pages/AdminEnquiriesPage';
import MyEnquiriesPage from './pages/MyEnquiriesPage';
import EnquiryThreadPage from './pages/EnquiryThreadPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import ProductMovementsPage from './pages/ProductMovementsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProductImagesPage from './pages/ProductImagesPage';



function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderConfirmationPage />} />
          <Route path="/my-enquiries" element={<MyEnquiriesPage />} />
          <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
          <Route path="/admin/enquiries/:id" element={<EnquiryThreadPage />} />
          <Route path="/my-enquiries" element={<MyEnquiriesPage />} />
          <Route path="/enquiries/:id" element={<EnquiryThreadPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/products/:id/movements" element={<ProductMovementsPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/products/:id/images" element={<ProductImagesPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
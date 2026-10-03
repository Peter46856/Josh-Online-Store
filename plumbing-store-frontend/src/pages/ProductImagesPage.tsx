import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface ProductImage {
  id: number;
  url: string;
}

function ProductImagesPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchImages = () => {
    fetch(`${API_BASE_URL}/api/products/${id}/images`)
      .then((res) => res.json())
      .then((data) => {
        setImages(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchImages();
    fetch(`${API_BASE_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => setProductName(data.name));
  }, [id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    await fetch(`${API_BASE_URL}/api/products/${id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    setUploading(false);
    fetchImages();
  };

  const handleDelete = async (imageId: number) => {
    await fetch(`${API_BASE_URL}/api/products/${id}/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchImages();
  };

  if (!user || user.role !== 'ADMIN') {
    return <p>Access denied. Admins only.</p>;
  }

  if (loading) return <p>Loading photos...</p>;

  return (
    <div className="app">
      <Link to="/admin/products" className="back-link">
        ← Back to products
      </Link>
      <h1>Photos: {productName}</h1>

      <label className="photo-upload-label">
        {uploading ? 'Uploading...' : '+ Add Photo'}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </label>

      {images.length === 0 ? (
        <p>No photos uploaded yet.</p>
      ) : (
        <div className="image-gallery">
          {images.map((img) => (
            <div key={img.id} className="image-gallery-item">
              <img src={img.url} alt={productName} />
              <button
                onClick={() => handleDelete(img.id)}
                className="image-delete-button"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductImagesPage;
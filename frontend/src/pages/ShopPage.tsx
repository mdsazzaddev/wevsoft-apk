import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShopView } from '../components/marketplace/ShopView';

export const ShopPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ShopView
        slug={slug || 'official-shop'}
        onBack={() => navigate('/wevmall')}
      />
    </div>
  );
};

export default ShopPage;

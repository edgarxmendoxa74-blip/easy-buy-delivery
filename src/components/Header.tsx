import React from 'react';
import { Phone, ShoppingBag } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItemsCount, onCartClick, onMenuClick }) => {
  const { siteSettings, loading } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={onMenuClick}
            className="flex items-center space-x-2 text-brand-charcoal hover:text-brand-primary transition-colors duration-200"
          >
            {loading ? (
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
            ) : siteSettings?.site_logo ? (
              <img
                src={siteSettings.site_logo}
                alt={siteSettings.site_name}
                className="w-10 h-10 rounded-lg object-cover ring-2 ring-brand-primary/20"
              />
            ) : (
              <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                <ShoppingBag className="h-6 w-6" />
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-brand font-bold tracking-tight">
              {loading ? (
                <div className="w-24 h-6 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <span className="text-brand-primary">Easy Buy</span>
                  <span className="text-brand-charcoal"> Delivery</span>
                </>
              )}
            </h1>
          </button>

          <div className="flex items-center">
            {siteSettings?.facebook_url ? (
              <a
                href={siteSettings.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-full hover:bg-brand-secondary transition-all duration-200 shadow-lg shadow-brand-primary/20 font-bold text-sm md:text-base border-2 border-transparent hover:border-white/20 active:scale-95"
              >
                <Phone className="h-4 w-4 md:h-5 w-5" />
                <span>Contact Us</span>
              </a>
            ) : (
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-full hover:bg-brand-secondary transition-all duration-200 shadow-lg shadow-brand-primary/20 font-bold text-sm md:text-base border-2 border-transparent hover:border-white/20 active:scale-95"
                onClick={() => alert('Contact information coming soon!')}
              >
                <Phone className="h-4 w-4 md:h-5 w-5" />
                <span>Contact</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
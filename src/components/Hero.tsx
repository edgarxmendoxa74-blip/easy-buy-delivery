import React from 'react';
import SearchBar from './SearchBar';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { Clock } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  restaurantCount?: number;
}

const Hero: React.FC<HeroProps> = ({ searchQuery, onSearchChange, restaurantCount = 8 }) => {
  const { siteSettings } = useSiteSettings();

  return (
    <section className="relative bg-gradient-to-br from-brand-primary via-brand-secondary to-green-900 py-10 px-4 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">


          {/* Greeting Section */}
          <div className="mb-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-4">
              <h2 className="text-5xl md:text-7xl font-brand font-extrabold text-white tracking-tight">
                Hello!
              </h2>
              <span className="text-5xl md:text-7xl animate-bounce-gentle">👋</span>
            </div>
            {siteSettings?.daily_operation_schedule && (
              <div className="flex items-center justify-center gap-2 mb-4 text-white/90 bg-black/20 px-4 py-2 rounded-full inline-flex backdrop-blur-sm mx-auto">
                <Clock className="w-4 h-4" />
                <span className="text-sm md:text-base font-medium">Open Daily: {siteSettings.daily_operation_schedule}</span>
              </div>
            )}
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Find the best food, groceries, and services from <span className="text-brand-accent font-semibold">{restaurantCount}</span> local partners.
            </p>
          </div>

          {/* Search Bar - Centered */}
          <div className="w-full max-w-3xl transform hover:scale-[1.01] transition-transform duration-300">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              placeholder="Search for restaurants, cuisines..."
            />
          </div>
        </div>
      </div>

      {/* Subtle decorative element */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent"></div>
    </section>
  );
};

export default Hero;
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface ServiceSelectionProps {
  onServiceSelect: (service: 'food' | 'pabili' | 'padala' | 'requests') => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ onServiceSelect }) => {
  const [showGuide, setShowGuide] = useState(false);
  const { siteSettings } = useSiteSettings();

  const services = [
    {
      id: 'food' as const,
      name: 'Food',
      icon: '🍔',
      description: 'Order from your favorite restaurants',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
      iconColor: 'text-orange-600',
      enabled: true // Food catalog can't be toggled off per requirements, or isn't requested to be.
    },
    {
      id: 'pabili' as const,
      name: 'Easy Buy',
      icon: '🛒',
      description: 'Personal grocery & errands runner',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
      enabled: siteSettings?.feature_pabili_enabled !== false
    },
    {
      id: 'padala' as const,
      name: 'Padala',
      icon: '📦',
      description: 'Fast & secure item delivery service',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      iconColor: 'text-purple-600',
      enabled: siteSettings?.feature_padala_enabled !== false
    },
    {
      id: 'requests' as const,
      name: 'Angkas',
      icon: '🛵',
      description: 'Quick motorcycle taxi transport',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600',
      enabled: siteSettings?.feature_angkas_enabled !== false
    }
  ];

  const visibleServices = services.filter(s => s.enabled);

  const handleServiceClick = (serviceId: 'food' | 'pabili' | 'padala' | 'requests') => {
    onServiceSelect(serviceId);
  };

  const steps = [
    {
      icon: '📍',
      title: 'Enable Location Setting',
      description: 'Allow your browser to access your location. This ensures we can get your accurate coordinates to compute delivery fees correctly.'
    },
    {
      icon: '1️⃣',
      title: 'Choose a Service',
      description: 'Pick from Food Delivery, Easy Buy (Pabili), Padala, or Angkas depending on what you need.'
    },
    {
      icon: '2️⃣',
      title: 'Select a Store / Enter Details',
      description: 'For Food — browse stores and add items to your cart. For Easy Buy — tell us the store and items you want us to buy. For Padala — enter pickup & delivery details.'
    },
    {
      icon: '3️⃣',
      title: 'Fill in Your Details',
      description: 'Enter your name, contact number, delivery address, and landmark so our rider can find you easily.'
    },
    {
      icon: '4️⃣',
      title: 'Choose Payment',
      description: 'Pay via Cash on Delivery (COD) or cashless options like GCash and Maya. If cashless, scan the QR code or send to the account shown.'
    },
    {
      icon: '5️⃣',
      title: 'Confirm via Messenger',
      description: 'Your order will be sent to our Messenger page for confirmation. Attach your payment screenshot if paying cashless.'
    },
    {
      icon: '6️⃣',
      title: 'Relax & Wait',
      description: 'Our rider will pick up your order and deliver it right to your doorstep. Track updates through Messenger!'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-light/30 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Simple Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-brand font-extrabold text-brand-charcoal tracking-tight mb-2">
            What can we do for you?
          </h1>
          <p className="text-gray-500 text-lg font-light">Select a service to get started</p>
        </div>

        {/* Services Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(visibleServices.length, 4)} gap-6 md:gap-8`}>
          {visibleServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceClick(service.id)}
              className="group bg-white border-b-4 border-gray-100 rounded-3xl p-8 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:border-brand-primary focus:outline-none ring-offset-2 focus:ring-4 focus:ring-brand-primary/20"
            >
              <div className="text-center">
                <div className="text-7xl md:text-8xl mb-6 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                  {service.icon}
                </div>
                <h2 className="text-2xl font-brand font-bold text-brand-charcoal mb-1 group-hover:text-brand-primary transition-colors">
                  {service.name}
                </h2>
                <p className="text-sm text-gray-500 mb-4 group-hover:text-gray-600 transition-colors">
                  {service.description}
                </p>
                <div className="w-12 h-1 bg-brand-accent/30 mx-auto rounded-full group-hover:w-20 group-hover:bg-brand-accent transition-all duration-300"></div>
              </div>
            </button>
          ))}
        </div>

        {/* How to Use Button */}
        <div className="mt-16 text-center">
          <button
            onClick={() => setShowGuide(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-brand-primary text-brand-primary rounded-full text-lg font-semibold shadow-lg shadow-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <span className="text-2xl">📖</span>
            How to Use
          </button>
          <p className="text-gray-400 text-sm mt-3">New here? Tap to learn how Easy Buy Delivery works</p>
        </div>
      </div>

      {/* ═══════════ HOW TO USE MODAL ═══════════ */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGuide(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-brand font-bold text-brand-charcoal">📖 How to Use</h2>
                <p className="text-sm text-gray-500 mt-0.5">Easy Buy Delivery in 7 simple steps</p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps */}
            <div className="px-6 py-6 space-y-1">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4 py-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-2xl shadow-sm">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-brand-charcoal mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors active:scale-[0.98] transform shadow-lg shadow-brand-primary/20"
              >
                Got it! Let's go 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelection;

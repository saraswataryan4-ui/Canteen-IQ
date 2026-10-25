import React, { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenStaffPortal: () => void;
  isStaffAuthenticated: boolean;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
}

const STUDENT_NAV_LINKS: { id: ActiveTab; label: string }[] = [
  { id: ActiveTab.Menu, label: 'Menu' },
  { id: ActiveTab.GroupOrder, label: 'Group Order' },
  { id: ActiveTab.TrackOrder, label: 'My Orders' },
  { id: ActiveTab.Seating, label: 'Seating' },
  { id: ActiveTab.Chat, label: 'AI Assistant' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenStaffPortal,
  isStaffAuthenticated,
  cartCount,
  cartTotal,
  onOpenCart,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick(ActiveTab.Menu)}
          className="text-xl font-bold tracking-tight text-emerald-950 hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 cursor-pointer"
        >
          CanteenIQ
        </button>

        {/* Zone 2: Concise single-line student navigation + separate Staff Login entry */}
        <nav
          aria-label="Student Navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {STUDENT_NAV_LINKS.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenStaffPortal();
            }}
            className="py-5 border-b-2 border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isStaffAuthenticated ? 'Staff Portal' : 'Staff Login'}
          </button>
        </nav>

        {/* Zone 3: Primary Cart Action (+ Mobile Menu Button on small screens) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {cartCount > 0 ? (
              <span className="tabular-nums font-mono text-xs sm:text-sm">
                Cart ({cartCount}) · ₹{cartTotal}
              </span>
            ) : (
              <span>View Cart</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={
              mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {STUDENT_NAV_LINKS.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectTab(ActiveTab.Menu);
                setMobileMenuOpen(false);
                window.setTimeout(() => {
                  document
                    .getElementById('about-canteeniq')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 80);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              About CanteenIQ
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenStaffPortal();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {isStaffAuthenticated
                ? 'Return to Staff Portal'
                : 'Staff Login (Demo)'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

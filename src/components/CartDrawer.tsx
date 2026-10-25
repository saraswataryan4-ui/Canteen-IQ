import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { CartItem, DiningTable, MenuItem, Order, TableStatus } from '../types';
import { ResilientImage } from './ResilientImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  menuItems: MenuItem[];
  tables: DiningTable[];
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (payload: {
    studentName: string;
    rollNumber: string;
    tableId?: string;
    notes?: string;
  }) => Order;
  onTrackOrder: (orderToken: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  menuItems,
  tables,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
  onTrackOrder,
}) => {
  const [studentName, setStudentName] = useState('Ananya Sharma');
  const [rollNumber, setRollNumber] = useState('CS25B031');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmedOrder(null);
        setCheckoutError(null);
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const detailedCart = cart
    .map((c) => {
      const item = menuItems.find((m) => m.id === c.menuItemId);
      return item ? { ...item, quantity: c.quantity } : null;
    })
    .filter((x): x is MenuItem & { quantity: number } => x !== null);

  const subtotal = detailedCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const estimatedMinutes =
    detailedCart.length > 0
      ? Math.max(...detailedCart.map((i) => i.prepMinutes)) + 2
      : 0;

  const userReservedTables = tables.filter(
    (t) => t.status === TableStatus.Reserved && Boolean(t.isCurrentUserReservation)
  );

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacingOrder) return;
    setCheckoutError(null);

    if (detailedCart.length === 0) {
      setCheckoutError('Your demo tray is empty. Please add at least one item.');
      return;
    }

    const cleanName = studentName.trim();
    const cleanRoll = rollNumber.trim();
    if (!cleanName || !cleanRoll) {
      setCheckoutError(
        'Please enter both your Student Name and Campus ID / Roll Number.'
      );
      return;
    }

    const invalidStockItem = detailedCart.find(
      (item) => !item.isAvailable || item.quantity > item.stock || item.quantity <= 0
    );
    if (invalidStockItem) {
      setCheckoutError(
        `${invalidStockItem.name} only has ${invalidStockItem.stock} portions available in demo stock. Please adjust your tray quantity.`
      );
      return;
    }

    setIsPlacingOrder(true);
    window.setTimeout(() => {
      const created = onPlaceOrder({
        studentName: cleanName,
        rollNumber: cleanRoll,
        tableId: selectedTableId || undefined,
        notes: notes.trim() || undefined,
      });
      setIsPlacingOrder(false);
      setConfirmedOrder(created);
      setNotes('');
    }, 180);
  };

  const handleCloseDrawer = () => {
    setConfirmedOrder(null);
    setCheckoutError(null);
    setIsPlacingOrder(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop click target */}
      <div className="flex-1" onClick={handleCloseDrawer} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="cart-drawer-title"
              className="text-lg font-bold text-slate-950"
            >
              {confirmedOrder ? 'Demo Order Confirmed' : 'Your Demo Tray'}
            </h2>
            <p className="text-xs text-slate-500">
              Sample campus checkout · No real payment charged
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Close cart drawer"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        {confirmedOrder ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <p className="text-xs font-medium text-emerald-800">
                Unique Demo Order Token Generated
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums text-emerald-950 tracking-tight">
                {confirmedOrder.token}
              </p>
              <p className="text-sm text-slate-600">
                Initial Status:{' '}
                <span className="font-semibold text-emerald-800">
                  {confirmedOrder.status}
                </span>{' '}
                · Est. demo prep: ~{confirmedOrder.estimatedMinutes} mins
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Student</span>
                <span className="font-medium text-slate-900">
                  {confirmedOrder.studentName} ({confirmedOrder.rollNumber})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pickup Mode</span>
                <span className="font-medium text-slate-900">
                  {confirmedOrder.tableId
                    ? `Counter Pickup · Seated at ${confirmedOrder.tableId}`
                    : 'Express Counter Pickup'}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                {confirmedOrder.items.map((line) => (
                  <div
                    key={line.menuItemId}
                    className="flex justify-between text-slate-700 tabular-nums"
                  >
                    <span>
                      {line.quantity} × {line.name}
                    </span>
                    <span className="font-mono font-medium">
                      ₹{line.unitPrice * line.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-bold text-slate-950 tabular-nums">
                <span>Demo Total Price</span>
                <span className="font-mono text-emerald-800">
                  ₹{confirmedOrder.totalAmount}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Demo Mode · Your order is saved in shared session state and updates
              automatically in My Orders &amp; Order Tracking as canteen staff
              prepare it.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const token = confirmedOrder.token;
                  setConfirmedOrder(null);
                  onClose();
                  onTrackOrder(token);
                }}
                className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <span>Open My Orders &amp; Tracking</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                  setTimeout(() => {
                    document
                      .getElementById('student-order-tracking')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }, 80);
                }}
                className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                View Order Tracking on Home Page
              </button>
            </div>
          </div>
        ) : detailedCart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">
                Your demo tray is empty
              </p>
              <p className="text-sm text-slate-500 max-w-xs">
                Browse the sample campus menu to add Samosa, Veg Sandwich, Masala
                Dosa, or Cold Coffee.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Browse Sample Menu
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleCheckoutSubmit}
            className="flex-1 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Itemized List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Selected Demo Items ({detailedCart.length})
                  </span>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-xs font-medium text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
                  {detailedCart.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-slate-100">
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.name}
                          fallbackTitle={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          ₹{item.price} each · Subtotal ₹
                          {item.price * item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            aria-label={`Decrease ${item.name}`}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold font-mono tabular-nums text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.stock}
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            aria-label={`Increase ${item.name}`}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Student Details */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700">
                  Student Token Details (Demo)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="checkout-student-name"
                      className="block text-xs text-slate-600 mb-1"
                    >
                      Student Name
                    </label>
                    <input
                      id="checkout-student-name"
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-roll"
                      className="block text-xs text-slate-600 mb-1"
                    >
                      Campus ID / Roll No.
                    </label>
                    <input
                      id="checkout-roll"
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-table"
                    className="block text-xs text-slate-600 mb-1"
                  >
                    Dining Preference (Optional)
                  </label>
                  <select
                    id="checkout-table"
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Express Counter Pickup (Takeaway)</option>
                    {userReservedTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        My Reserved {t.label} (
                        {t.reservationId ? `${t.reservationId} · ` : ''}
                        {t.zone})
                      </option>
                    ))}
                    {tables
                      .filter((t) => t.status === TableStatus.Available)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Dine at {t.label} ({t.capacity} seats · {t.zone})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="checkout-notes"
                    className="block text-xs text-slate-600 mb-1"
                  >
                    Kitchen Note (Optional)
                  </label>
                  <input
                    id="checkout-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Less spicy chutney, extra napkin"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Checkout Summary Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
              {checkoutError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs font-medium text-red-800"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600 tabular-nums">
                  <span>Sample Item Subtotal</span>
                  <span className="font-mono">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 tabular-nums">
                  <span>Campus Convenience Fee (Demo)</span>
                  <span className="font-mono text-emerald-700">₹0 (Free)</span>
                </div>
                <div className="flex justify-between text-slate-600 tabular-nums">
                  <span>Estimated Prep Time</span>
                  <span>~{estimatedMinutes} mins</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-950 tabular-nums">
                  <span>Demo Order Total</span>
                  <span className="font-mono text-emerald-800">₹{subtotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPlacingOrder}
                className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 active:scale-[0.99] rounded-lg transition-all cursor-pointer"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Demo Order Token...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Demo Order · ₹{subtotal}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Demo Mode · Validates sample stock and creates an instant pickup
                token without real payment.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

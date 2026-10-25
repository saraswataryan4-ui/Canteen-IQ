import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChefHat,
  Clock,
  PackageCheck,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { ActiveTab, Order, OrderStatus } from '../types';

export const ORDERED_STATUS_STEPS: {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    status: OrderStatus.Received,
    label: 'Received',
    description: 'Order token created and logged in demo queue',
    icon: Receipt,
  },
  {
    status: OrderStatus.Preparing,
    label: 'Preparing',
    description: 'Canteen kitchen preparing your items',
    icon: ChefHat,
  },
  {
    status: OrderStatus.Ready,
    label: 'Ready',
    description: 'Ready for pickup at Express Counter',
    icon: Sparkles,
  },
  {
    status: OrderStatus.Collected,
    label: 'Collected',
    description: 'Order picked up by student',
    icon: PackageCheck,
  },
];

interface StudentOrderTrackerCardProps {
  order: Order;
  lastUpdatedTime?: string | null;
}

export const StudentOrderTrackerCard: React.FC<StudentOrderTrackerCardProps> = ({
  order,
  lastUpdatedTime,
}) => {
  const currentStepIndex = ORDERED_STATUS_STEPS.findIndex(
    (s) => s.status === order.status
  );

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-6 sm:p-8 space-y-8">
      {/* Top Summary: Token + Read-Only Current Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Demo Order Token · Placed at {order.createdAt} ·{' '}
            {order.isGroupOrder && order.groupCode
              ? `Group Order (${order.groupCode})`
              : order.isUserOrder
              ? 'My Session Order'
              : 'Sample Demo Order'}
          </p>
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="text-3xl font-bold font-mono tabular-nums text-slate-950">
              {order.token}
            </h3>
            <span
              aria-live="polite"
              className={`text-sm font-semibold ${
                order.status === OrderStatus.Ready
                  ? 'text-emerald-700'
                  : order.status === OrderStatus.Preparing
                  ? 'text-amber-700'
                  : order.status === OrderStatus.Collected
                  ? 'text-slate-600'
                  : 'text-emerald-800'
              }`}
            >
              Current Status: {order.status}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {order.studentName}
            {order.isGroupOrder ? ' (Organizer)' : ''} ({order.rollNumber})
            {order.tableId
              ? ` · Seated at ${order.tableId}`
              : ' · Express Counter Pickup'}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1 shrink-0 text-xs font-medium text-slate-600">
          {order.status === OrderStatus.Collected ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>Order Collected</span>
            </span>
          ) : (
            <span>Read-Only Student Tracker (Demo)</span>
          )}
          {lastUpdatedTime && (
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              Last updated: {lastUpdatedTime}
            </span>
          )}
        </div>
      </div>

      {/* 4 Ordered Status Stages: Received -> Preparing -> Ready -> Collected */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Order Status Progression</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            {order.status === OrderStatus.Collected
              ? 'Completed & collected'
              : order.status === OrderStatus.Ready
              ? 'Ready now at Pickup Counter'
              : `Estimated demo prep: ~${order.estimatedMinutes} mins`}
          </span>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {ORDERED_STATUS_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <li
                key={step.status}
                aria-current={isCurrent ? 'step' : undefined}
                className={`p-4 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-50/70'
                    : isCompleted
                    ? 'border-emerald-200 bg-white'
                    : 'border-slate-200 bg-slate-50/60 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    0{index + 1}
                  </span>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 ${
                        isCurrent ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`text-sm font-bold ${
                    isCurrent
                      ? 'text-emerald-950'
                      : isCompleted
                      ? 'text-slate-900'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Ordered Items & Total Price */}
      <div className="pt-6 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Ordered Items</h4>
          <span className="text-xs text-slate-500 tabular-nums">
            {order.items.reduce((sum, i) => sum + i.quantity, 0)} total items
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div
              key={item.menuItemId}
              className="py-2.5 flex items-center justify-between text-sm tabular-nums"
            >
              <div className="text-slate-800">
                <span className="font-mono font-semibold text-emerald-800 mr-2">
                  {item.quantity}×
                </span>
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-slate-400 ml-2 font-mono">
                  (₹{item.unitPrice} each)
                </span>
              </div>
              <span className="font-mono font-semibold text-slate-900">
                ₹{item.unitPrice * item.quantity}
              </span>
            </div>
          ))}
        </div>

        {order.isGroupOrder &&
          order.groupParticipants &&
          order.groupParticipants.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Group Participants ({order.groupCode} ·{' '}
                {order.groupParticipants.length} Friends)
              </p>
              <div className="space-y-1.5 text-xs text-slate-600 tabular-nums">
                {order.groupParticipants.map((part) => (
                  <div
                    key={part.participantId}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <span>
                      <span className="font-semibold text-slate-800">
                        {part.participantName}
                      </span>
                      {part.isOrganizer ? ' (Organizer)' : ''}:{' '}
                      {part.items.length === 0
                        ? 'No items'
                        : part.items
                            .map((i) => `${i.quantity}× ${i.name}`)
                            .join(', ')}
                    </span>
                    <span className="font-mono font-medium text-slate-900">
                      ₹{part.subtotal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {order.notes && (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            Kitchen Note: {order.notes}
          </p>
        )}

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-950 tabular-nums">
          <span>Total Price (Demo)</span>
          <span className="font-mono text-emerald-800">
            ₹{order.totalAmount}
          </span>
        </div>
      </div>
    </div>
  );
};

export interface OrderRefreshResult {
  ok: boolean;
  error?: string;
}

interface OrderTrackingProps {
  orders: Order[];
  selectedToken: string | null;
  onSelectToken: (token: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onRefreshOrders: (signal?: AbortSignal) => Promise<OrderRefreshResult>;
}

const ORDER_POLL_INTERVAL_MS = 3000;

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  orders,
  selectedToken,
  onSelectToken,
  onNavigateTab,
  onRefreshOrders,
}) => {
  const [tokenSearch, setTokenSearch] = useState('');
  const [listScope, setListScope] = useState<'all' | 'mine'>('all');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefreshOrdersRef = useRef(onRefreshOrders);
  onRefreshOrdersRef.current = onRefreshOrders;

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeStatusFetch = useCallback(async () => {
    if (!isMountedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRefreshing(true);

    try {
      const result = await onRefreshOrdersRef.current(controller.signal);
      if (!isMountedRef.current || controller.signal.aborted) return;

      if (result.ok) {
        setLastUpdatedTime(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setFetchError(null);
      } else {
        setFetchError(
          result.error ||
            "Couldn't check for the latest order status right now. Showing your last known order details — retrying automatically every 3 seconds."
        );
      }
    } catch (err: unknown) {
      if (
        !isMountedRef.current ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return;
      }
      setFetchError(
        "Couldn't check for the latest order status right now. Showing your last known order details — retrying automatically every 3 seconds."
      );
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Poll every 3 seconds ONLY while the Student Order Tracking page is open; stop cleanly on unmount
  useEffect(() => {
    isMountedRef.current = true;

    void executeStatusFetch();
    const intervalId = window.setInterval(() => {
      void executeStatusFetch();
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [executeStatusFetch]);

  const userOrdersCount = useMemo(
    () => orders.filter((o) => o.isUserOrder).length,
    [orders]
  );

  const scopedOrders = useMemo(() => {
    if (listScope === 'mine') {
      return orders.filter((o) => o.isUserOrder);
    }
    return orders;
  }, [orders, listScope]);

  const filteredOrderList = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    if (!q) return scopedOrders;
    return scopedOrders.filter(
      (o) =>
        o.token.toLowerCase().includes(q) ||
        o.studentName.toLowerCase().includes(q) ||
        o.rollNumber.toLowerCase().includes(q) ||
        (o.groupCode && o.groupCode.toLowerCase().includes(q))
    );
  }, [scopedOrders, tokenSearch]);

  const activeOrder = useMemo(() => {
    if (selectedToken) {
      const exact = scopedOrders.find(
        (o) => o.token.toLowerCase() === selectedToken.toLowerCase()
      );
      if (exact) return exact;
    }
    return scopedOrders[0] ?? orders[0] ?? null;
  }, [scopedOrders, orders, selectedToken]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Student My Orders & Tracking Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-emerald-700">
            Student Panel · My Orders &amp; Demo Order Tracking
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            My Orders &amp; Token Status
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            View your placed demo orders and follow preparation status from
            Received to Collected. Statuses auto-refresh every 3 seconds while
            this tracking page is open (shared in-memory demo server state, not a
            persistent cloud database).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono tabular-nums">
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-700 shrink-0 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>
              {lastUpdatedTime
                ? `Last updated: ${lastUpdatedTime}`
                : 'Checking latest status…'}{' '}
              <span className="text-slate-400 font-sans">· every 3s</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab(ActiveTab.Menu)}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Order More Items
          </button>
        </div>
      </div>

      {/* Friendly Non-Blocking Warning When Fetching Latest Status Fails */}
      {fetchError && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">{fetchError}</p>
          </div>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void executeStatusFetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer w-fit"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Try Again Now</span>
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <p className="text-base font-semibold text-slate-900">
            No demo orders in queue yet
          </p>
          <p className="text-sm text-slate-600">
            Head to the Sample Menu to add dishes and generate your first pickup
            token.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab(ActiveTab.Menu)}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            Browse Sample Menu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: My Orders / All Demo Tokens */}
          <div className="lg:col-span-4 space-y-4">
            {/* Scope Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setListScope('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  listScope === 'all'
                    ? 'bg-white text-emerald-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Demo Tokens ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setListScope('mine')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  listScope === 'mine'
                    ? 'bg-white text-emerald-950 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Orders ({userOrdersCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder="Search token (e.g. CIQ-106)..."
                aria-label="Search order token"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 bg-white overflow-hidden">
              {filteredOrderList.length === 0 ? (
                <div className="p-6 text-center space-y-2.5">
                  <p className="text-sm font-medium text-slate-700">
                    {listScope === 'mine' && userOrdersCount === 0
                      ? 'You have not placed an order in this session yet.'
                      : `No demo tokens match "${tokenSearch}"`}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {tokenSearch.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => setTokenSearch('')}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear Search
                      </button>
                    )}
                    {listScope === 'mine' && userOrdersCount === 0 && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(ActiveTab.Menu)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer"
                      >
                        Place a Demo Order from Menu
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredOrderList.map((order) => {
                  const isSelected = activeOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => onSelectToken(order.token)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-950 tabular-nums">
                            {order.token}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-medium text-emerald-800 truncate">
                            {order.isGroupOrder && order.groupCode
                              ? `Group · ${order.groupCode}`
                              : order.isUserOrder
                              ? 'My Order'
                              : 'Sample Order'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate tabular-nums">
                          {order.studentName} · {order.items.length}{' '}
                          {order.items.length === 1 ? 'item' : 'items'} · ₹
                          {order.totalAmount}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            order.status === OrderStatus.Ready
                              ? 'text-emerald-700'
                              : order.status === OrderStatus.Preparing
                              ? 'text-amber-700'
                              : order.status === OrderStatus.Collected
                              ? 'text-slate-500'
                              : 'text-slate-800'
                          }`}
                        >
                          {order.status}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          {order.createdAt}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Detail: Read-Only Student Order Tracker Card */}
          {activeOrder && (
            <div className="lg:col-span-8">
              <StudentOrderTrackerCard
                order={activeOrder}
                lastUpdatedTime={lastUpdatedTime}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import type { Order, OrderStatus } from '../types.ts';

export const ORDER_STATUS_LIST: readonly OrderStatus[] = [
  'Received' as OrderStatus,
  'Preparing' as OrderStatus,
  'Ready' as OrderStatus,
  'Collected' as OrderStatus,
];

export const DEFAULT_DEMO_ORDERS: Order[] = [
  {
    id: 'ord-demo-101',
    token: 'CIQ-104',
    studentName: 'Aarav Mehta',
    rollNumber: 'CS24B018',
    items: [
      {
        menuItemId: 'item-masala-dosa',
        name: 'Masala Dosa',
        unitPrice: 50,
        quantity: 1,
      },
      {
        menuItemId: 'item-cold-coffee',
        name: 'Cold Coffee',
        unitPrice: 30,
        quantity: 1,
      },
    ],
    totalAmount: 80,
    status: 'Preparing' as OrderStatus,
    createdAt: '12:18 PM',
    estimatedMinutes: 5,
    tableId: 'Table 02',
    notes: 'Extra crispy dosa please',
    isUserOrder: false,
  },
  {
    id: 'ord-demo-102',
    token: 'CIQ-103',
    studentName: 'Priya Nair',
    rollNumber: 'EE23B042',
    items: [
      {
        menuItemId: 'item-samosa',
        name: 'Samosa',
        unitPrice: 20,
        quantity: 2,
      },
    ],
    totalAmount: 40,
    status: 'Ready' as OrderStatus,
    createdAt: '12:12 PM',
    estimatedMinutes: 0,
    notes: 'Counter pickup',
    isUserOrder: false,
  },
  {
    id: 'ord-demo-103',
    token: 'CIQ-105',
    studentName: 'Rohan Kulkarni',
    rollNumber: 'ME25B009',
    items: [
      {
        menuItemId: 'item-veg-sandwich',
        name: 'Veg Sandwich',
        unitPrice: 40,
        quantity: 1,
      },
      {
        menuItemId: 'item-cold-coffee',
        name: 'Cold Coffee',
        unitPrice: 30,
        quantity: 2,
      },
    ],
    totalAmount: 100,
    status: 'Received' as OrderStatus,
    createdAt: '12:22 PM',
    estimatedMinutes: 6,
    tableId: 'Table 04',
    isUserOrder: false,
  },
  {
    id: 'ord-demo-100',
    token: 'CIQ-102',
    studentName: 'Sneha Iyer',
    rollNumber: 'BT23B011',
    items: [
      {
        menuItemId: 'item-samosa',
        name: 'Samosa',
        unitPrice: 20,
        quantity: 1,
      },
      {
        menuItemId: 'item-cold-coffee',
        name: 'Cold Coffee',
        unitPrice: 30,
        quantity: 1,
      },
    ],
    totalAmount: 50,
    status: 'Collected' as OrderStatus,
    createdAt: '11:55 AM',
    estimatedMinutes: 0,
    isUserOrder: false,
  },
];

export function cloneDefaultDemoOrders(): Order[] {
  return JSON.parse(JSON.stringify(DEFAULT_DEMO_ORDERS)) as Order[];
}

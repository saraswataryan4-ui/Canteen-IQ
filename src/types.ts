export enum OrderStatus {
  Received = 'Received',
  Preparing = 'Preparing',
  Ready = 'Ready',
  Collected = 'Collected',
}

export enum FoodCategory {
  All = 'All',
  Snacks = 'Snacks',
  Sandwiches = 'Sandwiches',
  SouthIndian = 'South Indian',
  Beverages = 'Beverages',
}

export enum PortalMode {
  Student = 'student',
  Staff = 'staff',
}

export enum ActiveTab {
  Menu = 'menu',
  GroupOrder = 'group',
  TrackOrder = 'track',
  Seating = 'seating',
  Chat = 'chat',
}

export type StaffSection = 'orders' | 'inventory' | 'tables';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<FoodCategory, FoodCategory.All>;
  description: string;
  prepMinutes: number;
  calories: number;
  stock: number;
  isAvailable: boolean;
  imageUrl: string;
  dietaryNote: string;
}

export interface CartItem {
  menuItemId: string;
  quantity: number;
}

export interface OrderLineItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export enum GroupOrderStatus {
  Open = 'Open',
  Confirmed = 'Confirmed',
}

export interface GroupParticipant {
  id: string;
  name: string;
  isOrganizer: boolean;
  joinedAt: string;
  items: CartItem[];
}

export interface GroupParticipantOrderSummary {
  participantId: string;
  participantName: string;
  isOrganizer: boolean;
  items: OrderLineItem[];
  subtotal: number;
}

export interface GroupOrderSession {
  id: string;
  code: string;
  title: string;
  organizerName: string;
  organizerRollNumber: string;
  tableId?: string;
  notes?: string;
  status: GroupOrderStatus;
  createdAt: string;
  participants: GroupParticipant[];
  confirmedOrderToken?: string;
}

export interface Order {
  id: string;
  token: string;
  studentName: string;
  rollNumber: string;
  items: OrderLineItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  estimatedMinutes: number;
  tableId?: string;
  notes?: string;
  isUserOrder?: boolean;
  isGroupOrder?: boolean;
  groupCode?: string;
  groupParticipants?: GroupParticipantOrderSummary[];
}

export enum TableZone {
  All = 'All Zones',
  WindowBay = 'Window Bay',
  MainCommons = 'Main Commons',
  StudyBooths = 'Study Booths',
}

export enum TableStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Reserved = 'Reserved',
}

export interface DiningTable {
  id: string;
  label: string;
  capacity: number;
  zone: Exclude<TableZone, TableZone.All>;
  features: string;
  status: TableStatus;
  occupantName?: string;
  timeSlot?: string;
  partySize?: number;
  reservationId?: string;
  isCurrentUserReservation?: boolean;
}

export interface RecommendedBundleItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockAvailable: number;
  estimatedPrepMinutes: number | null;
}

export interface AssistantRecommendation {
  items: RecommendedBundleItem[];
  totalCost: number;
  estimatedPrepMinutes: number | null;
  prepDisclaimer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendation?: AssistantRecommendation;
  suggestedItemIds?: string[];
  actionTab?: ActiveTab;
  actionLabel?: string;
  detectedLanguage?: 'en' | 'hinglish' | 'hi';
  modelId?: string;
  latencyMs?: number;
  validatedByApp?: boolean;
}

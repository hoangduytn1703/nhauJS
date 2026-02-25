
export enum UserRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  nickname: string;
  avatar: string;
  role: UserRole;
  quote: string;
  favoriteDrinks: string[];
  isBanned?: boolean; 
  isEmailVerified?: boolean; // New: Email verification status
  
  // Stats & Logic
  flakeCount?: number; // Tổng số vết nhơ (Display)
  flakedPolls?: string[]; // Danh sách ID các kèo đã bùng (để tránh tính 2 lần 1 kèo)
  
  // Manual Adjustments (Admin overrides)
  attendanceOffset?: number; // Cộng/Trừ số lần tham gia
  voteOffset?: number; // Cộng/Trừ số lần vote
}

export interface PollOption {
  id: string;
  text: string;
  description?: string; // Địa chỉ, link google map...
  notes?: string; // Ghi chú (VD: Pass wifi, gửi xe,...)
  image?: string;
  votes: string[]; // array of user IDs
  createdBy?: string; // User ID who added this option
}

export interface ParticipantData {
  status: 'JOIN' | 'DECLINE';
  reason?: string;
  isNonDrinker?: boolean; // New: For splitting beer/food
  timestamp: number;
}

export interface BillItem {
  userId: string;
  amount: number; // Tiền tăng 1 (chia đều hoặc lẻ)
  round2Amount: number; // Tiền tăng 2
  taxiAmount?: number; // Tiền taxi
  isPaid: boolean;
}

export interface BillInfo {
  imageUrl?: string; // Hình ảnh hóa đơn (Base64)
  items: Record<string, BillItem>; // Key là userId
  totalAmount: number;
  baseAmount?: number;
  baseAmountBeer?: number;
  baseAmountFood?: number;
  round2Amount?: number;
  round2AmountBeer?: number;
  round2AmountFood?: number;
  totalTaxiAmount?: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: number;
  options: PollOption[]; // Địa điểm
  timeOptions: PollOption[]; // Thời gian (New)
  createdBy: string;
  
  // New fields
  allowMultipleVotes: boolean; // Cho phép chọn nhiều quán
  deadline: number; // Timestamp hết hạn vote
  resultDate: number; // Timestamp công bố kết quả
  
  // UI Control
  isHidden?: boolean; // Nếu true thì ẩn khỏi dashboard

  // Tracking participation
  participants?: Record<string, ParticipantData>;
  confirmedAttendances?: string[]; // Array of user IDs who actually attended (Admin checked)

  // Finalized results (Admin selected or auto-winner)
  finalizedOptionId?: string | null; 
  finalizedTimeId?: string | null;
  
  // Bill Split Feature
  bill?: BillInfo;

  // Bank Info for QR Payment
  bankInfo?: {
    bankName: string;
    bankBin: string;
    accountNumber: string;
    accountHolder: string;
    momoNumber?: string;
  };

  // Taxi Feature
  enableTaxi?: boolean;
  taxiVoters?: string[];

  // Addition Permission (New)
  allowMemberAddPlaces?: boolean;
  allowMemberAddTimes?: boolean;
  isDeleted?: boolean;
}

export interface DrinkStats {
  name: string;
  score: number;
}
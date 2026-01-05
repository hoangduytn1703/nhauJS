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
  isBanned?: boolean; // New flag for banning
}

export interface PollOption {
  id: string;
  text: string;
  description?: string; // Địa chỉ, link google map...
  image?: string;
  votes: string[]; // array of user IDs
}

export interface ParticipantData {
  status: 'JOIN' | 'DECLINE';
  reason?: string;
  timestamp: number;
}

export interface BillItem {
  userId: string;
  amount: number; // Tiền tăng 1 (chia đều hoặc lẻ)
  round2Amount: number; // Tiền tăng 2
  isPaid: boolean;
}

export interface BillInfo {
  imageUrl?: string; // Hình ảnh hóa đơn (Base64)
  items: Record<string, BillItem>; // Key là userId
  totalAmount: number;
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
  
  // Tracking participation
  participants?: Record<string, ParticipantData>;
  confirmedAttendances?: string[]; // Array of user IDs who actually attended (Admin checked)

  // Finalized results (Admin selected or auto-winner)
  finalizedOptionId?: string | null; 
  finalizedTimeId?: string | null;
  
  // Bill Split Feature
  bill?: BillInfo;
}

export interface DrinkStats {
  name: string;
  score: number;
}
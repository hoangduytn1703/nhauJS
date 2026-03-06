import React,{ useState,useEffect,useRef } from 'react';
import { DataService } from '@/core/services/mockService';
import { db } from '@/core/services/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { Poll,User,BillItem,UserRole } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { Camera,Save,ArrowLeft,Receipt,DollarSign,Calculator,Lock,Info,Copy,Car,RefreshCw,Search,Check,ArrowUpDown,XCircle,Users,Beer } from 'lucide-react';
import { Link,useNavigate,useLocation,useSearchParams } from 'react-router';

// --- Internal Component for Formatted Money Input ---
const MoneyInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ value,onChange,disabled,placeholder }) => {
  // Format on render: 12000 -> "12,000"
  const displayValue = value === 0 ? '' : value.toLocaleString('en-US');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas to get raw number
    const raw = e.target.value.replace(/,/g,'');
    // Allow digits only
    if (!/^\d*$/.test(raw)) return;

    onChange(Number(raw));
  };

  return (
    <div className="relative w-full group">
      <input
        type="text"
        disabled={disabled}
        className={`w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 pr-8 text-right text-white font-bold font-mono text-lg outline-none transition-all placeholder-white/20
                    ${!disabled ? 'focus:border-primary focus:bg-black/40 hover:border-white/30' : 'opacity-50 cursor-not-allowed'}
                `}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder || "0"}
      />
      <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs ${value > 0 ? 'text-primary' : 'text-secondary'}`}>đ</span>
    </div>
  );
};

const BillSplit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [polls,setPolls] = useState<Poll[]>([]);
  const [users,setUsers] = useState<Record<string,User>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPollId = searchParams.get('pollId') || '';
  const selectedPoll = polls.find(p => p.id === selectedPollId);

  // Public mode: Select user manually if not logged in
  const isOnlyBill = location.pathname.includes('/only-bill');
  const [selectedGuestUserId, setSelectedGuestUserId] = useState<string>('');
  const [guestSearchTerm, setGuestSearchTerm] = useState<string>('');
  const effectiveUserId = user?.id || selectedGuestUserId;

  // Bill State
  const [billImage,setBillImage] = useState<string>('');
  const [userItems,setUserItems] = useState<Record<string,BillItem>>({});
  const [baseAmount,setBaseAmount] = useState<number>(0);
  const [baseAmountBeer,setBaseAmountBeer] = useState<number>(0);
  const baseAmountFood = Math.max(0,baseAmount - baseAmountBeer);

  const [round2Global,setRound2Global] = useState<number>(0);
  const [round2AmountBeer,setRound2AmountBeer] = useState<number>(0);
  const round2AmountFood = Math.max(0,round2Global - round2AmountBeer);

  const [totalTaxiAmount,setTotalTaxiAmount] = useState<number>(0);
  const [saving,setSaving] = useState(false);
  const [refreshing,setRefreshing] = useState(false);

  // Track if auto-split has been triggered
  const [hasAppliedBase,setHasAppliedBase] = useState(false);
  const [hasAppliedRound2,setHasAppliedRound2] = useState(false);

  // New: Map of which users should be automatically re-balanced
  const [autoBalanceMap,setAutoBalanceMap] = useState<Record<string,boolean>>({});

  const [searchTerm,setSearchTerm] = useState('');
  const [sortMode,setSortMode] = useState<'NONE' | 'PAID' | 'UNPAID'>('NONE');
  const [isDirty,setIsDirty] = useState(false);
  const [showBillZoom, setShowBillZoom] = useState(false);

  // Helper to round up to nearest 1,000
  const roundToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

  const checkDirtyWarning = () => {
    if (!isAdmin) return true;
    if (isDirty) return true;

    if (selectedPoll?.bill) {
      const ok = window.confirm("Bạn đang chỉnh sửa bill đã tồn tại. Thay đổi này sẽ ảnh hưởng đến số dư của mọi người. Tiếp tục?");
      if (ok) {
        setIsDirty(true);
        return true;
      }
      return false;
    }

    setIsDirty(true);
    return true;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPollId = (id: string) => {
    if (isDirty) {
      if (!window.confirm("Bạn có thay đổi chưa lưu. Bạn có muốn chuyển kèo khác không?")) {
        return;
      }
    }
    setIsDirty(false);
    setHasAppliedBase(false);
    setHasAppliedRound2(false);
    if (id) {
        setSearchParams({ pollId: id });
    } else {
        setSearchParams({});
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    refreshData();
  },[]);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const [allPolls,allUsers] = await Promise.all([
        DataService.getPolls(),
        DataService.getUsers()
      ]);
      const finishedPolls = allPolls.filter(p => (p.deadline > 0 && Date.now() > p.deadline) || !!p.finalizedOptionId || !!p.finalizedTimeId);
      setPolls(finishedPolls);

      const userMap: Record<string,User> = {};
      allUsers.forEach(u => userMap[u.id] = u);
      setUsers(userMap);
    } catch (e) {
      console.error("Refresh failed",e);
    } finally {
      setRefreshing(false);
    }
  };

  // When poll is selected, load existing bill or init new one
  useEffect(() => {
    if (selectedPoll) {
      // Ensure taxiVoters exists to prevent undefined errors
      if (!selectedPoll.taxiVoters) {
        selectedPoll.taxiVoters = [];
      }
      
      const confirmedIds = selectedPoll.confirmedAttendances || [];

      if (selectedPoll.bill) {
        setBillImage(selectedPoll.bill.imageUrl || '');
        setBaseAmount(selectedPoll.bill.baseAmount || 0);
        setBaseAmountBeer(selectedPoll.bill.baseAmountBeer || 0);
        setRound2Global(selectedPoll.bill.round2Amount || 0);
        setRound2AmountBeer(selectedPoll.bill.round2AmountBeer || 0);
        setTotalTaxiAmount(selectedPoll.bill.totalTaxiAmount || 0);

        // Merge logic: Only keep confirmed users from saved items, and add missing confirmed users
        const savedItems = selectedPoll.bill.items || {};
        const filteredItems: Record<string, BillItem> = {};
        
        confirmedIds.forEach(uid => {
          if (savedItems[uid]) {
            filteredItems[uid] = savedItems[uid];
          } else {
            filteredItems[uid] = {
              userId: uid,
              amount: 0,
              round2Amount: 0,
              taxiAmount: 0,
              isPaid: false
            };
          }
        });

        setUserItems(filteredItems);
      } else {
        setBillImage('');
        setBaseAmount(0);
        setRound2Global(0);
        setTotalTaxiAmount(0);
        // Init new bill from confirmed users
        const initialItems: Record<string,BillItem> = {};
        confirmedIds.forEach(uid => {
          initialItems[uid] = {
            userId: uid,
            amount: 0,
            round2Amount: 0,
            taxiAmount: 0,
            isPaid: false
          };
        });
        setUserItems(initialItems);
      }
    }
  },[selectedPoll]);

  // --- Real-time Auto-refresh logic ---
  useEffect(() => {
    if (!selectedPollId) return;

    const isD2 = location.pathname.includes('/du2');
    const isOB = location.pathname.includes('/only-bill');
    const prefix = isOB ? 'ob_' : isD2 ? 'du2_' : '';
    
    // Lắng nghe sự thay đổi của Poll này trên Firestore
    const unsub = onSnapshot(doc(db, `${prefix}polls`, selectedPollId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.bill && data.bill.items) {
           // Cập nhật trạng thái đóng tiền ngay lập tức lên UI
           setUserItems(data.bill.items);
           console.log("[Real-time] Bill updated from server!");
        }
      }
    });

    return () => unsub(); // Hủy lắng nghe khi chuyển trang
  }, [selectedPollId, location.pathname]);

  const handleApplyBaseAmount = () => {
    if (!isAdmin || !selectedPoll) return;
    if (!checkDirtyWarning()) return;

    const userIds = Object.keys(userItems);
    if (userIds.length === 0) return;

    const drinkers = userIds.filter(uid => !selectedPoll.participants?.[uid]?.isNonDrinker);
    const perPersonFood = roundToThousand(baseAmountFood / userIds.length);
    const perPersonBeer = drinkers.length > 0 ? roundToThousand(baseAmountBeer / drinkers.length) : 0;

    const newItems = { ...userItems };
    const newAutoMap: Record<string,boolean> = {};
    userIds.forEach(uid => {
      const isNonDrinker = !!selectedPoll.participants?.[uid]?.isNonDrinker;
      newItems[uid].amount = perPersonFood + (isNonDrinker ? 0 : perPersonBeer);
      newAutoMap[uid] = true;
    });
    setUserItems(newItems);
    setAutoBalanceMap(newAutoMap);
    setHasAppliedBase(true);
    alert(`Đã chia Tăng 1: Mồi ~${perPersonFood.toLocaleString()}đ (ai cũng ăn), Bia ~${perPersonBeer.toLocaleString()}đ (${drinkers.length} người uống).`);
  };

  const handleApplyRound2Global = () => {
    if (!isAdmin || !selectedPoll) return;
    if (!checkDirtyWarning()) return;

    const userIds = Object.keys(userItems);
    if (userIds.length === 0) return;

    const drinkers = userIds.filter(uid => !selectedPoll.participants?.[uid]?.isNonDrinker);
    const perPersonFood = roundToThousand(round2AmountFood / userIds.length);
    const perPersonBeer = drinkers.length > 0 ? roundToThousand(round2AmountBeer / drinkers.length) : 0;

    const newItems = { ...userItems };
    const newAutoMap: Record<string,boolean> = { ...autoBalanceMap };
    userIds.forEach(uid => {
      const isNonDrinker = !!selectedPoll.participants?.[uid]?.isNonDrinker;
      newItems[uid].round2Amount = perPersonFood + (isNonDrinker ? 0 : perPersonBeer);
      newAutoMap[uid] = true;
    });
    setUserItems(newItems);
    setAutoBalanceMap(newAutoMap);
    setHasAppliedRound2(true);
    alert(`Đã chia Tăng 2: Mồi ~${perPersonFood.toLocaleString()}đ (ai cũng ăn), Bia ~${perPersonBeer.toLocaleString()}đ (${drinkers.length} người uống).`);
  }

  const handleApplyTaxiSplit = () => {
    if (!isAdmin || !selectedPoll) return;
    if (!checkDirtyWarning()) return;

    // Chỉ những người có đăng ký taxi VÀ được check-in mới bị tính tiền
    const confirmedVoters = (selectedPoll.taxiVoters || []).filter(uid =>
      (selectedPoll.confirmedAttendances || []).includes(uid)
    );

    if (confirmedVoters.length === 0) {
      alert("Không có ai đăng ký đi taxi mà có mặt tại quán!");
      return;
    }

    const perPerson = roundToThousand(totalTaxiAmount / confirmedVoters.length);
    const newItems = { ...userItems };

    // Reset all taxi amounts first
    Object.keys(newItems).forEach(uid => {
      newItems[uid].taxiAmount = 0;
    });

    // Apply new per-person amount to confirmed voters
    confirmedVoters.forEach(uid => {
      if (newItems[uid]) {
        newItems[uid].taxiAmount = perPerson;
      }
    });

    setUserItems(newItems);
    alert(`Đã chia ${totalTaxiAmount.toLocaleString()}đ cho ${confirmedVoters.length} người có mặt (~${perPerson.toLocaleString()}đ/người)`);
  };

  const handleItemChange = (uid: string,field: keyof BillItem,value: any) => {
    if (!isAdmin) return;
    if (!checkDirtyWarning()) return;

    setUserItems(prev => {
      const next = { ...prev };
      next[uid] = { ...next[uid],[field]: value };

      // Update AutoBalanceMap: if manually changing amount, lock this user
      const currentAutoMap = { ...autoBalanceMap };
      if (field === 'amount' || field === 'round2Amount') {
        currentAutoMap[uid] = false;
        setAutoBalanceMap(currentAutoMap);
      }

      // SMART RE-BALANCING with Locking
      if (field === 'amount' && hasAppliedBase && baseAmount > 0) {
        const autoIds = Object.keys(next).filter(id => currentAutoMap[id] && id !== uid);

        if (autoIds.length > 0) {
          const autoDrinkers = autoIds.filter(id => !selectedPoll?.participants?.[id]?.isNonDrinker);
          const autoNonDrinkers = autoIds.filter(id => !!selectedPoll?.participants?.[id]?.isNonDrinker);

          // Ưu tiên chia tiền dư/thiếu cho những người CÓ uống bia (nếu họ đang ở chế độ Auto)
          // Người KHÔNG uống sẽ được giữ nguyên số tiền mồi ban đầu
          const priorityIds = autoDrinkers.length > 0 ? autoDrinkers : autoNonDrinkers;
          const staticIds = autoDrinkers.length > 0 ? autoNonDrinkers : [];

          const fixedSum = Object.keys(next)
            .filter(id => !currentAutoMap[id])
            .reduce((sum,id) => sum + (next[id].amount || 0),0);

          const staticSum = staticIds.reduce((sum,id) => sum + (next[id].amount || 0),0);

          const remaining = baseAmount - fixedSum - staticSum;
          const perPerson = Math.max(0,roundToThousand(remaining / priorityIds.length));

          priorityIds.forEach(id => {
            next[id] = { ...next[id],amount: perPerson };
          });
        }
      }

      if (field === 'round2Amount' && hasAppliedRound2 && round2Global > 0) {
        const autoIds = Object.keys(next).filter(id => currentAutoMap[id] && id !== uid);

        if (autoIds.length > 0) {
          const autoDrinkers = autoIds.filter(id => !selectedPoll?.participants?.[id]?.isNonDrinker);
          const autoNonDrinkers = autoIds.filter(id => !!selectedPoll?.participants?.[id]?.isNonDrinker);

          const priorityIds = autoDrinkers.length > 0 ? autoDrinkers : autoNonDrinkers;
          const staticIds = autoDrinkers.length > 0 ? autoNonDrinkers : [];

          const fixedSum = Object.keys(next)
            .filter(id => !currentAutoMap[id])
            .reduce((sum,id) => sum + (next[id].round2Amount || 0),0);

          const staticSum = staticIds.reduce((sum,id) => sum + (next[id].round2Amount || 0),0);

          const remaining = round2Global - fixedSum - staticSum;
          const perPerson = Math.max(0,roundToThousand(remaining / priorityIds.length));

          priorityIds.forEach(id => {
            next[id] = { ...next[id],round2Amount: perPerson };
          });
        }
      }

      return next;
    });
  };

  const handleToggleAllPaid = (paid: boolean) => {
    if (!isAdmin) return;
    if (!checkDirtyWarning()) return;

    setUserItems(prev => {
      const next = { ...prev };
      const visibleIds = (Object.values(prev) as BillItem[])
        .filter(item => {
          const u = getDisplayUser(item.userId);
          const search = searchTerm.toLowerCase();
          return u.nickname.toLowerCase().includes(search) ||
            (u.name || '').toLowerCase().includes(search) ||
            (u.email || '').toLowerCase().includes(search);
        })
        .map(item => item.userId);

      visibleIds.forEach(uid => {
        next[uid] = { ...next[uid],isPaid: paid };
      });
      return next;
    });
  };

  const toggleAutoBalance = (uid: string) => {
    if (!checkDirtyWarning()) return;
    setAutoBalanceMap(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    if (!checkDirtyWarning()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { return alert('Ảnh < 5MB'); }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Bill needs detail
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img,0,0,canvas.width,canvas.height);
        setBillImage(canvas.toDataURL('image/jpeg',0.8));
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedPollId || !isAdmin) return;
    setSaving(true);
    try {
      // 1. Generate payment codes for everyone who hasn't paid
      const itemsWithCodes = { ...userItems };
      Object.keys(itemsWithCodes).forEach(uid => {
          if (!itemsWithCodes[uid].isPaid && !itemsWithCodes[uid].paymentCode) {
              const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
              itemsWithCodes[uid].paymentCode = `NHAU${randomStr}`;
          }
      });

      const total = Object.values(itemsWithCodes).reduce((sum, item) => sum + Number(item.amount) + Number(item.round2Amount) + Number(item.taxiAmount || 0), 0);
      
      // 2. Save Poll with updated items (including payment codes)
      await DataService.updateBill(selectedPollId, {
        imageUrl: billImage,
        items: itemsWithCodes,
        totalAmount: total,
        baseAmount,
        baseAmountBeer,
        baseAmountFood,
        round2Amount: round2Global,
        round2AmountBeer,
        round2AmountFood,
        totalTaxiAmount
      });

      // 3. Save mappings for fast lookup by Webhook
      const isD2 = location.pathname.includes('/du2');
      const prefix = isOnlyBill ? 'ob_' : isD2 ? 'du2_' : '';
      
      const mappingPromises = Object.keys(itemsWithCodes).map(uid => {
          const item = itemsWithCodes[uid];
          if (item.paymentCode) {
              return DataService.savePaymentMapping(item.paymentCode, {
                  pollId: selectedPollId,
                  userId: uid,
                  prefix: prefix
              });
          }
          return Promise.resolve();
      });
      await Promise.all(mappingPromises);

      setIsDirty(false);
      alert('Lưu bill thành công! Hệ thống đã sẵn sàng nhận tiền auto-check.');
      refreshData();
    } catch (e) {
      alert('Lỗi khi lưu: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate Total for display
  const grandTotal = (Object.values(userItems) as BillItem[]).reduce((sum,item) => sum + Number(item.amount) + Number(item.round2Amount) + Number(item.taxiAmount || 0),0);

  // Calculate User's specific amount for QR code
  const currentUserItem = effectiveUserId && userItems[effectiveUserId];
  const userTotalAmount = currentUserItem ? (currentUserItem.amount + currentUserItem.round2Amount + (currentUserItem.taxiAmount || 0)) : 0;
  const currentDisplayName = users[effectiveUserId || '']?.nickname || 'Khach';

  // VietQR URL - Use bank info from poll or fallback to MB Bank
  const bankBin = selectedPoll?.bankInfo?.bankBin || "970422";
  const bankAccount = selectedPoll?.bankInfo?.accountNumber || "0559204549";
  const bankName = selectedPoll?.bankInfo?.bankName || "MB Bank";
  const accountHolder = selectedPoll?.bankInfo?.accountHolder || "NGUYEN HOANG DUY";
  
  // NẾU CÓ paymentCode THÌ PHẢI ĐƯA VÀO NỘI DUNG CHUYỂN KHOẢN ĐỂ SEPAY NHẬN DIỆN
  const currentItem = effectiveUserId && userItems[effectiveUserId];
  const pollTitleRaw = selectedPoll?.title || '';
  // Format: [Mã] [Tên] [Kèo] - VD: NHAUABCD DUY KEO_LAU
  const qrDesc = currentItem?.paymentCode 
    ? `${currentItem.paymentCode} ${currentDisplayName} ${pollTitleRaw}`.substring(0, 50)
    : `${currentDisplayName} thanh toan ${pollTitleRaw}`;
    
  const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${userTotalAmount}&addInfo=${encodeURIComponent(qrDesc)}&accountName=${encodeURIComponent(accountHolder)}`;

  // Helper for deleted users
  const getDisplayUser = (uid: string) => {
    const u = users[uid];
    if (u) return u;
    return {
      id: uid,
      nickname: 'Người dùng đã xóa',
      avatar: `https://ui-avatars.com/api/?name=Deleted&background=000&color=fff`,
    } as User;
  };

  return (
    <div className="pb-20 relative">
      {/* 0. Guest Selection Overlay for Public Only-Bill */}
      {isOnlyBill && !user && !selectedGuestUserId && selectedPoll && (
          <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
              <div className="bg-surface border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users size={32} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-white text-center mb-2">Bạn là ai?</h2>
                  <p className="text-secondary text-center text-sm mb-6">Vui lòng chọn tên của bạn trong danh sách để xem bill cá nhân.</p>
                  
                  {/* Search Bar */}
                  <div className="relative mb-4">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                      <input 
                        type="text"
                        placeholder="Tìm tên bạn..."
                        className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-primary transition-all shadow-inner"
                        value={guestSearchTerm}
                        onChange={(e) => setGuestSearchTerm(e.target.value)}
                        autoFocus
                      />
                  </div>

                  <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {Object.keys(userItems)
                        .filter(uid => users[uid]?.nickname.toLowerCase().includes(guestSearchTerm.toLowerCase()))
                        .map(uid => {
                          const u = users[uid];
                          if (!u) return null;
                          return (
                              <button 
                                  key={uid}
                                  onClick={() => setSelectedGuestUserId(uid)}
                                  className="w-full flex items-center justify-center p-4 bg-background hover:bg-primary/10 border border-border hover:border-primary/30 rounded-2xl transition-all group"
                              >
                                  <span className="font-bold text-lg text-white group-hover:text-primary transition-colors">{u.nickname}</span>
                              </button>
                          );
                      })}
                      {Object.keys(userItems).filter(uid => users[uid]?.nickname.toLowerCase().includes(guestSearchTerm.toLowerCase())).length === 0 && (
                          <div className="p-8 text-center text-secondary italic text-sm">Không tìm thấy anh em này...</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Re-selection button for guests */}
      {isOnlyBill && !user && selectedGuestUserId && (
          <button 
            onClick={() => setSelectedGuestUserId('')}
            className="fixed bottom-6 right-6 bg-surface/80 backdrop-blur-md border border-border px-4 py-2 rounded-full text-xs font-bold text-secondary hover:text-white z-50 shadow-lg flex items-center gap-2"
          >
              <Users size={14} /> Thay đổi người xem
          </button>
      )}

      {/* Bill Image Zoom Modal */}
      {showBillZoom && billImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowBillZoom(false)}
        >
          <button
            onClick={() => setShowBillZoom(false)}
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-10"
          >
            <XCircle size={40} />
          </button>
          <img 
            src={billImage} 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
            Click bên ngoài để đóng
          </div>
        </div>
      )}

      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center flex-wrap gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <Receipt className="text-primary" /> Tính Tiền & Chia Bill
            </div>
            {selectedPoll && (
              <span className="text-[32px] text-primary bg-primary/10 px-4 py-1 rounded-2xl border border-primary/30 shadow-[0_0_25px_rgba(244,140,37,0.15)] animate-in zoom-in-95 duration-500">
                {selectedPoll.title}
              </span>
            )}
          </h1>
          <p className="text-secondary mt-1">Công khai, minh bạch, tình cảm bền lâu</p>
        </div>
        <Link 
          to={
            (isOnlyBill && isAdmin && selectedPollId) 
              ? `/only-bill/admin?pollId=${selectedPollId}&step=SELECT_MEMBERS` 
              : (location.pathname.includes('/only-bill') ? "/only-bill" : "/")
          } 
          className="text-secondary hover:text-white flex items-center gap-1 mt-2 md:mt-0"
        >
          <ArrowLeft size={16} /> Quay lại chọn danh sách tham gia
        </Link>
      </header>

      {!selectedPollId ? (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Chọn kèo đã chốt để xem bill:</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {polls.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPollId(p.id)}
                className="text-left bg-background border border-border p-4 rounded-xl hover:border-primary transition-colors flex justify-between items-center group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-primary transition-colors">{p.title}</div>
                  <div className="text-xs text-secondary">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
                {p.bill && <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">Đã có bill</span>}
              </button>
            ))}
          </div>
          {polls.length === 0 && <p className="text-secondary italic">Chưa có kèo nào đã kết thúc.</p>}

          <button
            onClick={refreshData}
            disabled={refreshing}
            className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-secondary hover:text-white transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Đang cập nhật...' : 'Cập nhật danh sách mới nhất'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4">
          <div className="flex justify-between items-center">
            <button onClick={() => handleSelectPollId('')} className="text-secondary text-sm hover:underline cursor-pointer">← Chọn kèo khác</button>
            {!isAdmin && (
              <span className="text-xs text-secondary bg-surface px-3 py-1 rounded-full border border-border flex items-center gap-1">
                <Lock size={12} /> Chế độ xem (Chỉ Admin được sửa)
              </span>
            )}
          </div>

          {/* 1. Bill Image & Payment Info */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Camera size={18} /> Ảnh Hóa Đơn</h3>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div
                onClick={() => {
                  if (isAdmin) {
                    fileInputRef.current?.click();
                  } else if (billImage) {
                    setShowBillZoom(true);
                  }
                }}
                className={`w-full md:w-64 aspect-[3/4] bg-background border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden relative ${
                  isAdmin ? 'cursor-pointer hover:border-primary' : (billImage ? 'cursor-pointer hover:border-primary' : 'cursor-default')
                }`}
              >
                {billImage ? (
                  <>
                    <img src={billImage} className="w-full h-full object-contain" />
                    {!isAdmin && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="text-white text-sm font-bold opacity-0 hover:opacity-100 transition-opacity">Click để xem to</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-secondary">
                    {isAdmin ? (
                      <>
                        <Camera size={32} className="mx-auto mb-2" />
                        <span>Upload Bill</span>
                      </>
                    ) : (
                      <span>Admin chưa up bill</span>
                    )}
                  </div>
                )}
                {isAdmin && <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />}
              </div>

              <div className="flex-1 w-full">
                {isAdmin ? (
                  <>
                    <p className="text-secondary text-sm mb-4">Upload ảnh bill để anh em tiện đối chiếu nếu cần thắc mắc.</p>
                    <div className="bg-background p-4 rounded-xl border border-border">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Calculator size={16} /> Công cụ chia nhanh</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                          <label className="text-xs text-secondary block mb-2 font-bold flex items-center gap-1 uppercase tracking-wider text-primary">Tăng 1</label>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] text-secondary block mb-1">1. Tổng tiền Tăng 1</label>
                              <MoneyInput value={baseAmount} onChange={(val) => checkDirtyWarning() && setBaseAmount(val)} placeholder="0" />
                            </div>
                            <div>
                              <label className="text-[10px] text-secondary block mb-1">2. Tiền Beer / Rượu (Chia riêng)</label>
                              <MoneyInput value={baseAmountBeer} onChange={(val) => checkDirtyWarning() && setBaseAmountBeer(val)} placeholder="0" />
                            </div>
                            <div>
                              <label className="text-[10px] text-secondary block mb-1 italic opacity-60">3. Tiền Mồi / Nước (Còn lại: ~{baseAmountFood.toLocaleString()}đ)</label>
                              <div className="relative">
                                <input disabled value={baseAmountFood.toLocaleString()} className="w-full bg-background/30 border border-border/50 rounded-lg px-3 py-2 text-white font-mono text-right opacity-50" />
                              </div>
                            </div>
                            <button onClick={handleApplyBaseAmount} className="w-full bg-primary hover:bg-primary-hover text-background py-2 rounded-lg font-black text-xs uppercase tracking-tighter cursor-pointer">Áp dụng</button>
                          </div>
                        </div>
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                          <label className="text-xs text-secondary block mb-2 font-bold flex items-center gap-1 uppercase tracking-wider text-primary">Tăng 2</label>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] text-secondary block mb-1">1. Tổng tiền Tăng 2</label>
                              <MoneyInput value={round2Global} onChange={(val) => checkDirtyWarning() && setRound2Global(val)} placeholder="0" />
                            </div>
                            <div>
                              <label className="text-[10px] text-secondary block mb-1">2. Tiền Beer / Rượu (Chia riêng)</label>
                              <MoneyInput value={round2AmountBeer} onChange={(val) => checkDirtyWarning() && setRound2AmountBeer(val)} placeholder="0" />
                            </div>
                            <div>
                              <label className="text-[10px] text-secondary block mb-1 italic opacity-60">3. Tiền Mồi / Nước (Còn lại: ~{round2AmountFood.toLocaleString()}đ)</label>
                              <div className="relative">
                                <input disabled value={round2AmountFood.toLocaleString()} className="w-full bg-background/30 border border-border/50 rounded-lg px-3 py-2 text-white font-mono text-right opacity-50" />
                              </div>
                            </div>
                            <button onClick={handleApplyRound2Global} className="w-full bg-primary hover:bg-primary-hover text-background py-2 rounded-lg font-black text-xs uppercase tracking-tighter cursor-pointer">Áp dụng</button>
                          </div>
                        </div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-white/5">
                          <label className="text-xs text-secondary block mb-1 flex items-center gap-1"><Car size={12} /> Tổng tiền Taxi (Sẽ chia đều cho những người có mặt trong {(selectedPoll?.taxiVoters || []).length} người đăng ký)</label>
                          <div className="flex gap-2">
                            <div className="w-1/2">
                              <MoneyInput
                                value={totalTaxiAmount}
                                onChange={(val) => checkDirtyWarning() && setTotalTaxiAmount(val)}
                                placeholder="VD: 150"
                              />
                            </div>
                            <button
                              onClick={handleApplyTaxiSplit}
                              className="flex-1 bg-primary hover:bg-primary-hover text-background px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                            >
                              <Calculator size={14} /> Áp dụng
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col justify-center">
                    {/* Bill Breakdown for User */}
                    {selectedPoll?.bill && currentUserItem && (
                      <div className="bg-background p-6 rounded-xl border border-border mb-6">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Receipt size={18} className="text-primary" />
                          Chi tiết bill của bạn
                        </h4>
                        <div className="space-y-3">
                          {/* Base Amount */}
                          {currentUserItem.amount > 0 && (
                            <div className="flex justify-between items-center p-3 bg-surface/50 rounded-lg">
                              <span className="text-secondary text-sm">Tăng 1 (Mồi + Beer)</span>
                              <span className="text-white font-bold font-mono">{currentUserItem.amount.toLocaleString()} đ</span>
                            </div>
                          )}
                          {/* Round 2 Amount */}
                          {currentUserItem.round2Amount > 0 && (
                            <div className="flex justify-between items-center p-3 bg-surface/50 rounded-lg">
                              <span className="text-secondary text-sm">Tăng 2 (Mồi + Beer)</span>
                              <span className="text-white font-bold font-mono">{currentUserItem.round2Amount.toLocaleString()} đ</span>
                            </div>
                          )}
                          {/* Taxi Amount */}
                          {currentUserItem.taxiAmount && currentUserItem.taxiAmount > 0 && (
                            <div className="flex justify-between items-center p-3 bg-surface/50 rounded-lg">
                              <span className="text-secondary text-sm flex items-center gap-1">
                                <Car size={14} /> Taxi
                              </span>
                              <span className="text-white font-bold font-mono">{currentUserItem.taxiAmount.toLocaleString()} đ</span>
                            </div>
                          )}
                          {/* Total */}
                          <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/30 rounded-lg mt-4">
                            <span className="text-primary font-bold">TỔNG CỘNG</span>
                            <span className="text-primary font-black text-2xl font-mono">{userTotalAmount.toLocaleString()} đ</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div className="bg-background p-6 rounded-xl border border-border">
                      <h4 className="text-xl font-bold text-primary mb-4 text-center">Thông tin thanh toán</h4>

                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        {/* QR Block */}
                        <div className="bg-white p-3 rounded-lg shadow-lg shrink-0 mx-auto md:mx-0">
                          <img src={vietQrUrl} className="w-40 h-40 object-contain" alt="VietQR" />
                          <div className="text-center text-black text-xs font-bold mt-1">{bankName}: {bankAccount}</div>
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 space-y-4 w-full">
                          <div className="p-3 bg-surface border border-border rounded-lg flex justify-between items-center">
                            <div>
                              <div className="text-xs text-secondary">Ngân hàng {bankName}</div>
                              <div className="text-white font-bold font-mono text-lg">{bankAccount}</div>
                            </div>
                            <button
                              onClick={() => { navigator.clipboard.writeText(bankAccount); alert(`Copied ${bankName}`) }}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer"
                            >
                              <Copy size={16} />
                            </button>
                          </div>

                          {selectedPoll?.bankInfo?.momoNumber && (
                            <div className="p-3 bg-surface border border-border rounded-lg flex justify-between items-center">
                              <div>
                                <div className="text-xs text-secondary">Momo</div>
                                <div className="text-white font-bold font-mono text-lg">{selectedPoll?.bankInfo?.momoNumber}</div>
                              </div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(selectedPoll?.bankInfo?.momoNumber || ''); alert('Copied Momo') }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded cursor-pointer"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          )}

                          <div className="text-sm text-secondary text-center md:text-left bg-primary/10 p-2 rounded border border-primary/20">
                            Nội dung CK: <span className="text-white font-bold select-all">"ghi tên vào nhé"</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative z-10">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={20} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm anh em trong bàn..."
              className="w-full bg-surface border border-border rounded-xl h-12 pl-12 pr-4 text-white focus:border-primary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Stats Bar */}
          {selectedPoll && (
            <div className="flex flex-wrap gap-3 md:gap-4 px-1">
              <div className="flex items-center gap-2 bg-surface/50 border border-border px-3 py-1.5 rounded-xl shadow-sm">
                <Users size={14} className="text-secondary" />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Thành viên:</span>
                <span className="text-sm font-black text-white">{Object.keys(userItems).length}</span>
              </div>
              <div className="flex items-center gap-2 bg-surface/50 border border-border px-3 py-1.5 rounded-xl shadow-sm">
                 {/* Importing Beer icon if not available, oh wait, I check imports */}
                <Beer size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Có nhậu:</span>
                <span className="text-sm font-black text-white">
                  {Object.keys(userItems).filter(uid => !selectedPoll.participants?.[uid]?.isNonDrinker).length}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-surface/50 border border-border px-3 py-1.5 rounded-xl shadow-sm">
                <Car size={14} className="text-blue-400" />
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Đi Taxi:</span>
                <span className="text-sm font-black text-white">
                  {(selectedPoll.taxiVoters || []).filter(uid => !!userItems[uid]).length}
                </span>
              </div>
            </div>
          )}

          {/* 2. List Users */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm text-secondary">
              <thead className="bg-background text-white font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Thành viên</th>
                  <th className="px-4 py-3 w-16 md:w-24 text-center" title="Tự động cân đối số tiền khi có thay đổi">Auto</th>
                  <th className="px-4 py-3 w-32 md:w-48 text-right">Tăng 1 (đ)</th>
                  <th className="px-4 py-3 w-32 md:w-48 text-right">Tăng 2 (đ)</th>
                  <th className="px-4 py-3 w-32 md:w-40 text-right"><span className="flex items-center justify-end gap-1"><Car size={14} /> Taxi</span></th>
                  <th className="px-4 py-3 text-right">Tổng</th>
                  <th className="px-4 py-3 text-center select-none">
                    <div className="flex flex-col items-center gap-1">
                      {isAdmin && (
                        <div
                          className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors mb-1 border-b border-white/10 pb-1"
                          onClick={() => {
                            const visibleItems = (Object.values(userItems) as BillItem[])
                              .filter(item => {
                                const u = getDisplayUser(item.userId);
                                const search = searchTerm.toLowerCase();
                                return u.nickname.toLowerCase().includes(search) ||
                                  (u.name || '').toLowerCase().includes(search) ||
                                  (u.email || '').toLowerCase().includes(search);
                              });
                            const allPaid = visibleItems.length > 0 && visibleItems.every(i => i.isPaid);
                            handleToggleAllPaid(!allPaid);
                          }}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${(Object.values(userItems) as BillItem[]).filter(item => {
                            const u = getDisplayUser(item.userId);
                            const search = searchTerm.toLowerCase();
                            return u.nickname.toLowerCase().includes(search) ||
                              (u.name || '').toLowerCase().includes(search) ||
                              (u.email || '').toLowerCase().includes(search);
                          }).every(i => i.isPaid) && (Object.values(userItems) as BillItem[]).filter(item => {
                            const u = getDisplayUser(item.userId);
                            const search = searchTerm.toLowerCase();
                            return u.nickname.toLowerCase().includes(search) ||
                              (u.name || '').toLowerCase().includes(search) ||
                              (u.email || '').toLowerCase().includes(search);
                          }).length > 0
                              ? 'bg-primary border-primary text-black'
                              : 'bg-transparent border-white/30'
                            }`}>
                            {(Object.values(userItems) as BillItem[]).filter(item => {
                              const u = getDisplayUser(item.userId);
                              const search = searchTerm.toLowerCase();
                              return u.nickname.toLowerCase().includes(search) ||
                                (u.name || '').toLowerCase().includes(search) ||
                                (u.email || '').toLowerCase().includes(search);
                            }).every(i => i.isPaid) && (Object.values(userItems) as BillItem[]).filter(item => {
                              const u = getDisplayUser(item.userId);
                              const search = searchTerm.toLowerCase();
                              return u.nickname.toLowerCase().includes(search) ||
                                (u.name || '').toLowerCase().includes(search) ||
                                (u.email || '').toLowerCase().includes(search);
                            }).length > 0 && <Check size={12} strokeWidth={4} />}
                          </div>
                          <span className="text-[10px]">All</span>
                        </div>
                      )}
                      <div
                        className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors"
                        onClick={() => {
                          setSortMode(prev => {
                            if (prev === 'NONE') return 'UNPAID';
                            if (prev === 'UNPAID') return 'PAID';
                            return 'NONE';
                          });
                        }}
                      >
                        Đã đóng?
                        <ArrowUpDown size={12} className={sortMode !== 'NONE' ? 'text-primary animate-pulse' : 'text-secondary/50'} />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(Object.values(userItems) as BillItem[])
                  .filter(item => {
                    const u = getDisplayUser(item.userId);
                    const search = searchTerm.toLowerCase();
                    return u.nickname.toLowerCase().includes(search) ||
                      (u.name || '').toLowerCase().includes(search) ||
                      (u.email || '').toLowerCase().includes(search);
                  })
                  .sort((a,b) => {
                    if (sortMode === 'NONE') return 0;
                    if (sortMode === 'PAID') {
                      if (a.isPaid === b.isPaid) return 0;
                      return a.isPaid ? -1 : 1;
                    }
                    if (sortMode === 'UNPAID') {
                      if (a.isPaid === b.isPaid) return 0;
                      return a.isPaid ? 1 : -1;
                    }
                    return 0;
                  })
                  .map(item => {
                    const displayUser = getDisplayUser(item.userId);
                    const isGhost = !users[item.userId];
                    return (
                      <tr key={item.userId} className={item.userId === user?.id ? 'bg-primary/5' : ''}>
                        <td className="px-4 py-3 flex items-center gap-3">
                          {!isOnlyBill ? (
                            <img src={displayUser.avatar} className={`w-10 h-10 rounded-full border border-surface ${isGhost ? 'grayscale' : ''}`} />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary font-black shrink-0 ${isGhost ? 'grayscale opacity-50' : ''}`}>
                                {displayUser.nickname.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`font-bold ${item.userId === effectiveUserId ? 'text-primary' : (isGhost ? 'text-secondary line-through' : 'text-white')}`}>
                              {displayUser.nickname} {item.userId === effectiveUserId && `(Bạn${isOnlyBill && !user ? ' - Click để chọn lại' : ''})`}
                            </span>
                            {selectedPoll?.participants?.[item.userId]?.isNonDrinker && (
                              <span className="text-[10px] text-secondary bg-white/5 border border-white/10 px-1 rounded w-fit">Không uống 🥤</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAutoBalance(item.userId)}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${autoBalanceMap[item.userId] ? 'text-primary bg-primary/10' : 'text-secondary bg-white/5'}`}
                            title={autoBalanceMap[item.userId] ? "Đang tự động cân đối" : "Số tiền cố định"}
                          >
                            {autoBalanceMap[item.userId] ? <RefreshCw size={18} className="animate-spin-slow" /> : <Lock size={18} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <MoneyInput
                            value={item.amount}
                            onChange={val => handleItemChange(item.userId,'amount',val)}
                            disabled={!isAdmin}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <MoneyInput
                            value={item.round2Amount}
                            onChange={val => handleItemChange(item.userId,'round2Amount',val)}
                            disabled={!isAdmin}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <MoneyInput
                            value={item.taxiAmount || 0}
                            onChange={val => handleItemChange(item.userId,'taxiAmount',val)}
                            disabled={!isAdmin}
                            placeholder={selectedPoll?.taxiVoters?.includes(item.userId) ? "Taxi 🚕" : "0"}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-black text-primary text-xl whitespace-nowrap">
                          {(item.amount + item.round2Amount + (item.taxiAmount || 0)).toLocaleString()} đ
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            {!isAdmin ? (
                              <div className={`w-6 h-6 rounded flex items-center justify-center transition-all ${item.isPaid ? 'bg-green-500 text-background border-none shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/5 border border-white/10'}`}>
                                {item.isPaid && <Check size={14} className="stroke-[4px]" />}
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                checked={item.isPaid}
                                disabled={!isAdmin}
                                onChange={e => handleItemChange(item.userId,'isPaid',e.target.checked)}
                                className={`w-6 h-6 accent-green-500 rounded cursor-pointer ${!isAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                <tr className="bg-primary/10">
                  <td className="px-4 py-4 font-black text-white text-right uppercase tracking-wider" colSpan={5}>TỔNG THIỆT HẠI:</td>
                  <td className="px-4 py-4 font-black text-primary text-right text-xl whitespace-nowrap">{grandTotal.toLocaleString()} đ</td>
                  <td></td>
                </tr>
                {(() => {
                  const totalCollected = (Object.values(userItems) as BillItem[])
                    .filter(item => item.isPaid)
                    .reduce((sum,item) => sum + (item.amount || 0) + (item.round2Amount || 0) + (item.taxiAmount || 0),0);

                  const remaining = grandTotal - totalCollected;

                  return (
                    <>
                      <tr className="bg-green-500/5 text-green-400">
                        <td className="px-4 py-3 font-bold text-right uppercase text-xs" colSpan={5}>Tổng tiền đã thu:</td>
                        <td className="px-4 py-3 font-bold text-right text-lg whitespace-nowrap">{totalCollected.toLocaleString()} đ</td>
                        <td></td>
                      </tr>
                      <tr className={remaining > 0 ? "bg-red-500/5 text-red-400" : "bg-green-500/10 text-green-500"}>
                        <td className="px-4 py-3 font-bold text-right uppercase text-xs" colSpan={5}>Còn lại:</td>
                        <td className="px-4 py-3 font-black text-right text-lg whitespace-nowrap">{remaining.toLocaleString()} đ</td>
                        <td></td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="flex justify-end sticky bottom-4 z-20">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`font-bold px-8 py-4 rounded-xl shadow-2xl flex items-center gap-2 transform active:scale-95 transition-all
                                    ${saving || !isDirty ? 'bg-secondary/20 text-secondary cursor-not-allowed opacity-50' : 'bg-primary hover:bg-primary-hover text-background cursor-pointer'}
                                `}
              >
                <Save size={24} /> {saving ? 'Đang lưu...' : 'Lưu Bill'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillSplit;
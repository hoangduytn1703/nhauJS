import React,{ useState,useEffect } from 'react';
import { DataService } from '@/core/services/mockService';
import { User,Poll,UserRole } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { 
  Receipt, 
  Plus, 
  Users, 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Check, 
  Calculator, 
  Calendar, 
  Settings, 
  XCircle, 
  Save, 
  ArrowLeft,
  Car,
  RefreshCw,
  ArrowUpDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { QRGenerator } from '@/components/QRGenerator';
import { Link } from 'react-router';

const OnlyBillAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab,setActiveTab] = useState<'PAYMENT' | 'POLLS' | 'BILL'>('BILL');
  const [users,setUsers] = useState<User[]>([]);
  const [polls,setPolls] = useState<Poll[]>([]);
  const [loading,setLoading] = useState(true);
  const [searchTerm,setSearchTerm] = useState('');

  // Tab 1: Payment
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // Tab 2: Poll Creation (Simplified)
  const [pollTitle,setPollTitle] = useState('');
  const [pollDesc,setPollDesc] = useState('');

  // Tab 3: Bill Flow State
  const [billStep, setBillStep] = useState<'SELECT_POLL' | 'SELECT_MEMBERS' | 'CALCULATE'>('SELECT_POLL');
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { joined: boolean, nonDrinker: boolean, taxi: boolean }>>({});

  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    refreshData();
  },[]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [uData,pData] = await Promise.all([
        DataService.getUsers(),
        DataService.getPolls()
      ]);
      setUsers(uData);
      setPolls(pData);
      
      // Initialize attendance map for Step 2
      const initialMap: Record<string, { joined: boolean, nonDrinker: boolean, taxi: boolean }> = {};
      uData.forEach(u => {
        initialMap[u.id] = { joined: false, nonDrinker: false, taxi: false };
      });
      setAttendanceMap(initialMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim()) return alert('Vui lòng nhập tiêu đề');
    setLoading(true);
    try {
      await DataService.createPoll({
          title: pollTitle,
          description: pollDesc,
          status: 'OPEN',
          deadline: 0,
          resultDate: 0,
          allowMultipleVotes: false,
          enableTaxi: false,
          createdBy: user?.id || ''
      }, [{ text: 'Default', description: '' }], []);
      setPollTitle('');
      setPollDesc('');
      alert('Tạo kèo thành công!');
      await refreshData();
      setActiveTab('BILL');
      setBillStep('SELECT_POLL');
    } catch (e) {
      alert('Lỗi khi tạo kèo');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSelection = (poll: Poll) => {
    setSelectedPoll(poll);
    setBillStep('SELECT_MEMBERS');
    
    // Pre-fill from existing poll data if available
    const newMap = { ...attendanceMap };
    users.forEach(u => {
      const isAttended = poll.confirmedAttendances?.includes(u.id) || false;
      const isNonDrinker = poll.participants?.[u.id]?.isNonDrinker || false;
      const isTaxi = poll.taxiVoters?.includes(u.id) || false;
      newMap[u.id] = { joined: isAttended, nonDrinker: isNonDrinker, taxi: isTaxi };
    });
    setAttendanceMap(newMap);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedPoll) return;
    
    const attendedIds = Object.keys(attendanceMap).filter(id => attendanceMap[id].joined);
    if (attendedIds.length === 0) return alert('Vui lòng chọn ít nhất 1 người tham gia');

    setLoading(true);
    try {
      // Check if session already had confirmed attendances and if it changed
      if (selectedPoll.confirmedAttendances && selectedPoll.confirmedAttendances.length > 0) {
          const oldIds = [...selectedPoll.confirmedAttendances].sort();
          const newIds = [...attendedIds].sort();
          const isChanged = JSON.stringify(oldIds) !== JSON.stringify(newIds);
          
          if (isChanged) {
              const confirm = window.confirm('Danh sách tham gia đã thay đổi so với bản trước. Các thành viên mới sẽ có số tiền là 0đ cho đến khi bạn áp dụng (Apply) lại bill ở bước kế tiếp. Bạn có muốn tiếp tục?');
              if (!confirm) {
                  setLoading(false);
                  return;
              }
          }
      }

      // Update confirmedAttendances and finalize on the default option
      await DataService.finalizePoll(selectedPoll.id, null, selectedPoll.options[0].id, attendedIds);
      
      // Update non-drinker status and taxi status
      const taxiIds = Object.keys(attendanceMap).filter(id => attendanceMap[id].joined && attendanceMap[id].taxi);
      await DataService.updatePoll(selectedPoll.id, { taxiVoters: taxiIds });

      for (const uid of attendedIds) {
          if (attendanceMap[uid].nonDrinker) {
              await DataService.toggleNonDrinker(selectedPoll.id, uid);
          }
      }

      setBillStep('CALCULATE');
    } catch (e) {
      alert('Lỗi khi lưu danh sách tham gia');
    } finally {
      setLoading(false);
    }
  };

  const seedUsers = async () => {
    if (window.confirm("Copy tất cả user từ DU2 sang Only Bill?")) {
        setLoading(true);
        try {
            await DataService.seedOnlyBillUsers();
            alert("Thành công!");
            refreshData();
        } catch(e) {
            alert("Lỗi!");
        } finally {
            setLoading(false);
        }
    }
}



const handleColumnSelectAll = (field: 'joined' | 'nonDrinker' | 'taxi') => {
    const visibleUsers = users.filter(u => 
        u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const allSelected = visibleUsers.every(u => attendanceMap[u.id]?.[field]);
    const newState = !allSelected;

    setAttendanceMap(prev => {
        const next = { ...prev };
        visibleUsers.forEach(u => {
            if (field === 'joined') {
                next[u.id] = { ...next[u.id], [field]: newState };
                if (!newState) {
                    next[u.id].nonDrinker = false;
                    next[u.id].taxi = false;
                }
            } else {
                // nonDrinker or taxi can only be set if joined
                if (next[u.id]?.joined) {
                    next[u.id] = { ...next[u.id], [field]: newState };
                }
            }
        });
        return next;
    });
};

const handleUserToggleAll = (userId: string) => {
    const current = attendanceMap[userId];
    const isAllOn = current?.joined && current?.nonDrinker && current?.taxi;
    
    setAttendanceMap(prev => ({
        ...prev,
        [userId]: {
            joined: !isAllOn,
            nonDrinker: !isAllOn,
            taxi: !isAllOn
        }
    }));
};



  if (!isAdmin) return <div className="p-10 text-center text-secondary">Bạn không có quyền truy cập trang này</div>;

  return (
    <div className="pb-20">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Calculator className="text-primary" /> Only Bill Admin
          </h1>
          <p className="text-secondary text-sm italic">Hệ thống quyết toán dành riêng cho DU2 - Isolated Data</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface p-1 rounded-2xl border border-border mb-8 w-fit mx-auto md:mx-0">
        <button
          onClick={() => setActiveTab('POLLS')}
          className={`cursor-pointer px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'POLLS' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
        >
          <Calendar size={18} /> Tạo kèo
        </button>
        <button
          onClick={() => setActiveTab('BILL')}
          className={`cursor-pointer px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'BILL' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
        >
          <Receipt size={18} /> Check số lượng
        </button>
        <button
          onClick={() => setActiveTab('PAYMENT')}
          className={`cursor-pointer px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'PAYMENT' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
        >
          <QrCode size={18} /> Thanh toán
        </button>
      </div>

      {activeTab === 'PAYMENT' && (
        <div className="bg-surface border border-border rounded-3xl p-8 max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <QrCode size={40} className="text-primary" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Thông tin thanh toán</h2>
            <p className="text-secondary mb-8">Cấu hình thông tin tài khoản ngân hàng để tạo mã QR chuyển khoản cho các bill.</p>
            <button 
                onClick={() => setShowQRGenerator(true)}
                className="bg-primary hover:bg-primary-hover text-background font-bold py-4 px-8 rounded-2xl transition-all shadow-xl flex items-center gap-2 mx-auto cursor-pointer"
            >
                <QrCode size={20} /> Thiết lập ngay
            </button>
        </div>
      )}

      {activeTab === 'POLLS' && (
        <div className="bg-surface border border-border rounded-3xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-6">Tạo Kèo Mới</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-secondary uppercase mb-2 ml-1">Tiêu đề buổi nhậu</label>
                    <input 
                        type="text"
                        placeholder="Ví dụ: Nhậu Tất Niên, Chia tay Team..."
                        className="w-full bg-background border border-border rounded-2xl p-4 text-white focus:border-primary outline-none transition-all"
                        value={pollTitle}
                        onChange={(e) => setPollTitle(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-secondary uppercase mb-2 ml-1">Mô tả (không bắt buộc)</label>
                    <textarea 
                        placeholder="Nội dung, quán xá, lưu ý..."
                        className="w-full bg-background border border-border rounded-2xl p-4 text-white focus:border-primary outline-none transition-all h-32"
                        value={pollDesc}
                        onChange={(e) => setPollDesc(e.target.value)}
                    />
                </div>
                <button 
                    disabled={loading}
                    onClick={handleCreatePoll}
                    className={`w-full bg-primary hover:bg-primary-hover text-background font-bold py-4 rounded-2xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? <RefreshCw size={20} className="animate-spin" /> : <Plus size={20} />}
                    {loading ? 'Đang lưu...' : 'Lưu Kèo & Chuyển sang Quyết toán'}
                </button>
            </div>
        </div>
      )}

      {activeTab === 'BILL' && (
        <div className="space-y-6">
            {billStep === 'SELECT_POLL' && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-black text-white mb-6">Bước 1: Chọn Kèo Cần Quyết Toán</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {polls.length === 0 ? (
                            <div className="col-span-2 p-12 text-center bg-surface border border-dashed border-border rounded-3xl">
                                <p className="text-secondary italic">Chưa có kèo nào. Hãy sang tab "Tạo kèo" trước.</p>
                            </div>
                        ) : (
                            polls.map(poll => (
                                <button 
                                    key={poll.id}
                                    onClick={() => handleStartSelection(poll)}
                                    className="text-left bg-surface border border-border p-6 rounded-3xl hover:border-primary transition-all group flex justify-between items-center cursor-pointer shadow-lg"
                                >
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{poll.title}</h3>
                                        <p className="text-xs text-secondary mt-1">{poll.description || '(Không có mô tả)'}</p>
                                        <div className="flex gap-2 mt-3">
                                            {poll.bill ? (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">Đã có bill</span>
                                            ) : (
                                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">Chưa có bill</span>
                                            )}
                                            <span className="text-[10px] bg-white/5 text-secondary px-2 py-0.5 rounded">{poll.confirmedAttendances?.length || 0} người</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {billStep === 'SELECT_MEMBERS' && selectedPoll && (
                <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-500">
                    <button onClick={() => setBillStep('SELECT_POLL')} className="flex items-center gap-2 text-secondary hover:text-white mb-6 transition-colors">
                        <ArrowLeft size={16} /> Quay lại chọn kèo
                    </button>
                    
                    <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border bg-background/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-white">{selectedPoll.title}</h2>
                                <p className="text-secondary text-sm italic">Bước 2: Chọn thành viên đi nhậu & trạng thái uống</p>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm thành viên..."
                                    className="w-full bg-background border border-border rounded-xl py-2 pl-12 pr-4 text-white outline-none focus:border-primary"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-background text-secondary text-[10px] uppercase font-bold tracking-wider">
                                        <th className="px-6 py-4">
                                            Thành viên
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                CÓ ĐI NHẬU?
                                                <button onClick={() => handleColumnSelectAll('joined')} className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 normal-case font-bold">
                                                    {users.filter(u => u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).every(u => attendanceMap[u.id]?.joined) ? <CheckSquare size={14} /> : <Square size={14} />} All
                                                </button>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                KHÔNG UỐNG?
                                                <button onClick={() => handleColumnSelectAll('nonDrinker')} className="text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 normal-case font-bold">
                                                    {users.filter(u => u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).every(u => !attendanceMap[u.id]?.joined || attendanceMap[u.id]?.nonDrinker) ? <CheckSquare size={14} /> : <Square size={14} />} All
                                                </button>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                ĐI TAXI CHUNG?
                                                <button onClick={() => handleColumnSelectAll('taxi')} className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 normal-case font-bold">
                                                    {users.filter(u => u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).every(u => !attendanceMap[u.id]?.joined || attendanceMap[u.id]?.taxi) ? <CheckSquare size={14} /> : <Square size={14} />} All
                                                </button>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center">ALL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">   
                                    {users.filter(u => u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                                        <tr key={u.id} className={`hover:bg-white/5 transition-colors ${attendanceMap[u.id]?.joined ? 'bg-primary/5' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary font-black">
                                                        {u.nickname.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white">{u.nickname}</span>
                                                        <span className="text-[10px] text-secondary">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => setAttendanceMap(prev => {
                                                        const isJoined = !prev[u.id]?.joined;
                                                        return { 
                                                            ...prev, 
                                                            [u.id]: { 
                                                                ...prev[u.id], 
                                                                joined: isJoined,
                                                                nonDrinker: isJoined ? prev[u.id]?.nonDrinker : false,
                                                                taxi: isJoined ? prev[u.id]?.taxi : false
                                                            } 
                                                        };
                                                    })}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transition-all border cursor-pointer ${
                                                        attendanceMap[u.id]?.joined 
                                                        ? 'bg-primary border-primary text-background' 
                                                        : 'bg-background border-border text-secondary'
                                                    }`}
                                                >
                                                    {attendanceMap[u.id]?.joined ? <Check size={24} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-secondary/20" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    disabled={!attendanceMap[u.id]?.joined}
                                                    onClick={() => setAttendanceMap(prev => ({ 
                                                        ...prev, 
                                                        [u.id]: { ...prev[u.id], nonDrinker: !prev[u.id].nonDrinker } 
                                                    }))}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transition-all border cursor-pointer ${
                                                        attendanceMap[u.id]?.nonDrinker 
                                                        ? 'bg-orange-600 border-orange-600 text-white' 
                                                        : 'bg-background border-border text-secondary'
                                                    } ${!attendanceMap[u.id]?.joined ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                                                >
                                                    {attendanceMap[u.id]?.nonDrinker ? <XCircle size={24} /> : <div className="w-10 h-1" />}
                                                </button>
                                                {attendanceMap[u.id]?.nonDrinker && (
                                                    <span className="text-[8px] font-bold text-orange-400 block mt-1 uppercase">Ko uống bia</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    disabled={!attendanceMap[u.id]?.joined}
                                                    onClick={() => setAttendanceMap(prev => ({ 
                                                        ...prev, 
                                                        [u.id]: { ...prev[u.id], taxi: !prev[u.id].taxi } 
                                                    }))}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transition-all border cursor-pointer ${
                                                        attendanceMap[u.id]?.taxi 
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                                                        : 'bg-background border-border text-secondary'
                                                    } ${!attendanceMap[u.id]?.joined ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                                                >
                                                    {attendanceMap[u.id]?.taxi ? <Car size={24} /> : <div className="w-10 h-1" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleUserToggleAll(u.id)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all border cursor-pointer ${
                                                        attendanceMap[u.id]?.joined && attendanceMap[u.id]?.nonDrinker && attendanceMap[u.id]?.taxi
                                                        ? 'bg-white text-black border-white'
                                                        : 'bg-transparent border-white/20 text-white/40 hover:text-white hover:border-white/50'
                                                    }`}
                                                >
                                                    <CheckSquare size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 bg-background/50 border-t border-border flex justify-between items-center">
                            <div className="text-secondary text-sm">
                                <span className="font-bold text-white text-lg">{Object.values(attendanceMap).filter(v => v.joined).length}</span> người đã chọn
                            </div>
                            <button 
                                disabled={loading}
                                onClick={handleSubmitAttendance}
                                className={`bg-primary hover:bg-primary-hover text-background font-black py-4 px-10 rounded-2xl transition-all shadow-xl flex items-center gap-2 transform active:scale-95 cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? <RefreshCw size={20} className="animate-spin" /> : <>TIẾP THEO: TÍNH TIỀN <ArrowRight size={20} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {billStep === 'CALCULATE' && selectedPoll && (
                <div className="max-w-full animate-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setBillStep('SELECT_MEMBERS')} className="flex items-center gap-2 text-secondary hover:text-white transition-colors">
                            <ArrowLeft size={16} /> Quay lại chọn member
                        </button>
                        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-2">
                             <Calculator size={18} />
                             <span className="font-bold">ĐANG TÍNH TIỀN CHO: {selectedPoll.title}</span>
                        </div>
                    </div>
                    
                    {/* Placeholder for Bill Split Component or logic */}
                    <div className="bg-surface border border-border rounded-3xl p-12 text-center">
                         <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={40} className="text-green-500" />
                         </div>
                         <h2 className="text-2xl font-black text-white mb-2">Đã lưu danh sách tham gia</h2>
                         <p className="text-secondary mb-8">Hệ thống đã cập nhật những người đi nhậu. Bạn có thể sang trang tính tiền chính thức để nhập hóa đơn.</p>
                         <Link 
                            to={`/only-bill/bills?pollId=${selectedPoll.id}`}
                            className="inline-flex bg-primary hover:bg-primary-hover text-background font-bold py-4 px-8 rounded-2xl transition-all shadow-xl items-center gap-2 cursor-pointer"
                         >
                            Mở trang Bill Split <ArrowRight size={20} />
                         </Link>
                         <p className="mt-4 text-xs text-secondary opacity-50 italic">* Only-Bill sử dụng chung UI với Bill Split nhưng dữ liệu hoàn toàn tách biệt nhờ URL /only-bill</p>
                    </div>
                </div>
            )}
        </div>
      )}

      {showQRGenerator && (
        <QRGenerator onClose={() => setShowQRGenerator(false)} polls={polls} />
      )}
    </div>
  );
};

export default OnlyBillAdmin;

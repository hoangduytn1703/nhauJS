import React, { useState, useEffect } from 'react';
import { DataService } from '../services/mockService';
import { User, Poll, PollOption } from '../types';
import { useAuth } from '../App';
import { Plus, Trash2, LayoutList, Edit2, Calendar, MapPin, CheckSquare, Square, Clock, Eye, Gavel, Check, Ban, AlertTriangle } from 'lucide-react';
import { UserDetailModal } from '../components/UserDetailModal';

// Helper to format date for input type="date"
const toInputDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
};

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'USERS' | 'POLLS'>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<string>(''); // YYYY-MM-DD
  const [resultDate, setResultDate] = useState<string>(''); // YYYY-MM-DD
  
  // Location Options State
  const [pollOptions, setPollOptions] = useState<{id?: string, text: string, description: string, votes?: string[]}[]>([
      { text: '', description: '' }, 
      { text: '', description: '' }
  ]);
  
  // Time Options State (Now Date Options)
  const [timeOptions, setTimeOptions] = useState<{id?: string, text: string, votes?: string[]}[]>([
      { text: '' },
      { text: '' }
  ]);

  // Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // User Actions State
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Finalize State
  const [finalizingPollId, setFinalizingPollId] = useState<string | null>(null);
  const [selectedFinalTime, setSelectedFinalTime] = useState<string>('');
  const [selectedFinalLoc, setSelectedFinalLoc] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    DataService.getUsers().then(setUsers);
    DataService.getPolls().then(setPolls);
  }

  // Populate form when clicking Edit
  const handleEditClick = (poll: Poll) => {
      setEditingPollId(poll.id);
      setPollTitle(poll.title);
      setPollDesc(poll.description);
      setAllowMultiple(poll.allowMultipleVotes || false);
      setDeadlineDate(toInputDate(poll.deadline));
      setResultDate(toInputDate(poll.resultDate));
      
      // Map existing options to form
      const formOptions = poll.options.map(o => ({
          id: o.id,
          text: o.text,
          description: o.description || '',
          votes: o.votes
      }));
      setPollOptions(formOptions);

      // Map existing time options
      const formTimes = (poll.timeOptions || []).map(t => ({
          id: t.id,
          text: t.text,
          votes: t.votes
      }));
      if (formTimes.length === 0) {
           setTimeOptions([{ text: '' }, { text: '' }]);
      } else {
           setTimeOptions(formTimes);
      }
      
      // Pre-select finalize values if any
      setSelectedFinalTime(poll.finalizedTimeId || '');
      setSelectedFinalLoc(poll.finalizedOptionId || '');

      // Scroll to form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingPollId(null);
      resetForm();
  };

  const resetForm = () => {
      setPollTitle('');
      setPollDesc('');
      setAllowMultiple(false);
      setDeadlineDate('');
      setResultDate('');
      setPollOptions([{ text: '', description: '' }, { text: '', description: '' }]);
      setTimeOptions([{ text: '' }, { text: '' }]);
      setSelectedFinalTime('');
      setSelectedFinalLoc('');
  };

  // Helper to create timestamp at 16:00:00 VN Time (+7)
  const createFixedTimestamp = (dateString: string) => {
      if (!dateString) return 0;
      // Append time and zone
      const combined = `${dateString}T16:00:00+07:00`;
      return new Date(combined).getTime();
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;

      const validOptions = pollOptions.filter(o => o.text.trim() !== '');
      if (validOptions.length < 2) return alert('Cần ít nhất 2 địa điểm');

      const validTimeOptions = timeOptions.filter(t => t.text.trim() !== '').map(t => t.text);
      if (validTimeOptions.length < 1) return alert('Cần ít nhất 1 ngày đề xuất');
      
      const payload = {
          title: pollTitle,
          description: pollDesc,
          allowMultipleVotes: allowMultiple,
          deadline: createFixedTimestamp(deadlineDate),
          resultDate: createFixedTimestamp(resultDate),
          status: 'OPEN' as const,
          createdBy: user.id,
      };

      try {
        if (editingPollId) {
            // Update mode
            const updatedOptions: PollOption[] = validOptions.map((opt, idx) => ({
                id: opt.id || `opt_loc_${Date.now()}_${idx}`,
                text: opt.text,
                description: opt.description,
                votes: opt.votes || [],
                image: `https://picsum.photos/400/200?random=${idx}`
            }));

            const updatedTimeOptions: PollOption[] = timeOptions.filter(t => t.text.trim() !== '').map((t, idx) => ({
                id: t.id || `opt_time_${Date.now()}_${idx}`,
                text: t.text,
                votes: t.votes || []
            }));

            await DataService.updatePoll(editingPollId, { 
                ...payload, 
                options: updatedOptions,
                timeOptions: updatedTimeOptions
            });
            alert('Cập nhật kèo thành công!');
        } else {
            // Create mode
            await DataService.createPoll(payload, validOptions, validTimeOptions);
            alert('Tạo kèo thành công!');
        }
        
        setEditingPollId(null);
        resetForm();
        refreshData();
      } catch (err) {
          console.error(err);
          alert('Có lỗi xảy ra');
      }
  };

  const handleDeletePoll = async (pollId: string) => {
      if (confirmDeleteId === pollId) {
          try {
              await DataService.deletePoll(pollId);
              refreshData();
              setConfirmDeleteId(null);
          } catch (e) {
              console.error(e);
          }
      } else {
          setConfirmDeleteId(pollId);
          // Auto reset confirm state after 3 seconds
          setTimeout(() => setConfirmDeleteId(null), 3000);
      }
  }

  // --- USER MANAGEMENT LOGIC ---

  const handleToggleBan = async (targetUser: User) => {
      if (targetUser.id === user?.id) return alert("Không thể tự ban chính mình!");
      
      setProcessingUserId(targetUser.id);
      try {
          await DataService.toggleBanUser(targetUser.id, !targetUser.isBanned);
          // Update local state
          setUsers(prev => prev.map(u => u.id === targetUser.id ? {...u, isBanned: !targetUser.isBanned} : u));
      } catch (e) {
          alert("Lỗi khi cập nhật trạng thái Ban");
      } finally {
          setProcessingUserId(null);
      }
  };

  const handleDeleteUser = async (targetUserId: string) => {
      if (targetUserId === user?.id) return alert("Không thể tự xóa chính mình!");
      
      if (confirmDeleteId === targetUserId) {
          setProcessingUserId(targetUserId);
          try {
              await DataService.deleteUser(targetUserId);
              setUsers(prev => prev.filter(u => u.id !== targetUserId));
              setConfirmDeleteId(null);
              // Note: Vote history remains because we only deleted the User document,
              // poll.votes still contains the ID. UI handles missing user gracefully.
          } catch (e) {
              alert("Lỗi khi xóa user");
          } finally {
              setProcessingUserId(null);
          }
      } else {
          setConfirmDeleteId(targetUserId);
          setTimeout(() => setConfirmDeleteId(null), 3000);
      }
  };

  const handleToggleAttendance = async (pollId: string, userId: string) => {
      try {
          await DataService.toggleAttendance(pollId, userId);
          setPolls(prev => prev.map(p => {
              if (p.id !== pollId) return p;
              let attended = p.confirmedAttendances || [];
              if (attended.includes(userId)) {
                  attended = attended.filter(id => id !== userId);
              } else {
                  attended = [...attended, userId];
              }
              return { ...p, confirmedAttendances: attended };
          }));
      } catch (e) {
          alert('Lỗi khi cập nhật tham gia');
      }
  };

  // --- Finalize Logic ---
  const handleFinalizeClick = (poll: Poll) => {
      if (finalizingPollId === poll.id) {
          setFinalizingPollId(null);
          setSelectedFinalTime('');
          setSelectedFinalLoc('');
      } else {
          setFinalizingPollId(poll.id);
          // Pre-select if already finalized or select the first top winner
          const topTimes = getWinners(poll.timeOptions || []);
          const topLocs = getWinners(poll.options);
          
          setSelectedFinalTime(poll.finalizedTimeId || (topTimes.length > 0 ? topTimes[0].id : ''));
          setSelectedFinalLoc(poll.finalizedOptionId || (topLocs.length > 0 ? topLocs[0].id : ''));
      }
  };

  const submitFinalize = async (pollId: string) => {
      try {
          await DataService.finalizePoll(pollId, selectedFinalTime || null, selectedFinalLoc || null);
          setFinalizingPollId(null);
          if (editingPollId === pollId) {
              setEditingPollId(null);
              resetForm();
          }
          refreshData();
          alert("Đã chốt kèo!");
      } catch (e) {
          console.error(e);
          alert("Lỗi");
      }
  };

  const getWinners = (options: PollOption[]) => {
      if (!options || options.length === 0) return [];
      const maxVotes = Math.max(...options.map(o => o.votes.length));
      if (maxVotes === 0) return [];
      return options.filter(o => o.votes.length === maxVotes);
  }

  // Location handlers
  const handleOptionChange = (idx: number, field: 'text' | 'description', val: string) => {
      const newOpts = [...pollOptions];
      newOpts[idx] = { ...newOpts[idx], [field]: val };
      setPollOptions(newOpts);
  };
  const addOption = () => setPollOptions([...pollOptions, { text: '', description: '' }]);
  const removeOption = (idx: number) => {
      if (pollOptions.length <= 2) return;
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  // Time handlers
  const handleTimeChange = (idx: number, val: string) => {
      const newTimes = [...timeOptions];
      newTimes[idx] = { ...newTimes[idx], text: val };
      setTimeOptions(newTimes);
  }
  const addTime = () => setTimeOptions([...timeOptions, { text: '' }]);
  const removeTime = (idx: number) => {
      if (timeOptions.length <= 1) return;
      setTimeOptions(timeOptions.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
        <UserDetailModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
            allPolls={polls}
            currentUserRole={user?.role}
            onToggleAttendance={handleToggleAttendance}
        />

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-black text-white">Pub Master</h1>
                <p className="text-secondary">Quản lý dân chơi và tạo kèo</p>
            </div>
            <div className="flex gap-2 bg-surface p-1 rounded-full border border-border">
                <button 
                    onClick={() => setActiveTab('USERS')} 
                    className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'USERS' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                >
                    Thành viên
                </button>
                <button 
                    onClick={() => setActiveTab('POLLS')} 
                    className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'POLLS' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                >
                    Quản lý Kèo
                </button>
            </div>
        </header>

        {activeTab === 'USERS' && (
            <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-secondary">
                        <thead className="bg-background text-xs uppercase font-bold text-white">
                            <tr>
                                <th className="px-6 py-4">Dân chơi</th>
                                <th className="px-6 py-4 text-center">Tình trạng</th>
                                <th className="px-6 py-4">Tham gia</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map(u => (
                                <tr key={u.id} className={`hover:bg-background/50 cursor-pointer ${u.isBanned ? 'bg-red-900/10' : ''}`} onClick={() => setSelectedUser(u)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={u.avatar} className={`w-10 h-10 rounded-full ${u.isBanned ? 'grayscale opacity-50' : ''}`} />
                                                {u.isBanned && (
                                                    <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 border border-background text-white">
                                                        <Ban size={10} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className={`font-bold ${u.isBanned ? 'text-red-400 line-through' : 'text-white'}`}>{u.nickname}</div>
                                                <div className="text-xs">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {u.isBanned ? (
                                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30 font-bold">BANNED</span>
                                        ) : (
                                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30 font-bold">ACTIVE</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                         {/* Count actual participation */}
                                        <span className="bg-white/10 px-2 py-1 rounded text-xs text-white">
                                            {polls.filter(p => p.confirmedAttendances?.includes(u.id)).length} kèo
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleToggleBan(u)}
                                                disabled={processingUserId === u.id || u.role === 'ADMIN'}
                                                className={`p-2 rounded-lg transition-all ${u.isBanned ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/40'}`}
                                                title={u.isBanned ? "Mở khóa (Unban)" : "Cấm (Ban)"}
                                            >
                                                {u.isBanned ? <Check size={16}/> : <Ban size={16}/>}
                                            </button>

                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                disabled={processingUserId === u.id || u.role === 'ADMIN'}
                                                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${confirmDeleteId === u.id ? 'bg-red-600 text-white hover:bg-red-700 w-auto px-3' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                                                title="Xóa vĩnh viễn"
                                            >
                                                {confirmDeleteId === u.id ? <AlertTriangle size={16}/> : <Trash2 size={16}/>}
                                                {confirmDeleteId === u.id && <span className="text-xs font-bold">Xác nhận?</span>}
                                            </button>
                                            
                                            <button 
                                                onClick={() => setSelectedUser(u)}
                                                className="p-2 hover:text-primary transition-colors text-secondary"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'POLLS' && (
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Create/Edit Poll Form */}
                <div className="bg-surface p-8 rounded-2xl border border-border h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {editingPollId ? <Edit2 className="text-primary"/> : <Plus className="text-primary"/>} 
                            {editingPollId ? 'Chỉnh sửa kèo' : 'Tạo kèo mới'}
                        </h2>
                        {editingPollId && (
                            <button onClick={handleCancelEdit} className="text-xs text-secondary hover:text-white underline">Hủy bỏ</button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-bold text-white block mb-2">Tiêu đề</label>
                                <input value={pollTitle} onChange={e => setPollTitle(e.target.value)} required className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none" placeholder="Hôm nay uống gì?" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-white block mb-2">Mô tả</label>
                                <textarea value={pollDesc} onChange={e => setPollDesc(e.target.value)} className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none min-h-[80px]" placeholder="Nhập mô tả cho anh em..." />
                            </div>

                            {/* Settings Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-white block mb-2 flex items-center gap-1"><Calendar size={14}/> Deadline Vote (Date)</label>
                                    <input 
                                        type="date" 
                                        value={deadlineDate}
                                        onChange={e => setDeadlineDate(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg p-2 text-white text-sm focus:border-primary outline-none cursor-pointer" 
                                    />
                                    <p className="text-[10px] text-secondary mt-1 italic">Mặc định chốt lúc 16:00</p>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-white block mb-2 flex items-center gap-1"><Calendar size={14}/> Ngày báo kết quả</label>
                                    <input 
                                        type="date" 
                                        value={resultDate}
                                        onChange={e => setResultDate(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg p-2 text-white text-sm focus:border-primary outline-none cursor-pointer" 
                                    />
                                </div>
                            </div>

                            {/* Switch */}
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer" onClick={() => setAllowMultiple(!allowMultiple)}>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${allowMultiple ? 'bg-primary' : 'bg-surface border border-secondary'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${allowMultiple ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Cho phép chọn nhiều</div>
                                    <div className="text-xs text-secondary">Người dùng có thể vote nhiều quán/ngày cùng lúc</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Time Options (Date) */}
                        <div>
                            <label className="text-sm font-bold text-white block mb-2 flex items-center gap-2"><Calendar size={16}/> Chọn ngày chiến (Date Options)</label>
                            <div className="grid grid-cols-2 gap-3">
                                {timeOptions.map((opt, idx) => (
                                    <div key={idx} className="bg-background p-2 rounded-lg border border-border flex gap-2 items-center relative">
                                         <input 
                                            type="date"
                                            value={opt.text}
                                            onChange={e => handleTimeChange(idx, e.target.value)}
                                            className="flex-1 bg-transparent text-white text-sm font-bold outline-none text-center cursor-pointer"
                                         />
                                         {timeOptions.length > 1 && (
                                            <button type="button" onClick={() => removeTime(idx)} className="text-secondary hover:text-red-500"><Trash2 size={14}/></button>
                                         )}
                                    </div>
                                ))}
                                <button type="button" onClick={addTime} className="bg-surface border border-dashed border-secondary text-secondary hover:text-white hover:border-white rounded-lg p-2 flex items-center justify-center">
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* Location Options */}
                        <div>
                            <label className="text-sm font-bold text-white block mb-2 flex items-center gap-2"><MapPin size={16}/> Các địa điểm (Location Options)</label>
                            <div className="space-y-3">
                                {pollOptions.map((opt, idx) => (
                                    <div key={idx} className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2 relative group">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-secondary text-sm font-mono w-4">{idx + 1}.</span>
                                            <input 
                                                value={opt.text} 
                                                onChange={e => handleOptionChange(idx, 'text', e.target.value)}
                                                className="flex-1 bg-surface border border-border rounded px-3 py-2 text-white focus:border-primary outline-none text-sm font-bold"
                                                placeholder={`Tên quán...`}
                                            />
                                            {pollOptions.length > 2 && (
                                                <button type="button" onClick={() => removeOption(idx)} className="text-secondary hover:text-red-500"><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-center pl-6">
                                            <MapPin size={14} className="text-secondary" />
                                            <input 
                                                value={opt.description} 
                                                onChange={e => handleOptionChange(idx, 'description', e.target.value)}
                                                className="flex-1 bg-transparent border-b border-border py-1 text-white focus:border-primary outline-none text-xs placeholder-secondary/50"
                                                placeholder={`Địa chỉ hoặc link Google Map...`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addOption} className="text-primary text-sm font-bold flex items-center gap-1 mt-3 hover:text-primary-hover transition-colors">
                                <Plus size={16} /> Thêm địa điểm
                            </button>
                        </div>

                        <button type="submit" className="mt-4 bg-primary text-background font-bold py-3 rounded-lg hover:bg-primary-hover shadow-lg transition-all active:scale-95">
                            {editingPollId ? 'Cập nhật kèo' : 'Phát động cuộc nhậu 🍻'}
                        </button>
                    </form>

                    {/* Finalize Section inside Edit Form */}
                    {editingPollId && (
                        <div className="mt-8 pt-8 border-t border-border">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Gavel className="text-yellow-500" /> Chốt kèo thủ công
                            </h3>
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-5 rounded-xl">
                                <p className="text-sm text-yellow-100 mb-4 italic">
                                    "Quyền lực tối thượng: Chốt kèo ngay lập tức mà không cần chờ đến deadline."
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-secondary block mb-1">Ngày chốt</label>
                                        <select 
                                            value={selectedFinalTime}
                                            onChange={e => setSelectedFinalTime(e.target.value)}
                                            className="w-full bg-background border border-border rounded p-2 text-sm text-white focus:border-yellow-500 outline-none"
                                        >
                                            <option value="">-- Tự động (Theo Vote) --</option>
                                            {/* We use options from the POLL object in state to ensure IDs exist */}
                                            {polls.find(p => p.id === editingPollId)?.timeOptions?.map((t) => (
                                                <option key={t.id} value={t.id}>{new Date(t.text).toLocaleDateString('vi-VN')} ({t.votes.length} votes)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-secondary block mb-1">Địa điểm chốt</label>
                                        <select 
                                            value={selectedFinalLoc}
                                            onChange={e => setSelectedFinalLoc(e.target.value)}
                                            className="w-full bg-background border border-border rounded p-2 text-sm text-white focus:border-yellow-500 outline-none"
                                        >
                                            <option value="">-- Tự động (Theo Vote) --</option>
                                            {polls.find(p => p.id === editingPollId)?.options.map((t) => (
                                                <option key={t.id} value={t.id}>{t.text} ({t.votes.length} votes)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <button 
                                    type="button"
                                    onClick={() => submitFinalize(editingPollId)}
                                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Gavel size={18}/> Chốt kèo này ngay
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* List Existing Polls */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <LayoutList className="text-primary"/> Danh sách kèo
                    </h2>
                    {polls.length === 0 && <div className="text-secondary italic">Chưa có kèo nào.</div>}
                    {polls.map(poll => {
                        const expired = poll.deadline > 0 && Date.now() > poll.deadline;
                        const topTimes = getWinners(poll.timeOptions || []);
                        const topLocs = getWinners(poll.options);

                        return (
                        <div key={poll.id} className={`bg-surface p-4 rounded-xl border flex flex-col gap-4 transition-colors ${editingPollId === poll.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 cursor-pointer" onClick={() => handleEditClick(poll)}>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        {poll.title} 
                                        {poll.finalizedOptionId && <Check size={16} className="text-green-500" />}
                                    </h3>
                                    <p className="text-secondary text-sm line-clamp-1 mb-2">{poll.description}</p>
                                    <div className="flex flex-wrap gap-2 text-xs text-secondary/70">
                                        <span className="bg-background px-2 py-1 rounded border border-border">{new Date(poll.createdAt).toLocaleDateString('vi-VN')}</span>
                                        <span className="bg-background px-2 py-1 rounded border border-border">{poll.options.length} quán</span>
                                        <span className="bg-background px-2 py-1 rounded border border-border flex items-center gap-1">
                                            <Calendar size={10}/> {(poll.timeOptions || []).length} ngày
                                        </span>
                                        {expired && (
                                            <span className="bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-900/50 flex items-center gap-1 font-bold">
                                                <Clock size={10}/> Đã chốt
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(poll); }}
                                        className="p-2 text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                        title="Sửa kèo"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id); }}
                                        className={`p-2 rounded-lg transition-all flex items-center gap-1 ${confirmDeleteId === poll.id ? 'bg-red-600 text-white hover:bg-red-700 w-auto px-3' : 'text-secondary hover:text-red-500 hover:bg-red-500/10'}`}
                                        title={confirmDeleteId === poll.id ? "Nhấn lần nữa để xóa" : "Xóa kèo"}
                                    >
                                        <Trash2 size={18} />
                                        {confirmDeleteId === poll.id && <span className="text-xs font-bold pr-1">?</span>}
                                    </button>
                                </div>
                            </div>

                            {/* Finalize UI for Everyone (Admin Override) */}
                            <div className={`border-t border-border pt-3 ${finalizingPollId === poll.id ? 'block' : ''}`}>
                                {finalizingPollId === poll.id ? (
                                    <div className="animate-in slide-in-from-top-2">
                                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                            <Gavel size={14} className="text-yellow-500"/> Chốt kết quả cuối cùng
                                        </h4>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-secondary block mb-1">Ngày (Top Votes)</label>
                                                <select 
                                                    value={selectedFinalTime}
                                                    onChange={e => setSelectedFinalTime(e.target.value)}
                                                    className="w-full bg-background border border-border rounded p-2 text-sm text-white"
                                                >
                                                    <option value="">-- Chọn ngày --</option>
                                                    {topTimes.map(t => (
                                                        <option key={t.id} value={t.id}>{new Date(t.text).toLocaleDateString('vi-VN')} ({t.votes.length} votes)</option>
                                                    ))}
                                                    {topTimes.length === 0 && (poll.timeOptions || []).map(t => (
                                                        <option key={t.id} value={t.id}>{new Date(t.text).toLocaleDateString('vi-VN')} ({t.votes.length} votes)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-secondary block mb-1">Địa điểm (Top Votes)</label>
                                                <select 
                                                    value={selectedFinalLoc}
                                                    onChange={e => setSelectedFinalLoc(e.target.value)}
                                                    className="w-full bg-background border border-border rounded p-2 text-sm text-white"
                                                >
                                                    <option value="">-- Chọn quán --</option>
                                                    {topLocs.map(t => (
                                                        <option key={t.id} value={t.id}>{t.text} ({t.votes.length} votes)</option>
                                                    ))}
                                                    {topLocs.length === 0 && poll.options.map(t => (
                                                        <option key={t.id} value={t.id}>{t.text} ({t.votes.length} votes)</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setFinalizingPollId(null)} className="text-xs px-3 py-1.5 rounded bg-surface border border-border text-secondary hover:text-white">Hủy</button>
                                            <button onClick={() => submitFinalize(poll.id)} className="text-xs px-3 py-1.5 rounded bg-yellow-500 hover:bg-yellow-600 text-black font-bold">Lưu Chốt Kèo</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleFinalizeClick(poll)}
                                        className={`w-full py-2 rounded border border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all ${poll.finalizedOptionId ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'}`}
                                    >
                                        {poll.finalizedOptionId ? <Check size={16}/> : <Gavel size={16}/>}
                                        {poll.finalizedOptionId ? 'Đã chốt kèo (Sửa)' : 'Chốt kèo này ngay'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        )}
    </div>
  );
};

export default Admin;
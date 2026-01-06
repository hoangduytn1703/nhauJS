import React, { useEffect, useState } from 'react';
import { DataService } from '../services/mockService';
import { Poll, User, PollOption } from '../types';
import { useAuth } from '../App';
import { Clock, TrendingUp, ThumbsUp, Beer, MapPin, CheckSquare, AlertCircle, XCircle, CheckCircle, RefreshCcw, Calendar, ArrowUp, Star, Award, ExternalLink, Plus, Users, User as UserIcon, StickyNote, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PollResultModal } from '../components/PollResultModal';

const Vote: React.FC = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [users, setUsers] = useState<User[]>([]); // Array of users for Modal
  
  // Local state for reason input
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineInputFor, setShowDeclineInputFor] = useState<string | null>(null);
  
  // Local state for Cancel Confirmation
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);

  // Warning state
  const [warningMsg, setWarningMsg] = useState<{pollId: string, msg: string} | null>(null);

  // Add Option State
  const [addModal, setAddModal] = useState<{show: boolean, pollId: string, type: 'options' | 'timeOptions'}>({show: false, pollId: '', type: 'options'});
  const [newOptionText, setNewOptionText] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');
  const [newOptionNotes, setNewOptionNotes] = useState(''); // New field for notes
  const [adding, setAdding] = useState(false);

  // View Voters Modal State
  const [viewVotersModal, setViewVotersModal] = useState<{show: boolean, title: string, voterIds: string[]}>({show: false, title: '', voterIds: []});
  
  // View Poll Result Modal State
  const [viewResultPoll, setViewResultPoll] = useState<Poll | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = async () => {
     try {
         const [pollsData, usersData] = await Promise.all([
             DataService.getPolls(),
             DataService.getUsers()
         ]);
         
         const map: Record<string, User> = {};
         usersData.forEach(u => map[u.id] = u);
         
         setUserMap(map);
         setUsers(usersData);
         
         // Filter out hidden polls
         const visiblePolls = pollsData.filter(p => !p.isHidden);
         setPolls(visiblePolls);
     } catch (e) {
         console.error(e);
     } finally {
         setLoading(false);
     }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleParticipation = async (pollId: string, status: 'JOIN' | 'DECLINE', reason: string = '') => {
      if(!user) return;
      if (isAdmin) return alert("Admin chỉ được xem, không tham gia vote!");
      
      try {
          await DataService.submitParticipation(pollId, user.id, status, reason);
          setShowDeclineInputFor(null);
          setDeclineReason('');
          setConfirmDeclineId(null);
          fetchData(); // Refresh to update UI state
      } catch (e: any) {
          alert(e.message || 'Lỗi');
      }
  };

  const handleVote = async (pollId: string, optionId: string, target: 'options' | 'timeOptions') => {
    if(!user) return;
    if (isAdmin) return alert("Admin chỉ được xem, không tham gia vote!");
    
    // Check constraint: Must vote time before location
    const poll = polls.find(p => p.id === pollId);
    if (poll && target === 'options' && poll.timeOptions && poll.timeOptions.length > 0) {
        const hasVotedTime = poll.timeOptions.some(t => t.votes.includes(user.id));
        if (!hasVotedTime) {
            setWarningMsg({pollId, msg: '⚠️ Vui lòng chọn ngày trước khi chọn quán!'});
            setTimeout(() => setWarningMsg(null), 3000);
            return;
        }
    }

    try {
        await DataService.vote(pollId, optionId, user.id, target);
        // Optimistic update
        const updatedPolls = await DataService.getPolls();
        setPolls(updatedPolls.filter(p => !p.isHidden));
    } catch (error: any) {
        alert(error.message || 'Lỗi khi vote');
    }
  };

  const isPollEnded = (poll: Poll) => {
      const deadlinePassed = poll.deadline > 0 && Date.now() > poll.deadline;
      // Kèo coi như kết thúc nếu quá hạn HOẶC đã được admin chốt (có finalizedOptionId)
      const isFinalized = !!poll.finalizedOptionId;
      return deadlinePassed || isFinalized;
  }

  // --- Add Option Logic ---
  const openAddModal = (pollId: string, type: 'options' | 'timeOptions') => {
      if (isAdmin) return;
      setAddModal({ show: true, pollId, type });
      setNewOptionText('');
      setNewOptionDesc('');
      setNewOptionNotes('');
  };

  const submitNewOption = async () => {
      if (!user) return;
      if (isAdmin) return;
      if (!newOptionText.trim()) return alert("Vui lòng nhập thông tin");

      setAdding(true);
      try {
          await DataService.addPollOption(addModal.pollId, addModal.type, {
              text: newOptionText,
              description: newOptionDesc,
              notes: newOptionNotes
          }, user.id);
          
          setAddModal({ ...addModal, show: false });
          fetchData();
      } catch (e) {
          alert("Lỗi khi thêm option");
      } finally {
          setAdding(false);
      }
  };

  // --- View Voters Logic ---
  const openVotersModal = (title: string, voterIds: string[]) => {
      setViewVotersModal({ show: true, title, voterIds });
  };

  // Calculate Time Remaining for the first active poll
  const activePoll = polls.find(p => !isPollEnded(p) && p.status === 'OPEN');
  const deadlineDisplay = activePoll?.deadline 
    ? new Date(activePoll.deadline).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
    : '∞';
  
  const formatDate = (dateString: string) => {
      if(!dateString) return { day: '?', month: '?', weekday: '?' };
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      // Get Vietnamese weekday
      const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
      return { day, month, weekday };
  }

  // Helper to get winners (for expired polls)
  const getWinners = (options: PollOption[]) => {
      if (!options || options.length === 0) return [];
      const maxVotes = Math.max(...options.map(o => o.votes.length));
      if (maxVotes === 0) return [];
      return options.filter(o => o.votes.length === maxVotes);
  }

  // Helper for deleted users
  const getVoterInfo = (uid: string) => {
      const u = userMap[uid];
      if (u) return u;
      return {
          id: uid,
          nickname: 'Người dùng đã xóa',
          avatar: `https://ui-avatars.com/api/?name=Deleted&background=000&color=fff`,
          email: '',
          name: '',
          role: 'MEMBER',
          quote: '',
          favoriteDrinks: []
      } as User;
  };

  // Helper to detect if string is a URL
  const isLink = (str?: string) => {
      if (!str) return false;
      return str.startsWith('http') || str.startsWith('www');
  }

  if (loading) return <div className="text-center py-20 text-secondary">Đang tìm quán...</div>;

  return (
    <div className="flex flex-col gap-8 pb-20">
      
      {/* --- REUSABLE RESULTS MODAL --- */}
      <PollResultModal 
          poll={viewResultPoll} 
          users={users} 
          onClose={() => setViewResultPoll(null)} 
      />

      {/* Hero */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
          <div className="flex flex-col gap-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider w-fit">
                  <span>🔥 Đang diễn ra</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-white">
                  Chốt kèo lẹ lẹ
              </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <div className="text-secondary text-sm font-medium uppercase">Deadline hôm nay</div>
              <div className="flex items-center gap-2 text-white font-mono text-2xl font-bold bg-surface px-4 py-2 rounded-lg border border-border">
                  <Clock className="text-primary" />
                  {deadlineDisplay}
              </div>
          </div>
      </section>

      {/* Empty State */}
      {polls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border">
              <div className="bg-surface p-6 rounded-full mb-6">
                  <Beer size={48} className="text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Chưa có kèo nào</h3>
              <p className="text-secondary mb-6 max-w-md text-center">Các dân chơi đang ngủ hết rồi à? Chưa thấy ai khởi xướng cuộc vui cả.</p>
              {user?.role === 'ADMIN' ? (
                  <Link to="/admin" className="bg-primary text-background font-bold px-6 py-3 rounded-full hover:bg-primary-hover transition-all">
                      Tạo kèo ngay
                  </Link>
              ) : (
                  <p className="text-sm text-secondary bg-surface px-4 py-2 rounded-lg">Liên hệ Admin để tạo kèo nhé!</p>
              )}
          </div>
      )}

      {/* Polls Loop */}
      {polls.map(poll => {
        const ended = isPollEnded(poll);
        const participant = poll.participants?.[user?.id || ''];
        const participationStatus = participant?.status;

        // --- Winning Logic Calculation ---
        const winningTimeOptions = getWinners(poll.timeOptions || []);
        const winningLocOptions = getWinners(poll.options);

        // Determine effective winners (Considering Admin finalization)
        let finalTimeText = '';
        let finalLocText = '';
        let finalLocUrl = '';
        let isWaitingAdmin = false;

        // Logic for TIME text
        if (poll.timeOptions && poll.timeOptions.length > 0) {
            if (poll.finalizedTimeId) {
                const ft = poll.timeOptions.find(t => t.id === poll.finalizedTimeId);
                if (ft) {
                    const d = formatDate(ft.text);
                    finalTimeText = `${d.weekday}, ${d.day}/${d.month}`;
                }
            } else if (winningTimeOptions.length > 0) {
                 if (winningTimeOptions.length === 1) {
                     const d = formatDate(winningTimeOptions[0].text);
                     finalTimeText = `${d.weekday}, ${d.day}/${d.month}`;
                     isWaitingAdmin = true; // Still waiting for official confirmation if expired
                 } else {
                     finalTimeText = winningTimeOptions.map(w => formatDate(w.text).day + '/' + formatDate(w.text).month).join(' hoặc ');
                     isWaitingAdmin = true;
                 }
            } else {
                finalTimeText = "Chưa có vote";
            }
        }

        // Logic for LOCATION text & URL
        if (poll.finalizedOptionId) {
            const fo = poll.options.find(o => o.id === poll.finalizedOptionId);
            if (fo) {
                finalLocText = fo.text;
                finalLocUrl = fo.description && (fo.description.startsWith('http') || fo.description.startsWith('www')) 
                    ? fo.description 
                    : `https://www.google.com/maps/search/${encodeURIComponent(fo.text + ' ' + (fo.description || ''))}`;
            }
        } else if (winningLocOptions.length > 0) {
             if (winningLocOptions.length === 1) {
                 finalLocText = winningLocOptions[0].text;
                 const fo = winningLocOptions[0];
                 finalLocUrl = fo.description && (fo.description.startsWith('http') || fo.description.startsWith('www')) 
                    ? fo.description 
                    : `https://www.google.com/maps/search/${encodeURIComponent(fo.text + ' ' + (fo.description || ''))}`;
                 isWaitingAdmin = true;
             } else {
                 finalLocText = winningLocOptions.map(w => w.text).join(' hoặc ');
                 isWaitingAdmin = true;
             }
        } else {
            finalLocText = "Chưa có vote";
        }

        // If admin finalized BOTH (or if only Loc exists and is finalized), remove waiting status
        if (poll.finalizedOptionId && (poll.timeOptions.length === 0 || poll.finalizedTimeId)) {
            isWaitingAdmin = false;
        }

        return (
            <section key={poll.id} className="space-y-6 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div>
                       <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-2xl font-bold text-white">{poll.title}</h3>
                           {poll.allowMultipleVotes && (
                               <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                                   <CheckSquare size={10} /> Chọn nhiều
                               </span>
                           )}
                           {ended && (
                               <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                                   <AlertCircle size={10} /> Đã chốt sổ
                               </span>
                           )}
                       </div>
                       <p className="text-secondary">{poll.description}</p>
                   </div>
                   
                   {poll.deadline > 0 && (
                        <div className="text-xs text-secondary bg-surface px-3 py-1 rounded border border-border">
                            {ended 
                                ? `Đã kết thúc lúc ${new Date(poll.deadline).toLocaleTimeString('vi-VN')} ${new Date(poll.deadline).toLocaleDateString('vi-VN')}`
                                : `Hết hạn: ${new Date(poll.deadline).toLocaleString('vi-VN')}`
                            }
                        </div>
                   )}
                </div>

                {/* --- Logic 1: Chưa chọn trạng thái tham gia & KHÔNG PHẢI ADMIN --- */}
                {!participationStatus && !ended && !isAdmin && (
                    <div className="bg-surface/50 border border-border p-6 rounded-2xl flex flex-col items-center justify-center gap-4 py-12">
                        <h4 className="text-xl font-bold text-white">Bạn có tham gia kèo này không?</h4>
                        <p className="text-secondary text-sm -mt-2">Xác nhận trước khi chọn quán nhé!</p>
                        
                        {showDeclineInputFor === poll.id ? (
                            <div className="flex flex-col gap-3 w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
                                <textarea 
                                    className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                    placeholder="Nhập lý do bận (không bắt buộc)..."
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowDeclineInputFor(null)}
                                        className="flex-1 py-2 rounded-lg font-bold border border-border text-secondary hover:text-white"
                                    >
                                        Quay lại
                                    </button>
                                    <button 
                                        onClick={() => handleParticipation(poll.id, 'DECLINE', declineReason)}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold"
                                    >
                                        Xác nhận nghỉ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => handleParticipation(poll.id, 'JOIN')}
                                    className="px-8 py-3 bg-primary text-background font-black rounded-xl hover:bg-primary-hover shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={20}/> Gét Gô (Tham gia)
                                </button>
                                <button 
                                    onClick={() => setShowDeclineInputFor(poll.id)}
                                    className="px-8 py-3 bg-surface border border-border text-secondary font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center gap-2"
                                >
                                    <XCircle size={20}/> Bận rồi
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* --- Logic 1.5: Admin Banner --- */}
                {isAdmin && !ended && (
                    <div className="bg-surface/30 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3">
                        <ShieldAlert size={24} className="text-blue-400" />
                        <div>
                            <h4 className="font-bold text-white text-sm">Chế độ Admin</h4>
                            <p className="text-xs text-secondary">Bạn đang xem trực tiếp kết quả. Admin không có quyền vote hoặc tham gia.</p>
                        </div>
                    </div>
                )}

                {/* --- Logic 2: Đã chọn KHÔNG tham gia --- */}
                {participationStatus === 'DECLINE' && (
                    <div className="bg-surface/30 border border-dashed border-border p-6 rounded-2xl flex flex-col items-center justify-center gap-2 py-8 opacity-70">
                        <XCircle size={40} className="text-secondary" />
                        <h4 className="text-lg font-bold text-white">Bạn đã báo bận kèo này</h4>
                        {participant?.reason && (
                            <p className="text-secondary italic">"Lý do: {participant.reason}"</p>
                        )}
                        {!ended && (
                            <button 
                                onClick={() => handleParticipation(poll.id, 'JOIN')}
                                className="text-primary text-sm font-bold hover:underline mt-2"
                            >
                                Đổi ý? Tham gia lại
                            </button>
                        )}
                    </div>
                )}

               {/* --- Logic 3: Đã chọn THAM GIA hoặc đã kết thúc HOẶC là ADMIN --- */}
               {(participationStatus === 'JOIN' || isAdmin || (ended && participationStatus !== 'DECLINE')) && (
                   <div className="space-y-8 animate-in fade-in">
                       {/* Cancel Join Button (Only for joined users when not ended, NOT for admin) */}
                       {participationStatus === 'JOIN' && !ended && !isAdmin && (
                           <div className="flex justify-center flex-col items-center gap-2">
                               {confirmDeclineId === poll.id ? (
                                   <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 bg-surface border border-red-500/50 p-2 rounded-full px-4">
                                       <span className="text-xs text-white font-bold">Huỷ kèo và xoá vote?</span>
                                       <button 
                                           onClick={() => handleParticipation(poll.id, 'DECLINE')}
                                           className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full font-bold transition-all"
                                       >
                                           Đúng
                                       </button>
                                       <button 
                                           onClick={() => setConfirmDeclineId(null)}
                                           className="text-xs bg-surface border border-border hover:bg-white/10 text-white px-3 py-1 rounded-full font-bold transition-all"
                                       >
                                           Không
                                       </button>
                                   </div>
                               ) : (
                                   <button 
                                       onClick={() => setConfirmDeclineId(poll.id)}
                                       className="text-xs text-secondary hover:text-red-400 flex items-center gap-1 border border-transparent hover:border-red-900/50 px-3 py-1 rounded-full transition-all"
                                   >
                                       <RefreshCcw size={12}/> Huỷ kèo / Bận đột xuất
                                   </button>
                               )}
                           </div>
                       )}

                       {/* --- PART A: TIME OPTIONS (DATE) --- */}
                       {(poll.timeOptions && poll.timeOptions.length > 0) && (
                           <div id={`time-section-${poll.id}`}>
                               <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                   <Calendar className="text-primary" size={20} /> Chốt ngày chiến
                               </h4>
                               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                   {poll.timeOptions.map(timeOpt => {
                                        const isVoted = timeOpt.votes.includes(user?.id || '');
                                        const voteCount = timeOpt.votes.length;
                                        const dateInfo = formatDate(timeOpt.text);
                                        
                                        // Visual highlight if ended and winner
                                        const isWinner = ended && (poll.finalizedTimeId === timeOpt.id || (!poll.finalizedTimeId && winningTimeOptions.some(w => w.id === timeOpt.id)));
                                        const isDimmed = ended && !isWinner;

                                        return (
                                            <div 
                                                key={timeOpt.id} 
                                                onClick={() => !ended && !isAdmin && handleVote(poll.id, timeOpt.id, 'timeOptions')}
                                                className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1 
                                                    ${isWinner ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-105 z-10' : ''}
                                                    ${isDimmed ? 'opacity-40 grayscale border-border' : ''}
                                                    ${!ended && isVoted ? 'bg-primary/20 border-primary' : ''}
                                                    ${!ended && !isVoted ? `bg-surface border-border ${isAdmin ? '' : 'hover:border-secondary cursor-pointer hover:border-primary'}` : ''}
                                                    ${!ended && !isAdmin ? 'cursor-pointer' : ''}
                                                `}
                                            >
                                                {/* Winner Badge */}
                                                {isWinner && (
                                                    <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                        {poll.finalizedTimeId === timeOpt.id ? <CheckCircle size={10} className="inline mr-1"/> : <Star size={10} className="inline mr-1"/>}
                                                        {poll.finalizedTimeId === timeOpt.id ? 'CHỐT' : 'TOP'}
                                                    </div>
                                                )}

                                                {/* Weekday Badge */}
                                                <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-1 ${isVoted && !ended ? 'bg-primary text-background' : 'bg-background text-secondary'}`}>
                                                    {dateInfo.weekday}
                                                </div>
                                                
                                                {/* Day Big */}
                                                <div className={`text-4xl font-black ${isVoted || isWinner ? 'text-white' : 'text-white'}`}>
                                                    {dateInfo.day}
                                                </div>
                                                
                                                {/* Month */}
                                                <div className="text-xs text-secondary font-bold uppercase">
                                                    Tháng {dateInfo.month}
                                                </div>

                                                <div className="mt-3 w-full border-t border-white/10 pt-2 flex flex-col items-center gap-2"
                                                    onClick={(e) => { e.stopPropagation(); openVotersModal(timeOpt.text, timeOpt.votes); }}
                                                >
                                                     <div className={`text-xs font-bold hover:underline cursor-pointer ${isWinner ? 'text-yellow-400' : ''}`}>{voteCount} phiếu</div>
                                                     {/* Mini avatars for time */}
                                                     <div className="flex justify-center -space-x-1 h-6 cursor-pointer">
                                                        {timeOpt.votes.slice(0, 3).map(uid => {
                                                            const voter = getVoterInfo(uid);
                                                            return (
                                                                <img 
                                                                    key={uid}
                                                                    src={voter.avatar} 
                                                                    className={`w-5 h-5 rounded-full border border-surface bg-background ${!userMap[uid] ? 'grayscale' : ''}`}
                                                                    title={voter.nickname}
                                                                />
                                                            )
                                                        })}
                                                        {voteCount > 3 && (
                                                            <div className="w-5 h-5 rounded-full bg-surface border border-border text-[8px] flex items-center justify-center hover:bg-white/10">
                                                                +{voteCount-3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                   })}

                                   {/* --- ADD TIME BUTTON --- */}
                                   {!ended && participationStatus === 'JOIN' && !isAdmin && (
                                       <button 
                                           onClick={() => openAddModal(poll.id, 'timeOptions')}
                                           className="relative overflow-hidden p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-secondary hover:text-primary transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer h-full min-h-[160px]"
                                       >
                                           <div className="w-10 h-10 rounded-full bg-surface border border-border group-hover:border-primary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                               <Plus size={20} />
                                           </div>
                                           <span className="text-xs font-bold text-center">Đề xuất<br/>ngày khác</span>
                                       </button>
                                   )}
                               </div>
                           </div>
                       )}

                       {/* --- PART B: LOCATION OPTIONS --- */}
                       <div>
                           <div className="flex items-center gap-2 mb-4">
                               <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                   <MapPin className="text-primary" size={20} /> Địa điểm tập kết
                               </h4>
                               {warningMsg?.pollId === poll.id && (
                                   <div className="animate-pulse bg-red-500/20 text-red-300 text-xs px-3 py-1 rounded border border-red-500/50 font-bold flex items-center gap-1">
                                       <ArrowUp size={12}/> {warningMsg.msg}
                                   </div>
                               )}
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {poll.options.map(option => {
                                  const totalVotes = poll.options.reduce((acc, curr) => acc + curr.votes.length, 0);
                                  const percent = totalVotes === 0 ? 0 : Math.round((option.votes.length / totalVotes) * 100);
                                  const isVoted = option.votes.includes(user?.id || '');
                                  const isLeading = Math.max(...poll.options.map(o => o.votes.length)) === option.votes.length && option.votes.length > 0;
                                  
                                  // Visual highlight if ended and winner
                                  const isWinner = ended && (poll.finalizedOptionId === option.id || (!poll.finalizedOptionId && winningLocOptions.some(w => w.id === option.id)));
                                  const isDimmed = ended && !isWinner;

                                  return (
                                      <div key={option.id} className={`group relative flex flex-col bg-surface rounded-2xl overflow-hidden border-2 transition-transform 
                                          ${isWinner ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)] z-10' : ''}
                                          ${!isWinner && isLeading && !ended ? 'border-primary shadow-[0_0_20px_rgba(244,140,37,0.15)] hover:-translate-y-1' : 'border-border'} 
                                          ${isDimmed ? 'opacity-40 grayscale border-border' : ''}
                                      `}>
                                          {/* Labels */}
                                          {isWinner && (
                                              <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                  <Award size={14} /> {poll.finalizedOptionId === option.id ? 'CHỐT ĐƠN' : 'TOP VOTE'}
                                              </div>
                                          )}
                                          {!isWinner && isLeading && !ended && (
                                              <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-primary text-background text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                                                  <TrendingUp size={14} /> Dẫn đầu
                                              </div>
                                          )}

                                          <div className="h-40 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${option.image})` }}>
                                              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-90"></div>
                                          </div>
                                          
                                          <div className="p-5 flex flex-col flex-1 gap-3 -mt-12 relative z-10">
                                              <div>
                                                  <h4 className={`text-xl font-bold mb-1 transition-colors ${isWinner ? 'text-yellow-400' : (isLeading && !ended ? 'text-primary' : 'text-white')}`}>{option.text}</h4>
                                                  
                                                  {/* Address / Link - Updated for Visibility & Clickable Link */}
                                                  {option.description && (
                                                      <div className="flex items-start gap-2 mt-3">
                                                          <MapPin size={16} className="shrink-0 mt-0.5 text-secondary" />
                                                          {isLink(option.description) ? (
                                                              <a 
                                                                  href={option.description} 
                                                                  target="_blank" 
                                                                  rel="noopener noreferrer" 
                                                                  className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline break-all"
                                                                  onClick={(e) => e.stopPropagation()}
                                                              >
                                                                  {option.description}
                                                              </a>
                                                          ) : (
                                                              <span className="text-sm font-medium text-secondary break-words">{option.description}</span>
                                                          )}
                                                      </div>
                                                  )}

                                                  {/* Notes - Updated for Visibility */}
                                                  {option.notes && (
                                                      <div className="flex items-start gap-2 mt-2">
                                                          <StickyNote size={16} className="shrink-0 mt-0.5 text-secondary" />
                                                          <span className="text-sm text-secondary/90 italic break-words">{option.notes}</span>
                                                      </div>
                                                  )}
                                              </div>

                                              <div className="mt-auto pt-4 border-t border-border">
                                                  <div className="flex justify-between items-end mb-2 cursor-pointer" onClick={() => openVotersModal(option.text, option.votes)}>
                                                      <div className="flex -space-x-2">
                                                          {/* Display Voter Avatars */}
                                                          {option.votes.slice(0, 4).map((uid) => {
                                                              const voter = getVoterInfo(uid);
                                                              return (
                                                                  <div key={uid} className="relative group/avatar">
                                                                      <img 
                                                                          src={voter.avatar} 
                                                                          className={`w-8 h-8 rounded-full border-2 border-surface object-cover bg-background ${!userMap[uid] ? 'grayscale' : ''}`}
                                                                          title={voter.nickname} 
                                                                      />
                                                                  </div>
                                                              );
                                                          })}
                                                          {option.votes.length > 4 && (
                                                              <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-[10px] text-secondary font-bold hover:bg-white/10 hover:text-white transition-colors">
                                                                  +{option.votes.length - 4}
                                                              </div>
                                                          )}
                                                          {option.votes.length === 0 && <span className="text-xs text-secondary">Chưa có ai</span>}
                                                      </div>
                                                      <span className={`font-bold text-sm ${isWinner ? 'text-yellow-400' : 'text-primary'} hover:underline`}>{option.votes.length} phiếu</span>
                                                  </div>
                                                  
                                                  <div className="w-full bg-background rounded-full h-2 mb-4 overflow-hidden">
                                                      <div className={`${isWinner ? 'bg-yellow-400' : 'bg-primary'} h-2 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                                  </div>
                                                  
                                                  <button 
                                                      onClick={() => handleVote(poll.id, option.id, 'options')}
                                                      disabled={ended || participationStatus !== 'JOIN' || isAdmin}
                                                      className={`w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                                          isVoted 
                                                          ? 'bg-primary text-background hover:bg-primary-hover' 
                                                          : 'bg-background text-white border border-border hover:border-primary hover:text-primary'
                                                      } ${ended || isAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                                                  >
                                                      {isAdmin ? 'Admin View' : (isVoted ? <><ThumbsUp size={18} /> Đã chọn</> : (ended ? 'Đã hết giờ' : 'Vote ngay'))}
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}

                              {/* --- ADD LOCATION BUTTON --- */}
                              {!ended && participationStatus === 'JOIN' && !isAdmin && (
                                  <button 
                                    onClick={() => openAddModal(poll.id, 'options')}
                                    className="group relative flex flex-col items-center justify-center bg-surface/30 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-secondary hover:text-primary transition-all p-8 min-h-[300px]"
                                  >
                                      <div className="w-16 h-16 rounded-full bg-surface border-2 border-border group-hover:border-primary group-hover:bg-primary/10 flex items-center justify-center transition-colors mb-4">
                                          <Plus size={32} />
                                      </div>
                                      <h4 className="text-lg font-bold">Đề xuất quán mới</h4>
                                      <p className="text-sm opacity-60 mt-1">Biết quán nào ngon? Thêm vào đây!</p>
                                  </button>
                              )}
                           </div>
                       </div>
                   </div>
               )}

               {/* --- Final Conclusion Card --- */}
               {ended && (
                   <div className="mt-8 animate-in zoom-in duration-500">
                       <div className={`rounded-2xl p-6 md:p-8 border-2 shadow-2xl relative overflow-hidden ${isWaitingAdmin ? 'bg-surface border-dashed border-orange-500/50' : 'bg-gradient-to-br from-[#3e2c1c] via-surface to-[#1a120b] border-yellow-500/80'}`}>
                           
                           {/* Decorative BG */}
                           {!isWaitingAdmin && <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none"></div>}

                           <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left relative z-10">
                               <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0 border-4 border-surface shadow-xl ${isWaitingAdmin ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'bg-yellow-500 text-black'}`}>
                                   {isWaitingAdmin ? <Clock size={40}/> : <Trophy size={40} className="animate-bounce"/>}
                               </div>
                               
                               <div className="flex-1 space-y-4">
                                   <div>
                                       <h3 className={`text-2xl md:text-3xl font-black uppercase mb-2 leading-none ${isWaitingAdmin ? 'text-orange-500' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200'}`}>
                                           {isWaitingAdmin ? 'ĐANG CHỜ ADMIN CHỐT KÈO' : 'CHỐT ĐƠN! LÊN ĐỒ ĐI NHẬU'}
                                       </h3>
                                       {!isWaitingAdmin && <p className="text-secondary text-sm">Kết quả chính thức đã được ban hành!</p>}
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="flex flex-col items-center md:items-start">
                                            <span className="text-secondary text-xs font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Thời gian</span>
                                            <span className="font-black text-xl md:text-2xl text-white">{finalTimeText}</span>
                                        </div>
                                        <div className="flex flex-col items-center md:items-start border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
                                            <span className="text-secondary text-xs font-bold uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Địa điểm</span>
                                            <span className="font-black text-xl md:text-2xl text-white leading-tight">{finalLocText}</span>
                                            {finalLocUrl && (
                                               <a href={finalLocUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/10 text-white border border-white/20 px-2 py-1 rounded font-bold hover:bg-white hover:text-black transition-all">
                                                   Xem Bản Đồ <ExternalLink size={10}/>
                                               </a>
                                            )}
                                        </div>
                                   </div>

                                   {/* View Detailed Result Button */}
                                   <div className="flex justify-center md:justify-start">
                                       <button 
                                            onClick={() => setViewResultPoll(poll)}
                                            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 group"
                                       >
                                            <Users size={18} className="text-secondary group-hover:text-white transition-colors"/>
                                            Xem chi tiết kết quả (Ai đi / Ai bùng?)
                                       </button>
                                   </div>

                                   {isWaitingAdmin && (
                                       <p className="text-sm text-secondary/70 italic">
                                           * Đang chờ Admin xác nhận kết quả cuối cùng.
                                       </p>
                                   )}
                               </div>
                           </div>
                       </div>
                   </div>
               )}

            </section>
        );
      })}

      {/* ... MODALS ... */}
      {/* ... (Kept existing modal code) ... */}
      {/* --- ADD OPTION MODAL --- */}
      {addModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                  <button 
                      onClick={() => setAddModal({...addModal, show: false})}
                      className="absolute top-4 right-4 text-secondary hover:text-white"
                  >
                      <XCircle size={24} />
                  </button>
                  
                  <h3 className="text-xl font-bold text-white mb-1">
                      {addModal.type === 'options' ? 'Thêm Quán Mới' : 'Thêm Ngày Mới'}
                  </h3>
                  <p className="text-secondary text-sm mb-6">Đề xuất thêm lựa chọn cho anh em.</p>
                  
                  <div className="flex flex-col gap-4">
                      {addModal.type === 'options' ? (
                          <>
                              <label>
                                  <span className="text-xs font-bold text-white block mb-1">Tên quán</span>
                                  <input 
                                      value={newOptionText}
                                      onChange={(e) => setNewOptionText(e.target.value)}
                                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                                      placeholder="VD: Bia Hải Xồm"
                                      autoFocus
                                  />
                              </label>
                              <label>
                                  <span className="text-xs font-bold text-white block mb-1">Địa chỉ / Link Map (Tuỳ chọn)</span>
                                  <input 
                                      value={newOptionDesc}
                                      onChange={(e) => setNewOptionDesc(e.target.value)}
                                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                                      placeholder="VD: 123 Lê Duẩn hoặc https://map..."
                                  />
                              </label>
                              <label>
                                  <span className="text-xs font-bold text-white block mb-1">Ghi chú (Tuỳ chọn)</span>
                                  <input 
                                      value={newOptionNotes}
                                      onChange={(e) => setNewOptionNotes(e.target.value)}
                                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                                      placeholder="VD: Pass wifi: 12345678, gửi xe bên cạnh..."
                                  />
                              </label>
                          </>
                      ) : (
                          <label>
                              <span className="text-xs font-bold text-white block mb-1">Chọn ngày</span>
                              <input 
                                  type="date"
                                  value={newOptionText}
                                  onChange={(e) => setNewOptionText(e.target.value)}
                                  className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none cursor-pointer"
                              />
                          </label>
                      )}
                      
                      <button 
                          onClick={submitNewOption}
                          disabled={adding}
                          className="mt-2 w-full bg-primary hover:bg-primary-hover text-background font-bold py-3 rounded-xl transition-all"
                      >
                          {adding ? 'Đang thêm...' : 'Thêm ngay & Tự động Vote'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- VIEW VOTERS MODAL --- */}
      {viewVotersModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setViewVotersModal({...viewVotersModal, show: false})}>
              <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-lg font-bold text-white">Danh sách vote</h3>
                          <p className="text-sm text-primary font-bold">{viewVotersModal.title}</p>
                      </div>
                      <button 
                          onClick={() => setViewVotersModal({...viewVotersModal, show: false})}
                          className="text-secondary hover:text-white"
                      >
                          <XCircle size={24} />
                      </button>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                      {viewVotersModal.voterIds.length === 0 ? (
                          <p className="text-center text-secondary py-4">Chưa có ai vote</p>
                      ) : (
                          viewVotersModal.voterIds.map(uid => {
                              const voter = getVoterInfo(uid);
                              return (
                                  <div key={uid} className="flex items-center gap-3 bg-background/50 p-2 rounded-lg">
                                      <img 
                                          src={voter.avatar} 
                                          className="w-10 h-10 rounded-full border border-border object-cover" 
                                      />
                                      <div>
                                          <div className="text-sm font-bold text-white">{voter.nickname}</div>
                                          <div className="text-xs text-secondary">{voter.name}</div>
                                      </div>
                                  </div>
                              )
                          })
                      )}
                  </div>
                  
                  <div className="mt-4 text-center text-xs text-secondary border-t border-border pt-2">
                      Tổng cộng: {viewVotersModal.voterIds.length} người
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Vote;
// Helper for trophy icon
function Trophy({size, className}: {size: number, className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
import React, { useEffect, useState } from 'react';
import { DataService } from '@/core/services/mockService';
import { Poll, User, PollOption, UserRole } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { Clock, TrendingUp, ThumbsUp, Beer, MapPin, CheckSquare, AlertCircle, XCircle, CheckCircle, RefreshCcw, Calendar, ArrowUp, Star, Award, ExternalLink, Plus, Users, User as UserIcon, StickyNote, ShieldAlert, Car, CarFront } from 'lucide-react';
import { Link } from 'react-router';
import { PollResultModal } from '@/components/PollResultModal';

const CountdownBadge: React.FC<{ deadline: number; ended: boolean }> = ({ deadline, ended }) => {
  const [timeLeft, setTimeLeft] = useState(deadline - Date.now());

  useEffect(() => {
    if (ended || timeLeft <= 0) return;
    const timer = setInterval(() => {
      const next = deadline - Date.now();
      setTimeLeft(next);
      if (next <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, ended, timeLeft]);

  const deadlineDate = new Date(deadline);
  const deadlineText = `${deadlineDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${deadlineDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;

  if (ended || timeLeft <= 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="text-[10px] text-secondary font-medium opacity-60 pr-1">
          Đã đóng lúc {deadlineText}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/50 border border-border text-secondary text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
          <Clock size={12} className="opacity-50" />
          <span>Đã đóng sổ</span>
        </div>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const timeframe = hours > 0 ? `${hours}h ${minutes}m` : (minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
  const isUrgent = timeLeft < 3600000; // < 1 hour
  const isVeryUrgent = timeLeft < 600000; // < 10 mins

  return (
    <div className="flex flex-col items-end gap-1.5 group">
      <div className="text-[16px] text-secondary font-medium tracking-wide flex items-center gap-1 opacity-70 group-hover:opacity-100 cursor-pointer transition-opacity pr-1">
        Hết hạn: <span className="text-white font-bold">{deadlineText}</span>
      </div>
      <div className={`cursor-pointer flex items-center gap-3 px-4 py-2 rounded-2xl border-2 shadow-lg transition-all duration-300 backdrop-blur-md
                ${isUrgent
          ? 'bg-red-500/10 border-red-500/40 text-red-500 ring-4 ring-red-500/5'
          : 'bg-primary/10 border-primary/30 text-primary ring-4 ring-primary/5'}`}>
        <div className="relative">
          <Clock size={18} className={`${isVeryUrgent ? 'animate-bounce' : (isUrgent ? 'animate-pulse' : '')}`} />
          {isUrgent && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>}
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-mono text-xl font-black tracking-tighter tabular-nums flex items-baseline gap-0.5">
            {hours > 0 && <span>{hours}<small className="text-[10px] font-bold mx-px">h</small></span>}
            <span>{minutes.toString().padStart(2, '0')}<small className="text-[10px] font-bold mx-px">m</small></span>
            <span className={isUrgent ? 'text-red-400' : 'text-primary/60'}>{seconds.toString().padStart(2, '0')}<small className="text-[10px] font-bold ml-px">s</small></span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className={`w-1 h-1 rounded-full ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}></div>
        <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${isUrgent ? 'text-red-500' : 'text-secondary'}`}>
          {isUrgent ? 'GẤP GẤP GẤP' : 'CÒN LẠI'}
        </span>
      </div>
    </div>
  );
};


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
  const [warningMsg, setWarningMsg] = useState<{ pollId: string, msg: string } | null>(null);

  // Add Option State
  const [addModal, setAddModal] = useState<{ show: boolean, pollId: string, type: 'options' | 'timeOptions' }>({ show: false, pollId: '', type: 'options' });
  const [newOptionText, setNewOptionText] = useState('');
  const [newOptionDesc, setNewOptionDesc] = useState('');
  const [newOptionNotes, setNewOptionNotes] = useState(''); // New field for notes
  const [newOptionImage, setNewOptionImage] = useState(''); // New field for image
  const [adding, setAdding] = useState(false);

  // View Voters Modal State
  const [viewVotersModal, setViewVotersModal] = useState<{ show: boolean, title: string, voterIds: string[] }>({ show: false, title: '', voterIds: [] });

  // Party Status Modal State
  const [statusModal, setStatusModal] = useState<{ show: boolean, pollId: string }>({ show: false, pollId: '' });

  // Vote loading state: stores the optionId currently being voted on
  const [votingId, setVotingId] = useState<string | null>(null);

  // Drink toggle loading state
  const [togglingDrink, setTogglingDrink] = useState(false);

  // Taxi toggle loading state
  const [togglingTaxi, setTogglingTaxi] = useState(false);

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
    if (!user) return;
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
    if (!user) return;
    if (isAdmin) return alert("Admin chi duoc xem, khong tham gia vote!");
    if (votingId) return; // Prevent spam while another vote is in progress

    // Check constraint: Must vote time before location
    const poll = polls.find(p => p.id === pollId);
    if (poll && target === 'options' && poll.timeOptions && poll.timeOptions.length > 0) {
      const hasVotedTime = poll.timeOptions.some(t => t.votes.includes(user.id));
      if (!hasVotedTime) {
        setWarningMsg({ pollId, msg: '⚠️ Vui lòng chọn ngày trước khi chọn quán!' });
        setTimeout(() => setWarningMsg(null), 3000);
        return;
      }
    }

    setVotingId(optionId);
    try {
      await DataService.vote(pollId, optionId, user.id, target);
      // Refresh polls after vote
      const updatedPolls = await DataService.getPolls();
      setPolls(updatedPolls.filter(p => !p.isHidden));
    } catch (error: any) {
      alert(error.message || 'Loi khi vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleTaxiVote = async (pollId: string) => {
    if (!user) return;
    if (togglingTaxi) return;
    const poll = polls.find(p => p.id === pollId);
    if (poll && isPollEnded(poll)) return;

    setTogglingTaxi(true);
    try {
      await DataService.toggleTaxiVote(pollId, user.id);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Loi khi dang ky taxi");
    } finally {
      setTogglingTaxi(false);
    }
  };

  const handleNoDrinkVote = async (pollId: string) => {
    if (!user) return;
    if (togglingDrink) return;
    const poll = polls.find(p => p.id === pollId);
    if (poll && isPollEnded(poll)) return;

    setTogglingDrink(true);
    try {
      await DataService.toggleNonDrinker(pollId, user.id);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Loi thao tac");
    } finally {
      setTogglingDrink(false);
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
    setNewOptionImage('');
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
        notes: newOptionNotes,
        image: newOptionImage
      }, user.id);

      setAddModal({ ...addModal, show: false });
      fetchData();
    } catch (e: any) {
      console.error("Submit option error:", e);
      alert("Lỗi khi thêm: " + (e.message || "Vui lòng thử lại"));
    } finally {
      setAdding(false);
    }
  };

  // --- View Voters Logic ---
  const openVotersModal = (title: string, voterIds: string[]) => {
    setViewVotersModal({ show: true, title, voterIds });
  };

  // --- Toggle Check-In Logic (for Admin in Modal) ---
  const handleToggleCheckIn = async (pollId: string, userId: string) => {
    if (!isAdmin) return;
    try {
      await DataService.toggleAttendance(pollId, userId);
      await fetchData();
      // Refresh the modal poll data
      const updatedPolls = await DataService.getPolls();
      const updatedPoll = updatedPolls.find(p => p.id === pollId);
      if (updatedPoll) {
        setViewResultPoll(updatedPoll);
      }
    } catch (e: any) {
      console.error(e);
      alert('Lỗi khi thay đổi trạng thái check-in: ' + (e.message || ''));
    }
  };

  // Calculate Time Remaining for the first active poll
  const activePoll = polls.find(p => !isPollEnded(p) && p.status === 'OPEN');
  const deadlineDisplay = activePoll?.deadline
    ? new Date(activePoll.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '∞';

  const formatDate = (dateString: string) => {
    if (!dateString) return { day: '?', month: '?', weekday: '?' };
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-700">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
        <Beer size={80} className="text-primary animate-bounce relative z-10" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Đang tìm quán...</h3>
      <p className="text-secondary animate-pulse text-sm font-medium">Chờ chút, sắp có bia rồi! 🍻</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 pb-20">

      {/* --- REUSABLE RESULTS MODAL --- */}
      <PollResultModal
        poll={viewResultPoll}
        users={users}
        onClose={() => setViewResultPoll(null)}
        isAdmin={isAdmin}
        onToggleCheckIn={handleToggleCheckIn}
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
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 md:pr-40">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">{poll.title}</h3>
                  <div className="flex items-center gap-2">
                    {poll.allowMultipleVotes && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1 font-bold whitespace-nowrap">
                        <CheckSquare size={10} /> CHỌN NHIỀU
                      </span>
                    )}
                    {ended && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1 font-bold whitespace-nowrap">
                        <AlertCircle size={10} /> ĐÃ CHỐT SỔ
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-secondary text-sm md:text-base whitespace-pre-wrap leading-relaxed max-w-3xl">
                  {poll.description}
                </p>
              </div>

              {poll.deadline > 0 && (
                <div className="shrink-0 md:pt-1">
                  <CountdownBadge deadline={poll.deadline} ended={ended} />
                </div>
              )}
            </div>

            {/* --- Status Button: visible to all logged-in users --- */}
            {user && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={() => setStatusModal({ show: true, pollId: poll.id })}
                  className="btn-party-status flex items-center gap-2 px-8 py-3 font-bold text-base cursor-pointer z-10"
                >
                  <span className="border-top"></span>
                  <span className="border-right"></span>
                  <span className="border-bottom"></span>
                  <span className="border-left"></span>
                  <Users size={15} className="relative z-10" /> <span className="relative z-10">Xem tình hình đi nhậu</span>
                </button>
              </div>
            )}

            {/* --- Logic 1: Chưa chọn trạng thái tham gia & KHÔNG PHẢI ADMIN --- */}
            {!participationStatus && !ended && !isAdmin && (
              <div className="bg-surface/50 border border-border p-6 rounded-2xl flex flex-col items-center justify-center gap-4 py-12">
                <h4 className="text-xl font-bold text-white">Bạn sẽ quẩy cùng chúng tui chứ?</h4>
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
                        className="flex-1 py-2 rounded-lg font-bold border border-border text-secondary hover:text-white cursor-pointer"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={() => handleParticipation(poll.id, 'DECLINE', declineReason)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold cursor-pointer"
                      >
                        Xác nhận nghỉ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleParticipation(poll.id, 'JOIN')}
                      className="px-8 py-3 bg-primary text-background font-black rounded-xl hover:bg-primary-hover shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle size={20} /> Gét Gô (Tham gia)
                    </button>
                    <button
                      onClick={() => setShowDeclineInputFor(poll.id)}
                      className="px-8 py-3 bg-surface border border-border text-secondary font-bold rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle size={20} /> Bận rồi
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
                    className="text-primary text-sm font-bold hover:underline mt-2 cursor-pointer"
                  >
                    Đổi ý? Tham gia lại
                  </button>
                )}
              </div>
            )}

            {/* --- Logic 3: Đã chọn THAM GIA hoặc đã kết thúc HOẶC là ADMIN --- */}
            {(participationStatus === 'JOIN' || isAdmin || (ended && participationStatus !== 'DECLINE')) && (
              <div className="space-y-8 animate-in fade-in">
                {/* Cancel Join Button + Status Button Row */}
                {participationStatus === 'JOIN' && !ended && !isAdmin && (
                  <div className="flex justify-center flex-col items-center gap-2">
                    {confirmDeclineId === poll.id ? (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 bg-surface border border-red-500/50 p-2 rounded-full px-4">
                        <span className="text-xs text-white font-bold">Huỷ kèo và xoá vote?</span>
                        <button
                          onClick={() => handleParticipation(poll.id, 'DECLINE')}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full font-bold transition-all cursor-pointer"
                        >
                          Đúng
                        </button>
                        <button
                          onClick={() => setConfirmDeclineId(null)}
                          className="text-xs bg-surface border border-border hover:bg-white/10 text-white px-3 py-1 rounded-full font-bold transition-all cursor-pointer"
                        >
                          Không
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeclineId(poll.id)}
                        className="text-xs text-secondary hover:text-red-400 flex items-center gap-1 border border-transparent hover:border-red-900/50 px-3 py-1 rounded-full transition-all cursor-pointer"
                      >
                        <RefreshCcw size={12} /> Huỷ kèo / Bận đột xuất
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
                      {poll.timeOptions.slice().sort((a, b) => b.votes.length - a.votes.length || a.text.localeCompare(b.text)).map(timeOpt => {
                        const isVoted = timeOpt.votes.includes(user?.id || '');
                        const voteCount = timeOpt.votes.length;
                        const dateInfo = formatDate(timeOpt.text);

                        // Visual highlight if ended and winner
                        const isWinner = ended && (poll.finalizedTimeId === timeOpt.id || (!poll.finalizedTimeId && winningTimeOptions.some(w => w.id === timeOpt.id)));
                        const isDimmed = ended && !isWinner;

                        const isVotingThis = votingId === timeOpt.id;
                        const isAnyVoting = !!votingId;
                        return (
                          <div
                            key={timeOpt.id}
                            onClick={() => !ended && !isAdmin && !isAnyVoting && handleVote(poll.id, timeOpt.id, 'timeOptions')}
                            className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1 
                                                    ${isWinner ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-105 z-10' : ''}
                                                    ${isDimmed ? 'opacity-40 grayscale border-border' : ''}
                                                    ${!ended && isVoted ? 'bg-primary/20 border-primary' : ''}
                                                    ${!ended && !isVoted ? `bg-surface border-border ${isAdmin || isAnyVoting ? '' : 'hover:border-secondary cursor-pointer hover:border-primary'}` : ''}
                                                    ${!ended && !isAdmin && !isAnyVoting ? 'cursor-pointer' : (isAnyVoting ? 'cursor-wait' : '')}
                                                `}
                          >
                            {/* Loading overlay for time option */}
                            {isVotingThis && (
                              <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-20 rounded-xl">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                              </div>
                            )}

                            {/* Winner Badge */}
                            {isWinner && (
                              <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                {poll.finalizedTimeId === timeOpt.id ? <CheckCircle size={10} className="inline mr-1" /> : <Star size={10} className="inline mr-1" />}
                                {poll.finalizedTimeId === timeOpt.id ? 'CHOT' : 'TOP'}
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

                            {/* Contributor */}
                            {timeOpt.createdBy && userMap[timeOpt.createdBy] && (
                              <div className="mt-1 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded-sm italic">
                                  {userMap[timeOpt.createdBy].name} đề xuất
                                </span>
                              </div>
                            )}

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
                                    +{voteCount - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* --- ADD TIME BUTTON --- */}
                      {!ended && participationStatus === 'JOIN' && !isAdmin && (poll.allowMemberAddTimes !== false) && (
                        <button
                          onClick={() => openAddModal(poll.id, 'timeOptions')}
                          className="relative overflow-hidden p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-secondary hover:text-primary transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer h-full min-h-[160px]"
                        >
                          <div className="w-10 h-10 rounded-full bg-surface border border-border group-hover:border-primary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Plus size={20} />
                          </div>
                          <span className="text-xs font-bold text-center">Đề xuất<br />ngày khác</span>
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
                        <ArrowUp size={12} /> {warningMsg.msg}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {poll.options.slice().sort((a, b) => b.votes.length - a.votes.length || a.text.localeCompare(b.text)).map(option => {
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
                              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                                <h4 className={`text-xl font-bold transition-colors ${isWinner ? 'text-yellow-400' : (isLeading && !ended ? 'text-primary' : 'text-white')}`}>{option.text}</h4>
                                {option.createdBy && userMap[option.createdBy] && (
                                  <span className="text-[11px] text-secondary bg-white/5 px-2 py-0.5 rounded italic opacity-60 group-hover:opacity-100 transition-opacity">
                                    {userMap[option.createdBy].name} đề xuất
                                  </span>
                                )}
                              </div>

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
                                disabled={ended || participationStatus !== 'JOIN' || isAdmin || !!votingId}
                                className={`w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isVoted
                                  ? 'bg-primary text-background hover:bg-primary-hover'
                                  : 'bg-background text-white border border-border hover:border-primary hover:text-primary'
                                  } ${(ended || isAdmin) ? 'cursor-not-allowed opacity-50'
                                    : votingId === option.id ? 'cursor-wait'
                                      : 'cursor-pointer'
                                  }`}
                              >
                                {votingId === option.id ? (
                                  <span className="flex items-center gap-2">
                                    <span className="flex gap-1">
                                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                    Đang vote...
                                  </span>
                                ) : isAdmin ? 'Admin View' : (isVoted ? <><ThumbsUp size={18} /> Đã chọn</> : (ended ? 'Đã hết giờ' : 'Dứt thôi'))}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* --- ADD LOCATION BUTTON --- */}
                    {!ended && participationStatus === 'JOIN' && !isAdmin && (poll.allowMemberAddPlaces !== false) && (
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

                {/* --- NEW PART: DRINKING STATUS --- */}
                {participationStatus === 'JOIN' && (
                  <div className="bg-surface/50 border border-border p-6 rounded-2xl animate-in slide-in-from-bottom-4 mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                          <Beer className={`${participant?.isNonDrinker ? 'text-secondary opacity-50' : 'text-primary'}`} size={24} /> Trạng thái nhậu 🍻
                        </h4>
                        <p className="text-sm text-secondary mt-1">
                          {participant?.isNonDrinker
                            ? "Bạn đã chọn KHÔNG UỐNG. Hệ thống sẽ chỉ chia tiền mồi (đồ ăn)."
                            : "Uống tới bến! Bạn sẽ cùng chia tiền bia với anh em."}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-background/50 p-2 pr-4 rounded-full border border-border">
                        <button
                          onClick={() => handleNoDrinkVote(poll.id)}
                          disabled={isAdmin || ended || togglingDrink}
                          className={`relative flex items-center w-14 h-8 rounded-full transition-all p-1 ${participant?.isNonDrinker ? 'bg-secondary' : 'bg-primary'} ${isAdmin || ended ? 'cursor-not-allowed' : (togglingDrink ? 'cursor-wait opacity-70' : 'cursor-pointer')}`}
                        >
                          {togglingDrink ? (
                            <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          ) : (
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all ${participant?.isNonDrinker ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          )}
                        </button>
                        <span className={`font-bold text-sm min-w-[7rem] text-center ${togglingDrink ? 'text-secondary animate-pulse' : (participant?.isNonDrinker ? 'text-secondary' : 'text-primary')}`}>
                          {togglingDrink ? 'Đang đổi ý...' : (participant?.isNonDrinker ? 'KHÔNG UỐNG' : 'CÓ UỐNG')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- PART C: TAXI REGISTRATION (NEW) --- */}
                {poll.enableTaxi && (
                  <div className="bg-surface/50 border border-border p-6 rounded-2xl animate-in slide-in-from-bottom-4 mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                          <Car className="text-primary" size={24} /> Đăng ký đi Taxi 🚕
                        </h4>
                        <p className="text-sm text-secondary mt-1">An toàn là trên hết! Đăng ký đi taxi để anh em sắp xếp.</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={() => openVotersModal("Danh sách đi Taxi 🚕", poll.taxiVoters || [])}>
                        <div className="flex -space-x-1">
                          {(poll.taxiVoters || []).slice(0, 3).map(uid => (
                            <img key={uid} src={getVoterInfo(uid).avatar} className="w-6 h-6 rounded-full border border-surface bg-background" />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-primary hover:underline cursor-pointer">
                          {(poll.taxiVoters || []).length} người đăng ký
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-background/40 p-4 rounded-xl border border-border/50">
                        <p className="text-xs text-secondary mb-3">Điều kiện: Phải hoàn thành bình chọn Thời gian (nếu có).</p>
                        <button
                          onClick={() => handleTaxiVote(poll.id)}
                          disabled={isAdmin || ended || togglingTaxi}
                          className={`w-full py-4 rounded-xl font-black transition-all flex items-center justify-center gap-3 ${(poll.taxiVoters || []).includes(user?.id || '')
                            ? 'bg-primary text-background hover:bg-primary-hover shadow-[0_0_20px_rgba(244,140,37,0.3)]'
                            : 'bg-surface border border-border text-white hover:border-primary hover:text-primary'
                            } ${isAdmin || ended ? 'opacity-50 cursor-not-allowed' : (togglingTaxi ? 'cursor-wait opacity-70' : 'cursor-pointer')}`}
                        >
                          {togglingTaxi ? (
                            <span className="flex items-center gap-2">
                              <span className="flex gap-1">
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </span>
                              Dang xu ly...
                            </span>
                          ) : (
                            (poll.taxiVoters || []).includes(user?.id || '') ? (
                              <><CarFront size={20} /> {ended ? 'DA DANG KY TAXI' : 'DA DANG KY TAXI (BAM DE HUY)'}</>
                            ) : (
                              <><CarFront size={20} /> {ended ? 'KHONG DANG KY' : 'TOI SE DI TAXI'}</>
                            )
                          )}
                        </button>
                      </div>

                      <div className="p-4 flex items-center justify-center border border-dashed border-border rounded-xl opacity-60">
                        <div className="text-center">
                          <p className="text-xs text-secondary">"Bảo vệ bản thân, bảo vệ túi tiền...<br />vì bùng kèo taxi cũng bị phạt (đùa đấy)"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                      {isWaitingAdmin ? <Clock size={40} /> : <Trophy size={40} className="animate-bounce" />}
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
                          <span className="text-secondary text-xs font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12} /> Thời gian</span>
                          <span className="font-black text-xl md:text-2xl text-white">{finalTimeText}</span>
                        </div>
                        <div className="flex flex-col items-center md:items-start border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4">
                          <span className="text-secondary text-xs font-bold uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> Địa điểm</span>
                          <span className="font-black text-xl md:text-2xl text-white leading-tight">{finalLocText}</span>
                          {finalLocUrl && (
                            <a href={finalLocUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/10 text-white border border-white/20 px-2 py-1 rounded font-bold hover:bg-white hover:text-black transition-all">
                              Xem Bản Đồ <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* View Detailed Result Button */}
                      <div className="flex justify-center md:justify-start">
                        <button
                          onClick={() => setViewResultPoll(poll)}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 group cursor-pointer"
                        >
                          <Users size={18} className="text-secondary group-hover:text-white transition-colors" />
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
              onClick={() => setAddModal({ ...addModal, show: false })}
              className="absolute top-4 right-4 text-secondary hover:text-white cursor-pointer"
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
                  <label>
                    <span className="text-xs font-bold text-white block mb-1">Link hình ảnh quán (Tuỳ chọn)</span>
                    <input
                      value={newOptionImage}
                      onChange={(e) => setNewOptionImage(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                      placeholder="Dán link ảnh tại đây..."
                    />
                    {newOptionImage && (
                      <div className="mt-2 rounded-lg overflow-hidden h-20 border border-border bg-surface">
                        <img src={newOptionImage} className="w-full h-full object-cover" alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
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
                className="mt-2 w-full bg-primary hover:bg-primary-hover text-background font-bold py-3 rounded-xl transition-all cursor-pointer"
              >
                {adding ? 'Đang thêm...' : 'Thêm ngay & Tự động Vote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW VOTERS MODAL (Simple) --- */}
      {viewVotersModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setViewVotersModal({ ...viewVotersModal, show: false })}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Danh sách vote</h3>
                <p className="text-sm text-primary font-bold">{viewVotersModal.title}</p>
              </div>
              <button onClick={() => setViewVotersModal({ ...viewVotersModal, show: false })} className="text-secondary hover:text-white cursor-pointer">
                <XCircle size={24} />
              </button>
            </div>
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2">
              {viewVotersModal.voterIds.length === 0 ? (
                <p className="text-center text-secondary py-4">Chưa có ai vote</p>
              ) : (
                viewVotersModal.voterIds.map(uid => {
                  const voter = getVoterInfo(uid);
                  return (
                    <div key={uid} className="flex items-center gap-3 bg-background/50 p-2 rounded-lg">
                      <img src={voter.avatar} className="w-10 h-10 rounded-full border border-border object-cover" />
                      <div>
                        <div className="text-sm font-bold text-white">{voter.nickname}</div>
                        <div className="text-xs text-secondary">{voter.name}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 text-center text-xs text-secondary border-t border-border pt-2">
              Tổng cộng: {viewVotersModal.voterIds.length} người
            </div>
          </div>
        </div>
      )}

      {/* --- PARTY STATUS MODAL --- */}
      {statusModal.show && (() => {
        const currentPoll = polls.find(p => p.id === statusModal.pollId);
        if (!currentPoll) return null;
        const participants = currentPoll.participants || {};

        // All member IDs who have responded (JOIN or DECLINE)
        const joinedIds = Object.entries(participants)
          .filter(([, p]) => p.status === 'JOIN')
          .map(([uid]) => uid);

        const declinedIds = Object.entries(participants)
          .filter(([, p]) => p.status === 'DECLINE')
          .map(([uid]) => uid);

        // For each joined member: find which venue(s) they voted for
        const getVotedVenues = (uid: string) =>
          currentPoll.options.filter(o => o.votes.includes(uid)).map(o => o.text);

        const getVotedTime = (uid: string) =>
          (currentPoll.timeOptions || []).filter(t => t.votes.includes(uid)).map(t => t.text);

        const renderJoinedRow = (uid: string) => {
          const voter = getVoterInfo(uid);
          const pData = participants[uid];
          const isNonDrinker = pData?.isNonDrinker;
          const votedVenues = getVotedVenues(uid);
          const hasVotedVenue = votedVenues.length > 0;
          const hasVotedTime = getVotedTime(uid).length > 0 || (currentPoll.timeOptions || []).length === 0;
          const fullyVoted = hasVotedVenue && hasVotedTime;

          return (
            <div key={uid} className="flex items-start gap-3 bg-background/50 p-3 rounded-xl">
              <img src={voter.avatar} className="w-9 h-9 rounded-full border border-border object-cover shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{voter.nickname}</span>
                  {voter.name && voter.name !== voter.nickname && (
                    <span className="text-xs text-secondary">({voter.name})</span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isNonDrinker
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-primary/10 text-primary border-primary/30'
                    }`}>
                    {isNonDrinker ? '🥤 No beer' : '🍺 Có uống'}
                  </span>
                </div>
                {hasVotedVenue ? (
                  <div className="text-xs text-secondary mt-1">
                    <span className="text-green-400 font-bold">✓</span> {votedVenues.join(', ')}
                  </div>
                ) : (
                  <div className="text-xs text-yellow-500/80 mt-1 font-medium">Chưa chọn quán</div>
                )}
              </div>
              <div className="shrink-0">
                {fullyVoted ? (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={14} className="text-green-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock size={14} className="text-yellow-500" />
                  </div>
                )}
              </div>
            </div>
          );
        };

        // Sort: fully voted first, then those missing venue/time
        const sortedJoined = [...joinedIds].sort((a, b) => {
          const aFull = getVotedVenues(a).length > 0;
          const bFull = getVotedVenues(b).length > 0;
          if (aFull && !bFull) return -1;
          if (!aFull && bFull) return 1;
          return 0;
        });

        // Users who have NOT responded at all (not in participants)
        const respondedIds = new Set([...joinedIds, ...declinedIds]);
        const pendingIds = users
          .filter(u => u.role !== UserRole.ADMIN && !respondedIds.has(u.id))
          .map(u => u.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setStatusModal({ show: false, pollId: '' })}>
            <div className="bg-surface border border-border rounded-2xl w-full max-w-[460px] shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex justify-between items-start p-5 pb-4 border-b border-border shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    Tình hình đi nhậu
                  </h3>
                  <p className="text-xs text-secondary mt-0.5 truncate max-w-[280px]">{currentPoll.title}</p>
                </div>
                <button onClick={() => setStatusModal({ show: false, pollId: '' })} className="text-secondary hover:text-white cursor-pointer shrink-0 ml-2">
                  <XCircle size={22} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1 p-4 space-y-5">

                {/* Section 1: Joined members */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle size={10} className="text-green-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-green-400">Tham gia</span>
                    <span className="text-xs text-secondary bg-background px-2 py-0.5 rounded-full font-bold">{joinedIds.length}</span>
                  </div>
                  {joinedIds.length === 0 ? (
                    <p className="text-xs text-secondary italic pl-7">Chưa có ai xác nhận tham gia</p>
                  ) : (
                    <div className="space-y-2">{sortedJoined.map(uid => renderJoinedRow(uid))}</div>
                  )}
                </div>

                {/* Section 2: Not responded yet */}
                {pendingIds.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Clock size={10} className="text-secondary" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-secondary">Chưa phản hồi</span>
                      <span className="text-xs text-secondary bg-background px-2 py-0.5 rounded-full font-bold">{pendingIds.length}</span>
                    </div>
                    <div className="space-y-2">
                      {pendingIds.map(uid => {
                        const voter = getVoterInfo(uid);
                        return (
                          <div key={uid} className="flex items-center gap-3 bg-background/30 p-2.5 rounded-xl border border-border/30 opacity-70">
                            <img src={voter.avatar} className="w-9 h-9 rounded-full border border-border object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{voter.nickname}</div>
                              <div className="text-xs text-secondary">Chưa xác nhận</div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-secondary/10 text-secondary border-secondary/30 shrink-0">?</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Declined */}
                {declinedIds.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle size={10} className="text-red-400" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-red-400">Không tham gia</span>
                      <span className="text-xs text-secondary bg-background px-2 py-0.5 rounded-full font-bold">{declinedIds.length}</span>
                    </div>
                    <div className="space-y-2">
                      {declinedIds.map(uid => {
                        const voter = getVoterInfo(uid);
                        const p = participants[uid];
                        return (
                          <div key={uid} className="flex items-center gap-3 bg-background/50 p-2.5 rounded-xl opacity-60">
                            <img src={voter.avatar} className="w-9 h-9 rounded-full border border-border object-cover shrink-0 grayscale" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{voter.nickname}</div>
                              {p?.reason && <div className="text-xs text-secondary truncate italic">"{p.reason}"</div>}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30 shrink-0">Bận</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 pt-3 border-t border-border shrink-0">
                <div className="flex justify-around text-center">
                  <div>
                    <div className="text-lg font-black text-green-400">{joinedIds.length}</div>
                    <div className="text-[10px] text-secondary uppercase tracking-wide">Tham gia</div>
                  </div>
                  <div className="w-px bg-border"></div>
                  <div>
                    <div className="text-lg font-black text-primary">{joinedIds.filter(uid => getVotedVenues(uid).length > 0).length}</div>
                    <div className="text-[10px] text-secondary uppercase tracking-wide">Đã chọn quán</div>
                  </div>
                  <div className="w-px bg-border"></div>
                  <div>
                    <div className="text-lg font-black text-secondary">{pendingIds.length}</div>
                    <div className="text-[10px] text-secondary uppercase tracking-wide">Chưa biết</div>
                  </div>
                  <div className="w-px bg-border"></div>
                  <div>
                    <div className="text-lg font-black text-red-400">{declinedIds.length}</div>
                    <div className="text-[10px] text-secondary uppercase tracking-wide">Không đi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
};

export default Vote;
// Helper for trophy icon
function Trophy({ size, className }: { size: number, className?: string }) {
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
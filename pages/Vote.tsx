import React, { useEffect, useState } from 'react';
import { DataService } from '../services/mockService';
import { Poll, User, PollOption } from '../types';
import { useAuth } from '../App';
import { Clock, TrendingUp, ThumbsUp, Beer, MapPin, CheckSquare, AlertCircle, XCircle, CheckCircle, RefreshCcw, Calendar, ArrowUp, Star, Award, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Vote: React.FC = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  
  // Local state for reason input
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineInputFor, setShowDeclineInputFor] = useState<string | null>(null);
  
  // Local state for Cancel Confirmation
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);

  // Warning state
  const [warningMsg, setWarningMsg] = useState<{pollId: string, msg: string} | null>(null);

  const fetchData = async () => {
     try {
         const [pollsData, usersData] = await Promise.all([
             DataService.getPolls(),
             DataService.getUsers()
         ]);
         
         const map: Record<string, User> = {};
         usersData.forEach(u => map[u.id] = u);
         
         setUserMap(map);
         setPolls(pollsData);
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
        setPolls(updatedPolls);
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

  if (loading) return <div className="text-center py-20 text-secondary">Đang tìm quán...</div>;

  return (
    <div className="flex flex-col gap-8 pb-20">
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

                {/* --- Logic 1: Chưa chọn trạng thái tham gia --- */}
                {!participationStatus && !ended && (
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

               {/* --- Logic 3: Đã chọn THAM GIA hoặc đã kết thúc --- */}
               {(participationStatus === 'JOIN' || (ended && participationStatus !== 'DECLINE')) && (
                   <div className="space-y-8 animate-in fade-in">
                       {/* Cancel Join Button (Only for joined users when not ended) */}
                       {participationStatus === 'JOIN' && !ended && (
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
                                                onClick={() => !ended && handleVote(poll.id, timeOpt.id, 'timeOptions')}
                                                className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-1 
                                                    ${isWinner ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-105 z-10' : ''}
                                                    ${isDimmed ? 'opacity-40 grayscale border-border' : ''}
                                                    ${!ended && isVoted ? 'bg-primary/20 border-primary' : ''}
                                                    ${!ended && !isVoted ? 'bg-surface border-border hover:border-secondary cursor-pointer' : ''}
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

                                                <div className="mt-3 w-full border-t border-white/10 pt-2 flex flex-col items-center gap-2">
                                                     <div className={`text-xs font-bold ${isWinner ? 'text-yellow-400' : ''}`}>{voteCount} phiếu</div>
                                                     {/* Mini avatars for time */}
                                                     <div className="flex justify-center -space-x-1 h-6">
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
                                                        {voteCount > 3 && <div className="w-5 h-5 rounded-full bg-surface border border-border text-[8px] flex items-center justify-center">+{voteCount-3}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                   })}
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
                                                  {option.description && (
                                                      <div className="text-xs text-secondary/80 flex items-start gap-1 mt-1">
                                                          <MapPin size={12} className="shrink-0 mt-0.5" />
                                                          <span className="line-clamp-2">{option.description}</span>
                                                      </div>
                                                  )}
                                              </div>

                                              <div className="mt-auto pt-4 border-t border-border">
                                                  <div className="flex justify-between items-end mb-2">
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
                                                              <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-[10px] text-secondary font-bold">
                                                                  +{option.votes.length - 4}
                                                              </div>
                                                          )}
                                                          {option.votes.length === 0 && <span className="text-xs text-secondary">Chưa có ai</span>}
                                                      </div>
                                                      <span className={`font-bold text-sm ${isWinner ? 'text-yellow-400' : 'text-primary'}`}>{option.votes.length} phiếu</span>
                                                  </div>
                                                  
                                                  <div className="w-full bg-background rounded-full h-2 mb-4 overflow-hidden">
                                                      <div className={`${isWinner ? 'bg-yellow-400' : 'bg-primary'} h-2 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                                  </div>
                                                  
                                                  <button 
                                                      onClick={() => handleVote(poll.id, option.id, 'options')}
                                                      disabled={ended || participationStatus !== 'JOIN'}
                                                      className={`w-full py-3 font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                                          isVoted 
                                                          ? 'bg-primary text-background hover:bg-primary-hover' 
                                                          : 'bg-background text-white border border-border hover:border-primary hover:text-primary'
                                                      } ${ended ? 'cursor-not-allowed opacity-50' : ''}`}
                                                  >
                                                      {isVoted ? <><ThumbsUp size={18} /> Đã chọn</> : (ended ? 'Đã hết giờ' : 'Vote ngay')}
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                           </div>
                       </div>
                   </div>
               )}

               {/* --- Final Conclusion Card --- */}
               {ended && (
                   <div className="mt-8 animate-in zoom-in duration-500">
                       <div className={`rounded-2xl p-6 border-2 flex flex-col md:flex-row items-center gap-6 text-center md:text-left shadow-2xl ${isWaitingAdmin ? 'bg-surface border-dashed border-orange-500/50' : 'bg-gradient-to-br from-yellow-900/50 to-surface border-yellow-500'}`}>
                           <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${isWaitingAdmin ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'bg-yellow-500 text-black'}`}>
                               {isWaitingAdmin ? <Clock size={32}/> : <Trophy size={32} className="animate-bounce"/>}
                           </div>
                           <div className="flex-1">
                               <h3 className={`text-xl font-black uppercase mb-2 ${isWaitingAdmin ? 'text-orange-500' : 'text-yellow-400'}`}>
                                   {isWaitingAdmin ? 'ĐANG CHỜ ADMIN CHỐT KÈO' : 'CHỐT ĐƠN! LÊN ĐỒ ĐI NHẬU'}
                               </h3>
                               <div className="space-y-1 text-lg">
                                   <div className="flex flex-col md:flex-row gap-1 md:gap-2 justify-center md:justify-start">
                                       <span className="text-secondary">Thời gian:</span>
                                       <span className="font-bold text-white">{finalTimeText}</span>
                                   </div>
                                   <div className="flex flex-col md:flex-row gap-1 md:gap-2 justify-center md:justify-start items-center md:items-start">
                                       <span className="text-secondary">Địa điểm:</span>
                                       <div className="flex flex-col md:flex-row items-center gap-2">
                                           <span className="font-bold text-white">{finalLocText}</span>
                                           {finalLocUrl && (
                                               <a href={finalLocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-white text-black px-2 py-0.5 rounded font-bold hover:bg-primary hover:text-white transition-colors">
                                                   <MapPin size={10} /> Xem Map <ExternalLink size={10}/>
                                               </a>
                                           )}
                                       </div>
                                   </div>
                               </div>
                               {isWaitingAdmin && (
                                   <p className="text-sm text-secondary/70 mt-3 italic bg-background/50 px-3 py-1 rounded inline-block">
                                       * Có nhiều option bằng phiếu hoặc chưa được Admin xác nhận cuối cùng.
                                   </p>
                               )}
                           </div>
                       </div>
                   </div>
               )}

            </section>
        );
      })}
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
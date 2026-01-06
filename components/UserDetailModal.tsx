import React from 'react';
import { User, Poll, UserRole } from '../types';
import { X, Calendar, CheckCircle, AlertTriangle, Trophy } from 'lucide-react';

interface UserDetailModalProps {
    user: User | null;
    onClose: () => void;
    allPolls: Poll[];
    currentUserRole?: UserRole; // To check permissions
    onToggleAttendance?: (pollId: string, userId: string) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ 
    user, 
    onClose, 
    allPolls, 
    currentUserRole,
    onToggleAttendance 
}) => {
    if (!user) return null;

    // Filter polls where the user has at least joined or voted
    const history = allPolls.map(poll => {
        const participant = poll.participants?.[user.id];
        const isJoined = participant?.status === 'JOIN';
        
        // Check if voted (Has selected at least 1 time AND 1 location)
        const hasVotedTime = (poll.timeOptions || []).some(opt => opt.votes.includes(user.id));
        const hasVotedLoc = poll.options.some(opt => opt.votes.includes(user.id));
        const isVotedFull = hasVotedTime && hasVotedLoc;
        
        // Admin Confirmed Attendance
        const isAttended = poll.confirmedAttendances?.includes(user.id) || false;

        return {
            poll,
            isJoined,
            isVotedFull,
            isAttended,
            status: participant?.status || 'N/A'
        };
    }).filter(item => item.isJoined || item.isAttended); // Only show relevant polls

    const totalAttended = allPolls.filter(p => p.confirmedAttendances?.includes(user.id)).length + (user.attendanceOffset || 0);
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-surface border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    
                    {/* --- MEMBERSHIP CARD SECTION --- */}
                    <div className="flex justify-center pt-8 pb-4 bg-background/30 border-b border-border">
                         <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border border-secondary/30 group bg-[#1a120b] shrink-0 transform transition-transform hover:scale-[1.02]"
                            style={{ height: '220px', width: '350px' }}
                         >
                            {/* Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#493622] via-[#231a10] to-[#1a120b]"></div>
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white,transparent)]"></div>
                            
                            <div className="relative z-10 flex flex-col h-full p-5 justify-between">
                                {/* Header Badges */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="text-secondary font-bold tracking-widest text-[10px] uppercase border border-secondary px-1.5 py-0.5 rounded">Official Member</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-primary to-orange-400 text-[#231a10] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                        Dân Chơi
                                    </div>
                                </div>

                                {/* Avatar & Info */}
                                <div className="flex gap-4 items-center">
                                    <img 
                                        src={user.avatar} 
                                        className="w-16 h-16 rounded-full border-2 border-secondary object-cover shrink-0" 
                                    />
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h2 className="text-white text-xl font-black mb-1 truncate leading-tight pb-1">
                                            {user.nickname}
                                        </h2>
                                        <div className="flex flex-col">
                                            <p className="text-secondary text-[10px] font-bold uppercase truncate">{user.name}</p>
                                            <p className="text-secondary/70 text-[9px] font-mono mt-0.5 truncate">{user.email}</p>
                                        </div>
                                        
                                        {(user.flakeCount || 0) > 0 && (
                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded w-fit border border-red-900/30">
                                                <AlertTriangle size={8} /> {user.flakeCount} lần bùng
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Content */}
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-white/90 text-[10px] italic line-clamp-1 mb-1">"{user.quote || 'Chưa có tuyên ngôn'}"</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-1 text-[9px] text-secondary uppercase font-bold max-w-[65%] line-clamp-1">
                                            {user.favoriteDrinks?.length ? user.favoriteDrinks.join(' • ') : 'Chưa chọn món tủ'}
                                        </div>
                                        <div className="text-[9px] text-white/50 font-mono">ID: {user.id.toUpperCase().slice(0, 6)}</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* --- HISTORY SECTION --- */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Calendar size={18} className="text-primary"/> Lịch sử chinh chiến
                            </h3>
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-bold border border-primary/20 flex items-center gap-1">
                                <Trophy size={12}/> {totalAttended} lần tham gia
                            </span>
                        </div>
                        
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-secondary border border-dashed border-border rounded-xl">
                                Chưa tham gia kèo nào.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-left text-sm text-secondary">
                                    <thead className="bg-background text-xs uppercase font-bold text-white">
                                        <tr>
                                            <th className="px-4 py-3">Kèo</th>
                                            <th className="px-4 py-3">Ngày</th>
                                            <th className="px-4 py-3 text-center">Đã Vote?</th>
                                            <th className="px-4 py-3 text-center">Tham gia (Check)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-surface/50">
                                        {history.map((item, idx) => (
                                            <tr key={item.poll.id} className="hover:bg-background/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-white">{item.poll.title}</div>
                                                    <div className="text-xs text-secondary/70 line-clamp-1">{item.poll.description}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {new Date(item.poll.createdAt).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.isVotedFull ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-green-400 font-bold">
                                                            <CheckCircle size={12} /> Full Option
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-secondary">
                                                            Chưa vote đủ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {currentUserRole === UserRole.ADMIN ? (
                                                        <button 
                                                            onClick={() => onToggleAttendance && onToggleAttendance(item.poll.id, user.id)}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                                                item.isAttended 
                                                                ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30' 
                                                                : 'bg-surface text-secondary border-border hover:border-primary hover:text-white'
                                                            }`}
                                                        >
                                                            {item.isAttended ? 'Đã Check-in' : 'Chưa Check-in'}
                                                        </button>
                                                    ) : (
                                                        item.isAttended ? (
                                                            <span className="text-green-500 font-bold flex items-center justify-center gap-1">
                                                                <CheckCircle size={14}/> Có mặt
                                                            </span>
                                                        ) : (
                                                            <span className="text-secondary opacity-50">-</span>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
import React from 'react';
import { User, Poll, UserRole } from '../types';
import { X, Calendar, CheckCircle, XCircle, Trophy, AlertTriangle } from 'lucide-react';

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

    const totalAttended = allPolls.filter(p => p.confirmedAttendances?.includes(user.id)).length;
    const flakeCount = user.flakeCount || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start bg-background/50">
                    <div className="flex gap-4 items-center">
                        <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-primary object-cover" />
                        <div>
                            <h2 className="text-2xl font-black text-white">{user.nickname}</h2>
                            <p className="text-secondary text-sm">{user.name} • {user.email}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/30 flex items-center gap-1">
                                    <Trophy size={12}/> {totalAttended} Lần tham gia
                                </span>
                                {flakeCount > 0 && (
                                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-500/30 flex items-center gap-1">
                                        <AlertTriangle size={12}/> {flakeCount} Số lần bùng
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-secondary hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-primary"/> Lịch sử chinh chiến
                    </h3>
                    
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
                                        <th className="px-4 py-3 text-center">Tham gia (Admin Check)</th>
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
    );
};
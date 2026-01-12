import React from 'react';
import { User, Poll, UserRole } from '@/core/types/types';
import { X, Calendar, CheckCircle, AlertTriangle, Trophy, UserX, Beer, BeerOff } from 'lucide-react';

interface UserDetailModalProps {
    user: User | null;
    onClose: () => void;
    allPolls: Poll[];
    currentUserRole?: UserRole; // To check permissions
    onToggleAttendance?: (pollId: string, userId: string) => void;
    onToggleFlake?: (pollId: string, userId: string) => void;
    onToggleNonDrinker?: (pollId: string, userId: string) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
    user,
    onClose,
    allPolls,
    currentUserRole,
    onToggleAttendance,
    onToggleFlake,
    onToggleNonDrinker
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

        // Is Flaked? (Check user's profile for this poll ID)
        const isFlaked = user.flakedPolls?.includes(poll.id) || false;

        return {
            poll,
            isJoined,
            isVotedFull,
            isAttended,
            isFlaked,
            isNonDrinker: participant?.isNonDrinker || false,
            status: participant?.status || 'N/A'
        };
    }).filter(item => item.isJoined || item.isAttended); // Only show relevant polls

    const totalAttended = allPolls.filter(p => p.confirmedAttendances?.includes(user.id)).length + (user.attendanceOffset || 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-surface border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>

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
                                <Calendar size={18} className="text-primary" /> Lịch sử chinh chiến
                            </h3>
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-bold border border-primary/20 flex items-center gap-1">
                                <Trophy size={12} /> {totalAttended} lần tham gia
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
                                            <th className="px-4 py-3 text-center">Trạng thái (Admin Check)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-surface/50">
                                        {history.map((item, idx) => (
                                            <tr key={item.poll.id} className="hover:bg-background/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white max-w-[150px] truncate">{item.poll.title}</td>
                                                <td className="px-4 py-3">{new Date(item.poll.createdAt).toLocaleDateString('vi-VN')}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.isVotedFull ? <span className="text-green-400">✓</span> : <span className="text-secondary opacity-30">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {currentUserRole === 'ADMIN' && onToggleAttendance && onToggleFlake ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {/* Non-drinker Toggle Button (Yellow/Orange) */}
                                                            {onToggleNonDrinker && (
                                                                <button
                                                                    onClick={() => onToggleNonDrinker(item.poll.id, user.id)}
                                                                    className={`cursor-pointer px-2 py-1 rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 border shrink-0 ${item.isNonDrinker
                                                                        ? 'bg-secondary border-secondary text-white'
                                                                        : 'bg-primary border-primary text-background hover:bg-primary-hover shadow-[0_0_10px_rgba(244,140,37,0.2)]'
                                                                        }`}
                                                                    title={item.isNonDrinker ? "Chuyển sang CÓ NHẬU" : "Chuyển sang KHÔNG NHẬU"}
                                                                >
                                                                    {item.isNonDrinker ? <BeerOff size={10} /> : <Beer size={10} />}
                                                                    {item.isNonDrinker ? 'Ko Uống' : 'Có Uống'}
                                                                </button>
                                                            )}

                                                            {/* Check-in Button (Green) */}
                                                            <button
                                                                onClick={() => {
                                                                    if (!item.isAttended) onToggleAttendance(item.poll.id, user.id);
                                                                }}
                                                                className={`cursor-pointer px-2 py-1 rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 border shrink-0 ${item.isAttended
                                                                    ? 'bg-green-600 border-green-600 text-white cursor-default'
                                                                    : 'bg-surface border-border text-secondary hover:bg-green-500/10 hover:border-green-500 hover:text-green-500'
                                                                    }`}
                                                                title="Xác nhận có mặt"
                                                            >
                                                                {item.isAttended && <CheckCircle size={10} />} Check-in
                                                            </button>

                                                            {/* Flake Button (Red) - Only if Joined */}
                                                            {item.isJoined && (
                                                                <button
                                                                    onClick={() => {
                                                                        onToggleFlake(item.poll.id, user.id);
                                                                    }}
                                                                    className={`cursor-pointer px-2 py-1 rounded-[4px] text-[10px] font-bold transition-all flex items-center gap-1 border shrink-0 ${item.isFlaked
                                                                        ? 'bg-red-600 border-red-600 text-white cursor-pointer hover:bg-red-700'
                                                                        : 'bg-surface border-border text-secondary hover:bg-red-500/10 hover:border-red-500 hover:text-red-500'
                                                                        }`}
                                                                    title={item.isFlaked ? "Hủy phạt bùng" : "Xác nhận bùng kèo (Phạt)"}
                                                                >
                                                                    <UserX size={10} /> {item.isFlaked ? 'Đã Bùng' : 'Bùng'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            {item.isAttended ? (
                                                                <span className="text-green-400 font-bold text-xs bg-green-900/20 px-2 py-1 rounded border border-green-900/30 flex items-center gap-1">
                                                                    <CheckCircle size={12} /> Có mặt {item.isNonDrinker && '(Ko uống)'}
                                                                </span>
                                                            ) : (
                                                                item.isFlaked ? (
                                                                    <span className="text-red-400 font-bold text-xs bg-red-900/20 px-2 py-1 rounded border border-red-900/30 flex items-center gap-1">
                                                                        <UserX size={12} /> Bùng kèo
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-secondary opacity-30">-</span>
                                                                )
                                                            )}
                                                        </div>
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
import React from 'react';
import { User, Poll, UserRole } from '../types';
import { X, Calendar, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { DataService } from '../services/mockService';

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
                            <div className="flex gap-2 mt-2">
                                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/30 flex items-center gap-1">
                                    <Trophy size={12}/> {totalAttended} Lần tham gia
                                </span>
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
                                                    <span className="inline-flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs font-bold border border-green-400/20">
                                                        <CheckCircle size={12}/> Đủ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-orange-400 bg-orange-400/10 px-2 py-1 rounded text-xs font-bold border border-orange-400/20">
                                                        <XCircle size={12}/> Thiếu
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {currentUserRole === UserRole.ADMIN ? (
                                                    <label className="inline-flex items-center cursor-pointer relative">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={item.isAttended} 
                                                            onChange={() => onToggleAttendance && onToggleAttendance(item.poll.id, user.id)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                    </label>
                                                ) : (
                                                    item.isAttended ? (
                                                        <CheckCircle className="mx-auto text-primary" size={20} />
                                                    ) : (
                                                        <span className="text-xs text-secondary">-</span>
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
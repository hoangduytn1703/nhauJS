import React, { useState, useEffect } from 'react';
import { DataService } from '@/core/services/mockService';
import { User, Poll, PollOption, UserRole } from '@/core/types/types';
import { useAuth } from '@/core/hooks';
import { Plus, Trash2, Edit2, Calendar, MapPin, Clock, Eye, Gavel, Check, Ban, AlertTriangle, Settings, Save, XCircle, RefreshCw, EyeOff, StickyNote, Trophy } from 'lucide-react';
import { UserDetailModal } from '@/components/UserDetailModal';
import { PollResultModal } from '@/components/PollResultModal';

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
    const [editingUserStats, setEditingUserStats] = useState<User | null>(null);

    // Form State
    const [editingPollId, setEditingPollId] = useState<string | null>(null);
    const [pollTitle, setPollTitle] = useState('');
    const [pollDesc, setPollDesc] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState<string>(''); // YYYY-MM-DD
    const [resultDate, setResultDate] = useState<string>(''); // YYYY-MM-DD

    // Location Options State
    const [pollOptions, setPollOptions] = useState<{ id?: string, text: string, description: string, notes: string, votes?: string[] }[]>([
        { text: '', description: '', notes: '' },
        { text: '', description: '', notes: '' }
    ]);

    // Time Options State
    const [timeOptions, setTimeOptions] = useState<{ id?: string, text: string, votes?: string[] }[]>([
        { text: '' },
        { text: '' }
    ]);

    // Delete Confirmation State
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    // Reopen Confirmation State
    const [confirmReopenId, setConfirmReopenId] = useState<string | null>(null);

    // User Actions State
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

    // Finalize State
    const [finalizingPollId, setFinalizingPollId] = useState<string | null>(null);
    const [selectedFinalTime, setSelectedFinalTime] = useState<string>('');
    const [selectedFinalLoc, setSelectedFinalLoc] = useState<string>('');

    // View Results Modal State
    const [viewResultPoll, setViewResultPoll] = useState<Poll | null>(null);

    // User Info Edit State
    const [statsForm, setStatsForm] = useState({
        name: '',
        nickname: '',
        attendanceOffset: 0,
        voteOffset: 0,
        flakeCount: 0
    });

    const isAdmin = user?.role === UserRole.ADMIN;

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        DataService.getUsers().then(setUsers);
        DataService.getPolls().then(setPolls);
    }

    // --- STATS EDITING ---
    const handleEditStatsClick = (u: User) => {
        setEditingUserStats(u);
        setStatsForm({
            name: u.name,
            nickname: u.nickname,
            attendanceOffset: u.attendanceOffset || 0,
            voteOffset: u.voteOffset || 0,
            flakeCount: u.flakeCount || 0
        });
    };

    const submitUserStats = async () => {
        if (!editingUserStats) return;
        const nameRegex = /^[\p{L}\s]{3,50}$/u;

        if (!statsForm.nickname.trim() || !nameRegex.test(statsForm.nickname)) {
            alert('Biệt danh không hợp lệ (3-50 ký tự, chỉ chứa chữ cái)');
            return;
        }
        if (!statsForm.name.trim() || !nameRegex.test(statsForm.name)) {
            alert('Tên thật không hợp lệ (3-50 ký tự, chỉ chứa chữ cái)');
            return;
        }

        try {
            await DataService.updateProfile(editingUserStats.id, {
                name: statsForm.name.trim(),
                nickname: statsForm.nickname.trim(),
                attendanceOffset: Number(statsForm.attendanceOffset),
                voteOffset: Number(statsForm.voteOffset),
                flakeCount: Number(statsForm.flakeCount)
            });
            alert("Đã cập nhật thông tin thành viên!");
            setEditingUserStats(null);
            refreshData();
        } catch (e) {
            alert("Lỗi khi cập nhật");
        }
    };

    // Populate form when clicking Edit Poll
    const handleEditClick = (poll: Poll) => {
        setEditingPollId(poll.id);
        setPollTitle(poll.title);
        setPollDesc(poll.description);
        setAllowMultiple(poll.allowMultipleVotes || false);
        setDeadlineDate(toInputDate(poll.deadline));
        setResultDate(toInputDate(poll.resultDate));

        const formOptions = poll.options.map(o => ({
            id: o.id,
            text: o.text,
            description: o.description || '',
            notes: o.notes || '',
            votes: o.votes
        }));
        setPollOptions(formOptions);

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

        setSelectedFinalTime(poll.finalizedTimeId || '');
        setSelectedFinalLoc(poll.finalizedOptionId || '');

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
        setPollOptions([{ text: '', description: '', notes: '' }, { text: '', description: '', notes: '' }]);
        setTimeOptions([{ text: '' }, { text: '' }]);
        setSelectedFinalTime('');
        setSelectedFinalLoc('');
    };

    // Helper to create timestamp at 16:00:00 VN Time (+7)
    const createFixedTimestamp = (dateString: string) => {
        if (!dateString) return 0;
        const combined = `${dateString}T16:00:00+07:00`;
        return new Date(combined).getTime();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAdmin) return;

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
            isHidden: false,
        };

        try {
            if (editingPollId) {
                const updatedOptions: PollOption[] = validOptions.map((opt, idx) => ({
                    id: opt.id || `opt_loc_${Date.now()}_${idx}`,
                    text: opt.text,
                    description: opt.description,
                    notes: opt.notes,
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
        if (!isAdmin) return;
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
            setTimeout(() => setConfirmDeleteId(null), 3000);
        }
    }

    // --- REOPEN LOGIC ---
    const handleReopenPoll = async (poll: Poll) => {
        if (!isAdmin) return;
        if (confirmReopenId === poll.id) {
            try {
                await DataService.updatePoll(poll.id, {
                    finalizedOptionId: null,
                    finalizedTimeId: null
                });
                refreshData();
                if (finalizingPollId === poll.id) setFinalizingPollId(null);
                setConfirmReopenId(null);
            } catch (e) {
                console.error(e);
            }
        } else {
            setConfirmReopenId(poll.id);
            setTimeout(() => setConfirmReopenId(null), 3000);
        }
    };

    const handleToggleHidePoll = async (poll: Poll) => {
        if (!isAdmin) return;
        try {
            await DataService.updatePoll(poll.id, { isHidden: !poll.isHidden });
            refreshData();
        } catch (e) {
            alert('Lỗi khi ẩn/hiện kèo');
        }
    }

    const handleToggleBan = async (targetUser: User) => {
        if (!isAdmin) return;
        if (targetUser.id === user?.id) return alert("Không thể tự ban chính mình!");

        setProcessingUserId(targetUser.id);
        try {
            await DataService.toggleBanUser(targetUser.id, !targetUser.isBanned);
            setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isBanned: !targetUser.isBanned } : u));
        } catch (e) {
            alert("Lỗi khi cập nhật trạng thái Ban");
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleDeleteUser = async (targetUserId: string) => {
        if (!isAdmin) return;
        if (targetUserId === user?.id) return alert("Không thể tự xóa chính mình!");

        if (confirmDeleteId === targetUserId) {
            setProcessingUserId(targetUserId);
            try {
                await DataService.deleteUser(targetUserId);
                setUsers(prev => prev.filter(u => u.id !== targetUserId));
                setConfirmDeleteId(null);
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
        if (!isAdmin) return;
        try {
            await DataService.toggleAttendance(pollId, userId);
            // Refresh user list too as toggleAttendance might update user flakeCount
            refreshData();
            if (selectedUser && selectedUser.id === userId) {
                const updatedUser = await DataService.getUser(userId);
                setSelectedUser(updatedUser);
            }
        } catch (e) {
            alert('Lỗi khi cập nhật tham gia');
        }
    };

    const handleToggleFlake = async (pollId: string, userId: string) => {
        if (!isAdmin) return;
        try {
            await DataService.toggleFlake(pollId, userId);
            // Refresh both as it affects both
            refreshData();
            if (selectedUser && selectedUser.id === userId) {
                const updatedUser = await DataService.getUser(userId);
                setSelectedUser(updatedUser);
            }
        } catch (e) {
            alert('Lỗi khi cập nhật bùng kèo');
        }
    };

    const handleFinalizeClick = (poll: Poll) => {
        if (!isAdmin) return;
        if (finalizingPollId === poll.id) {
            setFinalizingPollId(null);
            setSelectedFinalTime('');
            setSelectedFinalLoc('');
        } else {
            setFinalizingPollId(poll.id);
            const topTimes = getWinners(poll.timeOptions || []);
            const topLocs = getWinners(poll.options);

            setSelectedFinalTime(poll.finalizedTimeId || (topTimes.length > 0 ? topTimes[0].id : ''));
            setSelectedFinalLoc(poll.finalizedOptionId || (topLocs.length > 0 ? topLocs[0].id : ''));
        }
    };

    const submitFinalize = async (pollId: string) => {
        if (!isAdmin) return;
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

    const handleOptionChange = (idx: number, field: 'text' | 'description' | 'notes', val: string) => {
        const newOpts = [...pollOptions];
        newOpts[idx] = { ...newOpts[idx], [field]: val };
        setPollOptions(newOpts);
    };
    const addOption = () => setPollOptions([...pollOptions, { text: '', description: '', notes: '' }]);
    const removeOption = (idx: number) => {
        if (pollOptions.length <= 2) return;
        setPollOptions(pollOptions.filter((_, i) => i !== idx));
    };

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
                onToggleFlake={handleToggleFlake}
            />

            {/* --- VIEW RESULTS MODAL (Reusable) --- */}
            <PollResultModal
                poll={viewResultPoll}
                users={users}
                onClose={() => setViewResultPoll(null)}
            />

            {/* --- EDIT INFO MODAL (ADMIN ONLY) --- */}
            {editingUserStats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button
                            onClick={() => setEditingUserStats(null)}
                            className="absolute top-4 right-4 text-secondary hover:text-white"
                        >
                            <XCircle size={24} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-2">Chỉnh sửa thông tin thành viên</h3>
                        <p className="text-secondary text-sm mb-4">Cập nhật cho: <strong className="text-primary">{editingUserStats.email}</strong></p>

                        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
                            {/* Basic Info */}
                            <div className="p-3 bg-background/50 rounded-lg border border-border">
                                <h4 className="text-xs uppercase font-bold text-white mb-3">Thông tin cơ bản</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-secondary mb-1 block">Tên hiển thị (Tên thật)</label>
                                        <input
                                            type="text"
                                            value={statsForm.name}
                                            onChange={e => setStatsForm({ ...statsForm, name: e.target.value })}
                                            className="w-full bg-surface border border-border rounded p-3 text-white focus:border-primary outline-none"
                                            placeholder="VD: Nguyễn Văn A"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-secondary mb-1 block">Biệt danh bàn nhậu</label>
                                        <input
                                            type="text"
                                            value={statsForm.nickname}
                                            onChange={e => setStatsForm({ ...statsForm, nickname: e.target.value })}
                                            className="w-full bg-surface border border-border rounded p-3 text-white focus:border-primary outline-none"
                                            placeholder="VD: Tuấn Cồn"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Stats Info */}
                            <div className="p-3 bg-background/50 rounded-lg border border-border">
                                <h4 className="text-xs uppercase font-bold text-white mb-3">Chỉ số thành tích</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-secondary mb-1 block">Điều chỉnh số lần tham gia (+/-)</label>
                                        <input
                                            type="number"
                                            value={statsForm.attendanceOffset}
                                            onChange={e => setStatsForm({ ...statsForm, attendanceOffset: Number(e.target.value) })}
                                            className="w-full bg-surface border border-border rounded p-3 text-white focus:border-primary outline-none"
                                        />
                                        <p className="text-[10px] text-secondary mt-1">Dùng số âm để giảm.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-secondary mb-1 block">Điều chỉnh số lần vote (+/-)</label>
                                        <input
                                            type="number"
                                            value={statsForm.voteOffset}
                                            onChange={e => setStatsForm({ ...statsForm, voteOffset: Number(e.target.value) })}
                                            className="w-full bg-surface border border-border rounded p-3 text-white focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-secondary mb-1 block flex items-center gap-1"><AlertTriangle size={12} /> Số "Lần bùng" (Giá trị thực)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={statsForm.flakeCount}
                                            onChange={e => setStatsForm({ ...statsForm, flakeCount: Number(e.target.value) })}
                                            className="w-full bg-surface border border-border rounded p-3 text-white focus:border-red-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={submitUserStats}
                                className="bg-primary hover:bg-primary-hover text-background font-bold py-3 rounded-xl mt-2 flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Lưu Thay Đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Pub Master</h1>
                    <p className="text-secondary">Quản lý dân chơi và tạo kèo</p>
                    {!isAdmin && <p className="text-xs text-primary mt-1">(Chế độ xem dành cho Member)</p>}
                </div>
                <div className="flex gap-2 bg-surface p-1 rounded-full border border-border">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'USERS' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                    >
                        Thành viên
                        <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-black">{users.length}</span>
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
                                                    <div className={`font-bold ${u.isBanned ? 'text-red-400 line-through' : 'text-white'}`}>{u.name}</div>
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
                                            <span className="bg-white/10 px-2 py-1 rounded text-xs text-white">
                                                {polls.filter(p => p.confirmedAttendances?.includes(u.id)).length} kèo
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                {/* ADMIN ACTIONS */}
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditStatsClick(u)}
                                                            className="p-2 rounded-lg transition-all bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                            title="Chỉnh sửa thông tin"
                                                        >
                                                            <Settings size={16} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleBan(u)}
                                                            disabled={processingUserId === u.id || u.role === 'ADMIN'}
                                                            className={`p-2 rounded-lg transition-all ${u.isBanned ? 'bg-green-600/20 text-green-400 hover:bg-green-600/40' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/40'}`}
                                                            title={u.isBanned ? "Mở khóa (Unban)" : "Cấm (Ban)"}
                                                        >
                                                            {u.isBanned ? <Check size={16} /> : <Ban size={16} />}
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            disabled={processingUserId === u.id || u.role === 'ADMIN'}
                                                            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${confirmDeleteId === u.id ? 'bg-red-600 text-white hover:bg-red-700 w-auto px-3' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                                                            title="Xóa vĩnh viễn"
                                                        >
                                                            {confirmDeleteId === u.id ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
                                                            {confirmDeleteId === u.id && <span className="text-xs font-bold">Xác nhận?</span>}
                                                        </button>
                                                    </>
                                                )}

                                                {/* VIEW DETAILS (AVAILABLE FOR ALL) */}
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="p-2 hover:text-primary transition-colors text-secondary"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
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

            {/* ... POLLS TAB (40/60 Split Row with Swapped Positions) ... */}
            {activeTab === 'POLLS' && (
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* 1. Create/Edit Form (40% - Moved to Left) */}
                    {isAdmin && (
                        <div className="w-full lg:w-[50%] lg:sticky lg:top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto bg-surface p-6 rounded-2xl border border-border shadow-xl custom-scrollbar order-1">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {editingPollId ? <Edit2 className="text-primary" /> : <Plus className="text-primary" />}
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
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-white block mb-2 flex items-center gap-1"><Calendar size={14} /> Deadline Vote (Date)</label>
                                            <input
                                                type="date"
                                                value={deadlineDate}
                                                onChange={e => setDeadlineDate(e.target.value)}
                                                className="w-full bg-background border border-border rounded-lg p-2 text-white text-sm focus:border-primary outline-none cursor-pointer"
                                            />
                                            <p className="text-[10px] text-secondary mt-1 italic">Mặc định chốt lúc 16:00</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-white block mb-2 flex items-center gap-1"><Calendar size={14} /> Ngày báo kết quả</label>
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
                                    <label className="text-sm font-bold text-white block mb-2 flex items-center gap-2"><Calendar size={16} /> Chọn ngày chiến (Date Options)</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {timeOptions.map((opt, idx) => (
                                            <div key={idx} className="bg-background p-2 rounded-lg border border-border flex gap-2 items-center relative">
                                                <input
                                                    type="date"
                                                    value={opt.text}
                                                    onChange={e => handleTimeChange(idx, e.target.value)}
                                                    className="flex-1 bg-transparent text-white text-sm font-bold outline-none text-center cursor-pointer"
                                                />
                                                {timeOptions.length > 1 && (
                                                    <button type="button" onClick={() => removeTime(idx)} className="text-secondary hover:text-red-500"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addTime} className="bg-surface border border-dashed border-secondary text-secondary hover:text-white hover:border-white rounded-lg p-2 flex items-center justify-center">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Location Options */}
                                <div>
                                    <label className="text-sm font-bold text-white block mb-2 flex items-center gap-2"><MapPin size={16} /> Các địa điểm (Location Options)</label>
                                    <div className="space-y-3">
                                        {pollOptions.map((opt, idx) => (
                                            <div key={idx} className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2 relative group">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-secondary text-sm font-mono w-4">{idx + 1}.</span>
                                                    <input
                                                        value={opt.text}
                                                        onChange={e => handleOptionChange(idx, 'text', e.target.value)}
                                                        className="flex-1 bg-transparent border-b border-border focus:border-primary text-white font-bold outline-none pb-1"
                                                        placeholder={`Tên quán`}
                                                    />
                                                    {pollOptions.length > 2 && (
                                                        <button type="button" onClick={() => removeOption(idx)} className="text-secondary hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                    )}
                                                </div>

                                                {/* Address / Map Link */}
                                                <div className="flex items-center gap-2 pl-6">
                                                    <MapPin size={14} className="text-secondary shrink-0" />
                                                    <input
                                                        value={opt.description}
                                                        onChange={e => handleOptionChange(idx, 'description', e.target.value)}
                                                        className="w-full bg-transparent text-xs text-white outline-none border-b border-border/50 focus:border-primary pb-1 placeholder-secondary/50"
                                                        placeholder="Địa chỉ..."
                                                    />
                                                </div>

                                                {/* Notes */}
                                                <div className="flex items-center gap-2 pl-6">
                                                    <StickyNote size={14} className="text-secondary shrink-0" />
                                                    <input
                                                        value={opt.notes}
                                                        onChange={e => handleOptionChange(idx, 'notes', e.target.value)}
                                                        className="w-full bg-transparent text-xs text-white outline-none border-b border-border/50 focus:border-primary pb-1 placeholder-secondary/50"
                                                        placeholder="Ghi chú..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addOption} className="w-full py-3 rounded-lg border border-dashed border-secondary text-secondary hover:border-white hover:text-white transition-all flex items-center justify-center gap-2">
                                            <Plus size={16} /> Thêm địa điểm
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="bg-primary hover:bg-primary-hover text-background font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95">
                                    {editingPollId ? 'Cập Nhật Kèo' : 'Lên Bia! 🍻'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 2. Poll List (60% - Moved to Right) */}
                    <div className="w-full lg:w-[50%] space-y-4 order-2">
                        <h2 className="text-xl font-bold text-white mb-4">Danh sách kèo</h2>
                        {polls.map(poll => {
                            const isExpired = poll.deadline > 0 && Date.now() > poll.deadline;
                            const isFinalized = !!poll.finalizedOptionId || !!poll.finalizedTimeId;

                            return (
                                <div key={poll.id} className={`bg-surface border rounded-xl p-5 relative transition-all ${isExpired || isFinalized ? 'border-border opacity-80' : 'border-primary shadow-md'} ${poll.isHidden ? 'opacity-50 grayscale' : ''}`}>
                                    {isFinalized && (
                                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                                            ĐÃ CHỐT
                                        </div>
                                    )}
                                    {isExpired && !isFinalized && (
                                        <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg border border-red-500/30">
                                            HẾT HẠN
                                        </div>
                                    )}
                                    {poll.isHidden && (
                                        <div className="absolute top-8 right-0 bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-l-lg flex items-center gap-1">
                                            <EyeOff size={10} /> ĐÃ ẨN
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white text-lg">{poll.title}</h3>
                                    </div>
                                    <div className="text-xs text-secondary mb-3 flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} /> Tạo: {new Date(poll.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className={`flex items-center gap-1 font-bold ${isExpired ? 'text-red-400' : 'text-primary'}`}>
                                            <Clock size={12} /> Deadline: {poll.deadline ? new Date(poll.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                                        </div>
                                    </div>

                                    {/* Quick Actions - Only for Admin */}
                                    {isAdmin && (
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                                            {/* View Results Button */}
                                            <button
                                                onClick={() => setViewResultPoll(poll)}
                                                className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-2 rounded hover:bg-blue-600/40 font-bold transition-all"
                                                title="Xem kết quả"
                                            >
                                                <Trophy size={14} /> Xem KQ
                                            </button>

                                            <button
                                                onClick={() => handleEditClick(poll)}
                                                className="flex items-center gap-1 text-xs bg-white/10 text-white px-3 py-2 rounded hover:bg-white/20 font-bold"
                                                title="Chỉnh sửa (Gia hạn/Sửa lỗi)"
                                            >
                                                <Edit2 size={14} /> Sửa
                                            </button>

                                            {/* Finalize Button Toggle */}
                                            <div className="relative group">
                                                <button
                                                    onClick={() => handleFinalizeClick(poll)}
                                                    className={`flex items-center gap-1 text-xs px-3 py-2 rounded font-bold transition-all ${isFinalized
                                                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                                                        : 'bg-green-600 text-white hover:bg-green-500'
                                                        } ${finalizingPollId === poll.id ? 'ring-2 ring-white' : ''}`}
                                                >
                                                    <Gavel size={14} /> {isFinalized ? 'Sửa Kết Quả' : 'Chốt Kèo'}
                                                </button>

                                                {/* Dropdown for Finalize */}
                                                {finalizingPollId === poll.id && (
                                                    <div className="absolute left-0 bottom-full mb-2 bg-background border border-border rounded-xl p-4 shadow-2xl w-64 z-20 animate-in zoom-in-95">
                                                        <h4 className="text-white font-bold text-sm mb-3">Chọn kết quả cuối cùng</h4>

                                                        <label className="block mb-2">
                                                            <span className="text-xs text-secondary block mb-1">Ngày chốt:</span>
                                                            <select
                                                                className="w-full bg-surface border border-border rounded p-1 text-xs text-white"
                                                                value={selectedFinalTime}
                                                                onChange={(e) => setSelectedFinalTime(e.target.value)}
                                                            >
                                                                <option value="">-- Chưa chốt ngày --</option>
                                                                {(poll.timeOptions || []).map(t => (
                                                                    <option key={t.id} value={t.id}>{new Date(t.text).toLocaleDateString('vi-VN')} ({t.votes.length} vote)</option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <label className="block mb-3">
                                                            <span className="text-xs text-secondary block mb-1">Địa điểm chốt:</span>
                                                            <select
                                                                className="w-full bg-surface border border-border rounded p-1 text-xs text-white"
                                                                value={selectedFinalLoc}
                                                                onChange={(e) => setSelectedFinalLoc(e.target.value)}
                                                            >
                                                                <option value="">-- Chưa chốt quán --</option>
                                                                {poll.options.map(o => (
                                                                    <option key={o.id} value={o.id}>{o.text} ({o.votes.length} vote)</option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <div className="flex gap-2">
                                                            <button onClick={() => submitFinalize(poll.id)} className="flex-1 bg-primary text-background text-xs font-bold py-2 rounded hover:brightness-110">
                                                                Xác nhận
                                                            </button>
                                                            <button onClick={() => setFinalizingPollId(null)} className="bg-surface border border-border text-xs py-2 px-3 rounded hover:bg-white/10">
                                                                Huỷ
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Hide/Show Poll (Only when finalized) */}
                                            {isFinalized && (
                                                <button
                                                    onClick={() => handleToggleHidePoll(poll)}
                                                    className={`flex items-center gap-1 text-xs px-3 py-2 rounded font-bold transition-all ${poll.isHidden ? 'bg-gray-600 text-white' : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}`}
                                                    title={poll.isHidden ? "Hiện lại trên Dashboard" : "Ẩn khỏi Dashboard"}
                                                >
                                                    {poll.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    {poll.isHidden ? 'Hiện' : 'Ẩn'}
                                                </button>
                                            )}

                                            {/* Reopen Button */}
                                            {isFinalized && !poll.isHidden && (
                                                <button
                                                    onClick={() => handleReopenPoll(poll)}
                                                    className={`flex items-center gap-1 text-xs px-3 py-2 rounded font-bold transition-all ${confirmReopenId === poll.id
                                                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                                                        : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                                        }`}
                                                    title="Hủy trạng thái đã chốt (Giữ nguyên deadline)"
                                                >
                                                    <RefreshCw size={14} className={confirmReopenId === poll.id ? "animate-spin" : ""} />
                                                    {confirmReopenId === poll.id ? 'Xác nhận?' : 'Mở lại'}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeletePoll(poll.id)}
                                                className={`ml-auto p-2 rounded hover:bg-red-500/10 text-secondary hover:text-red-400 transition-all ${confirmDeleteId === poll.id ? 'bg-red-600 text-white hover:bg-red-700 w-auto px-3' : ''}`}
                                                title="Xóa kèo"
                                            >
                                                {confirmDeleteId === poll.id ? <span className="text-xs font-bold">Xác nhận xóa?</span> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
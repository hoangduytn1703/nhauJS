import React, { useState, useRef } from 'react';
import { useAuth } from '../App';
import { DataService } from '../services/mockService';
import { User, UserRole } from '../types';
import { Badge, Edit, Save, Camera, AlertTriangle } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState<Partial<User>>(user || {});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSave = async () => {
      // 1. Validation Logic
      const nameRegex = /^[\p{L}\s]{3,50}$/u;

      const nickname = formData.nickname?.trim() || '';
      if (!nickname) {
          alert('Vui lòng nhập "Biệt danh trên bàn nhậu"!');
          return;
      }
      if (!nameRegex.test(nickname)) {
          alert('Biệt danh chỉ được chứa chữ cái, độ dài từ 3-50 ký tự.');
          return;
      }

      const realName = formData.name?.trim() || '';
      if (!realName) {
          alert('Vui lòng nhập "Tên thật"!');
          return;
      }
      if (!nameRegex.test(realName)) {
          alert('Tên thật chỉ được chứa chữ cái, độ dài từ 3-50 ký tự.');
          return;
      }

      setSaving(true);
      try {
          const updated = await DataService.updateProfile(user.id, formData);
          updateUser(updated);
          alert('Cập nhật thành công!');
      } catch (e) {
          alert('Lỗi');
      } finally {
          setSaving(false);
      }
  };

  // Logic nén ảnh và chuyển sang Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          alert('Ảnh quá lớn. Vui lòng chọn ảnh < 5MB');
          return;
      }

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
          const img = new Image();
          img.onload = () => {
              // Resize image via Canvas to avoid large Base64 strings (Firestore document limit is 1MB)
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 300;
              const MAX_HEIGHT = 300;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_WIDTH) {
                      height *= MAX_WIDTH / width;
                      width = MAX_WIDTH;
                  }
              } else {
                  if (height > MAX_HEIGHT) {
                      width *= MAX_HEIGHT / height;
                      height = MAX_HEIGHT;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              const base64String = canvas.toDataURL('image/jpeg', 0.8); // Compress Quality 0.8
              setFormData({ ...formData, avatar: base64String });
          };
          img.src = readerEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  // 2. Updated Drink List (Beers only)
  const drinkOptions = [
      'Tiger Bạc (Crystal)', 
      'Tiger Nâu', 
      'Heineken', 
      'Heineken Bạc',
      'Budweiser', 
      'Bia Sài Gòn', 
      'Bia 333',
      'Sapporo', 
      'Beck\'s',
      'Bia Trúc Bạch',
      'Bia Hơi Hà Nội',
      'Strongbow'
  ];

  const toggleDrink = (drink: string) => {
      const current = formData.favoriteDrinks || [];
      const newDrinks = current.includes(drink) 
        ? current.filter(d => d !== drink)
        : [...current, drink];
      setFormData({ ...formData, favoriteDrinks: newDrinks });
  };

  return (
    <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between gap-3 mb-8">
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-secondary mb-2">Hồ Sơ Dân Chơi</h1>
                <p className="text-secondary">Cập nhật thông tin để anh em nhận diện trên bàn nhậu</p>
            </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
            {/* Edit Form */}
            <div className="lg:col-span-7 flex flex-col gap-8">
                {/* Avatar */}
                <div className="bg-surface/50 border border-border rounded-xl p-6 flex items-center gap-6">
                    <div 
                        className="relative group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden">
                            <img src={formData.avatar || user.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-background rounded-full p-2 border-4 border-background hover:scale-110 transition-transform">
                            <Camera size={16} />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Ảnh đại diện</h3>
                        <p className="text-secondary text-sm">Chọn ảnh ngầu nhất đang cầm ly.<br/>Click vào ảnh để thay đổi.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <label className="flex flex-col gap-2">
                        <span className="text-white font-medium flex items-center gap-1">Biệt danh bàn nhậu <span className="text-red-500">*</span></span>
                        <input 
                            value={formData.nickname}
                            onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                            className={`w-full bg-surface border rounded-xl px-4 h-12 text-white focus:border-primary outline-none ${!formData.nickname?.trim() ? 'border-red-500/50' : 'border-border'}`}
                            placeholder="VD: Tuấn Cồn"
                            required
                        />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="text-white font-medium flex items-center gap-1">Tên thật <span className="text-red-500">*</span></span>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className={`w-full bg-surface border rounded-xl px-4 h-12 text-white focus:border-primary outline-none ${!formData.name?.trim() ? 'border-red-500/50' : 'border-border'}`}
                            placeholder="Tên đầy đủ"
                            required
                        />
                    </label>
                </div>

                <label className="flex flex-col gap-2">
                    <span className="text-white font-medium">Tuyên ngôn khi say</span>
                    <textarea 
                        value={formData.quote}
                        onChange={(e) => setFormData({...formData, quote: e.target.value})}
                        className="w-full bg-surface border border-border rounded-xl p-4 min-h-[100px] text-white focus:border-primary outline-none resize-none"
                    ></textarea>
                </label>

                {/* Tags */}
                <div>
                    <span className="text-white font-medium mb-3 block">Món tủ (Bia)</span>
                    <div className="flex flex-wrap gap-3">
                        {drinkOptions.map(drink => (
                            <button
                                key={drink}
                                onClick={() => toggleDrink(drink)}
                                className={`px-5 py-2 rounded-full border transition-all text-sm ${
                                    formData.favoriteDrinks?.includes(drink)
                                    ? 'bg-primary text-background font-bold border-primary'
                                    : 'bg-surface text-secondary border-border hover:border-primary'
                                }`}
                            >
                                {drink}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 bg-primary hover:bg-primary-hover text-background font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                    <Save size={20} /> {saving ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
                </button>
            </div>

            {/* Preview Card */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
                <div className="sticky top-24">
                     <h3 className="text-white font-bold text-lg mb-4">Xem trước thẻ thành viên</h3>
                     <div className="relative w-full aspect-[1.58/1] rounded-2xl overflow-hidden shadow-2xl border border-secondary/30 group">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#493622] via-[#231a10] to-[#1a120b]"></div>
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white,transparent)]"></div>
                        
                        <div className="relative z-10 flex flex-col h-full p-6 justify-between">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-secondary font-bold tracking-widest text-xs uppercase border border-secondary px-2 py-0.5 rounded">Official Member</span>
                                </div>
                                <div className="bg-gradient-to-r from-primary to-orange-400 text-[#231a10] text-xs font-black px-3 py-1 rounded-full uppercase">
                                    Dân Chơi
                                </div>
                            </div>

                            <div className="flex gap-4 items-end">
                                <img src={formData.avatar || user.avatar} className="w-20 h-20 rounded-full border-2 border-secondary object-cover" />
                                <div>
                                    <h2 className="text-white text-2xl font-black leading-none mb-1">{formData.nickname || '...'}</h2>
                                    <p className="text-secondary text-xs font-medium uppercase">{formData.name || '...'}</p>
                                    {(user.flakeCount || 0) > 0 && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded w-fit border border-red-900/30">
                                            <AlertTriangle size={10} /> {user.flakeCount} Vết nhơ
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 mt-2">
                                <p className="text-white/90 text-xs italic">"{formData.quote || '...'}"</p>
                                <div className="flex justify-between items-center mt-3">
                                    <div className="flex gap-1 text-[10px] text-secondary uppercase font-bold max-w-[70%] line-clamp-1">
                                        {formData.favoriteDrinks?.length ? formData.favoriteDrinks.join(' • ') : 'Chưa chọn món tủ'}
                                    </div>
                                    <div className="text-[10px] text-white/50 font-mono">ID: {user.id.toUpperCase().slice(0, 8)}</div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Profile;
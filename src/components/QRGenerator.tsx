import React, { useState } from 'react';
import { QrCode, Copy, Download, X, Save } from 'lucide-react';
import { DataService } from '@/core/services/mockService';
import { Poll } from '@/core/types/types';

interface QRGeneratorProps {
  onClose: () => void;
  polls: Poll[];
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ onClose, polls }) => {
  const [selectedPollId, setSelectedPollId] = useState('');
  const selectedPoll = polls.find(p => p.id === selectedPollId);
  
  const [bankName, setBankName] = useState(selectedPoll?.bankInfo?.bankName || 'VIB');
  const [bankBin, setBankBin] = useState(selectedPoll?.bankInfo?.bankBin || '970441');
  const [accountNumber, setAccountNumber] = useState(selectedPoll?.bankInfo?.accountNumber || '006563589');
  const [accountHolder, setAccountHolder] = useState(selectedPoll?.bankInfo?.accountHolder || 'NGUYEN VAN A');
  const [momoNumber, setMomoNumber] = useState(selectedPoll?.bankInfo?.momoNumber || '');
  const [saving, setSaving] = useState(false);

  // Generate VietQR URL - without amount and content for flexibility
  const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?accountName=${encodeURIComponent(accountHolder)}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${bankName}_${accountNumber}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    alert('Đã copy URL QR code!');
  };

  const handleSave = async () => {
    if (!selectedPollId) {
      alert('Vui lòng chọn kèo!');
      return;
    }
    setSaving(true);
    try {
      await DataService.saveBankInfo(selectedPollId, {
        bankName,
        bankBin,
        accountNumber,
        accountHolder,
        momoNumber,
      });
      alert('Đã lưu thông tin QR thành công!');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu thông tin QR');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-surface border border-border rounded-3xl w-full max-w-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-secondary hover:text-white transition-colors"
        >
          <X size={32} />
        </button>

        <h3 className="text-3xl font-black text-white mb-2 pr-10 flex items-center gap-2">
          <QrCode className="text-primary" size={32} />
          Tạo Thông tin thanh toán
        </h3>
        <p className="text-secondary text-sm mb-8 border-b border-border pb-6">
          Mã QR chung cho tất cả bill. Số tiền và nội dung sẽ tự động điền từ bill của từng user.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Input */}
          <div className="space-y-5">
            <div>
              <label className="text-white text-sm font-bold block mb-2">Chọn kèo để lưu QR</label>
              <select
                value={selectedPollId}
                onChange={(e) => {
                  setSelectedPollId(e.target.value);
                  const poll = polls.find(p => p.id === e.target.value);
                  if (poll?.bankInfo) {
                    setBankName(poll.bankInfo.bankName);
                    setBankBin(poll.bankInfo.bankBin);
                    setAccountNumber(poll.bankInfo.accountNumber);
                    setAccountHolder(poll.bankInfo.accountHolder);
                    setMomoNumber(poll.bankInfo.momoNumber || '');
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
              >
                <option value="">-- Chọn kèo --</option>
                {polls.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.bankInfo ? '(Đã có QR)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white text-sm font-bold block mb-2">Ngân hàng</label>
              <select
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  // Update BIN based on bank
                  const bins: Record<string, string> = {
                    VIB: '970441',
                    Vietcombank: '970436',
                    Techcombank: '970407',
                    MB: '970422',
                    ACB: '970416',
                    VPBank: '970432',
                    Agribank: '970405',
                    BIDV: '970418',
                    Sacombank: '970403',
                    TPBank: '970423',
                  };
                  setBankBin(bins[e.target.value] || '970441');
                }}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
              >
                <option value="VIB">VIB</option>
                <option value="Vietcombank">Vietcombank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="MB">MB Bank</option>
                <option value="ACB">ACB</option>
                <option value="VPBank">VPBank</option>
                <option value="Agribank">Agribank</option>
                <option value="BIDV">BIDV</option>
                <option value="Sacombank">Sacombank</option>
                <option value="TPBank">TPBank</option>
              </select>
            </div>

            <div>
              <label className="text-white text-sm font-bold block mb-2">Số tài khoản</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono"
                placeholder="006563589"
              />
            </div>

            <div>
              <label className="text-white text-sm font-bold block mb-2">Chủ tài khoản</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none uppercase"
                placeholder="NGUYEN VAN A"
              />
            </div>

            <div>
              <label className="text-white text-sm font-bold block mb-2">Momo (nếu có)</label>
              <input
                type="text"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono"
                placeholder="VD: 0798889162"
              />
              <p className="text-xs text-secondary mt-1">Tùy chọn - để trống nếu không dùng Momo</p>
            </div>

            <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl">
              <p className="text-xs text-primary font-bold mb-2">💡 Lưu ý</p>
              <ul className="text-xs text-secondary space-y-1">
                <li>• Mã QR này sẽ dùng chung cho tất cả bill</li>
                <li>• Số tiền tự động điền từ bill của từng user</li>
                <li>• Nội dung: "[Tên user] thanh toán [Tên kèo]"</li>
              </ul>
            </div>
          </div>

          {/* QR Preview */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6">
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-64 h-64 object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="256" height="256"%3E%3Crect fill="%23ddd" width="256" height="256"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="16"%3EInvalid QR%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="text-center mt-3">
                <div className="text-black font-bold text-sm">{bankName}</div>
                <div className="text-black font-mono text-xs">{accountNumber}</div>
                {accountHolder && <div className="text-black text-xs mt-1">{accountHolder}</div>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={handleSave}
                disabled={saving || !selectedPollId}
                className="flex-1 bg-primary hover:bg-primary-hover disabled:bg-gray-700 text-background py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save size={18} />
                {saving ? 'Đang lưu...' : 'Lưu QR'}
              </button>
              <button
                onClick={handleCopyUrl}
                className="flex-1 bg-background hover:bg-background/80 border border-border text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Copy size={18} />
                Copy URL
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-background hover:bg-background/80 border border-border text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download size={18} />
                Tải về
              </button>
            </div>

            <div className="mt-4 text-xs text-secondary text-center max-w-sm">
              <p className="bg-background/50 p-3 rounded-lg border border-border/50">
                💡 Mã QR được tạo bằng VietQR API. Quét bằng app ngân hàng bất kỳ để chuyển khoản.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

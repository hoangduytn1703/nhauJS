# Hướng Dẫn Sử Dụng Hệ Thống Only Bill (Isolated Module)

Tài liệu này hướng dẫn cách sử dụng và các kịch bản kiểm thử (QC) cho module **Only Bill** - hệ thống quyết toán hóa đơn độc lập dành riêng cho các đơn vị cần sự riêng tư (ví dụ: DU2).

---

## 1. Tổng Quan
Module Only Bill được thiết kế để tách biệt hoàn toàn dữ liệu và giao diện với hệ thống Nhậu JS chính.
- **Đường dẫn Admin**: `/only-bill/admin`
- **Đường dẫn User**: `/only-bill`
- **Đặc điểm**: Không hiển thị Avatar người dùng (để tăng tính riêng tư), giao diện rút gọn, luồng công việc tập trung vào việc tính tiền nhanh.

---

## 2. Dành Cho Quản Trị Viên (Only Bill Admin)

### 2.1. Quyền Truy Cập
- Chỉ tài khoản hệ thống `admin@admin.com` mới có quyền truy cập.
- Khi đăng nhập bằng tài khoản này, hệ thống sẽ tự động chuyển hướng và "khóa" người dùng tại trang Admin của Only Bill. Không thể truy cập các trang khác của Nhậu JS.

### 2.2. Luồng Nghiệp Vụ (3 Bước Chính)

#### Bước 1: Tạo kèo (Tab: Tạo kèo)
- Nhập **Tiêu đề** (Bắt buộc) và **Mô tả** (Không bắt buộc).
- Nhấn "Lưu kèo & Chuyển sang Quyết toán". Hệ thống sẽ tạo một phiên nhậu mới và chuyển sang tab tiếp theo.

#### Bước 2: Check số lượng (Tab: Check số lượng)
Đây là màn hình quan trọng nhất để chốt danh sách người tham gia.
- **Chọn Kèo**: Chọn một kèo vừa tạo hoặc kèo cũ cần chỉnh sửa.
- **Danh sách thành viên**:
    - **Tìm kiếm**: Sử dụng thanh search để tìm nhanh thành viên.
    - **Cột "Có đi nhậu?"**: Tick chọn người tham gia.
    - **Cột "Không uống?"**: Chỉ có hiệu lực khi đã chọn "Có đi nhậu". 
    - **Cột "Đi taxi chung?"**: Chỉ có hiệu lực khi đã chọn "Có đi nhậu".
- **Tính năng đặc biệt (Cần QC kỹ)**:
    - **Auto-clear**: Nếu đang chọn "Không uống" hoặc "Taxi" mà **bỏ chọn** "Có đi nhậu", thì các option kia phải tự động xóa về `false`.
    - **Select All (Cột)**: Nút "All" ở đầu mỗi cột để chọn/bỏ chọn toàn bộ danh sách đang hiển thị.
    - **User Toggle All (Cột ALL)**: Nút ngoài cùng bên phải giúp bật/tắt cả 3 option của 1 user chỉ bằng 1 click.
- Nhấn "TIẾP THEO: TÍNH TIỀN" để chốt danh sách.

#### Bước 3: Thanh toán (Tab: Thanh toán)
- **Thiết lập QR**: Admin cấu hình thông tin ngân hàng (Số tài khoản, ngân hàng, tên chủ tài khoản) để hệ thống tự tạo mã QR cho người dùng.
- **Chuyển hướng tính tiền**: Sau khi chốt danh sách ở bước 2, nhấn "Mở trang Bill Split" để sang giao diện nhập hóa đơn và chia tiền.

---

## 3. Dành Cho Người Dùng (Only Bill Public)

### 3.1. Tra cứu hóa đơn (`/only-bill`)
- Hiển thị danh sách các buổi nhậu đã được Admin chốt bill.
- Sử dụng thanh tìm kiếm để tìm kèo.
- Danh sách người tham gia được hiển thị dưới dạng **Text Tag** (Không có Avatar).

### 3.2. Xem chi tiết và Trả tiền (`/only-bill/bills?pollId=...`)
- **Lựa chọn danh tính (Dành cho Guest)**:
    - Nếu người dùng chưa đăng nhập, một bảng "Bạn là ai?" sẽ xuất hiện.
    - Có thanh tìm kiếm để chọn đúng tên mình.
    - Sau khi chọn, hệ thống sẽ ghi nhớ và hiển thị số tiền riêng của người đó.
- **Giao diện tính tiền**:
    - Hiển thị danh sách bảng tính (Không có avatar).
    - Người dùng xem mã QR để chuyển khoản cho Admin. Nội dung chuyển khoản được tự động tạo theo format: `[Tên] thanh toan bill [Tên Kèo]`.
    - Người dùng có thể tự đánh dấu "Đã đóng tiền" (nếu được Admin cho phép).

---

## 4. Danh Sách Các Case QC Cần Lưu Ý (Checklist)

1.  **Isolation Test**: Đăng nhập `admin@admin.com`, thử gõ URL `/members` hoặc `/` xem có bị redirect về `/only-bill-admin` không? (Kỳ vọng: CÓ).
2.  **Avatar Privacy**: Kiểm tra tất cả các màn hình Only Bill, đảm bảo không có bất kỳ ảnh đại diện (avatar) nào của User bị lộ. (Kỳ vọng: Chỉ hiện ký tự đầu của tên hoặc Text).
3.  **Logic Chốt Member**:
    *   Tick "Có đi nhậu" -> Tick "Taxi". Sau đó bỏ tick "Có đi nhậu".
    *   Kỳ vọng: Cột "Taxi" phải tự động mất dấu tick.
4.  **Bulk Action**: Thử nhấn "All" ở cột "Có đi nhậu" khi đang search 1 nhóm từ khóa.
    *   Kỳ vọng: Chỉ những người hiện ra trong kết quả search mới bị ảnh hưởng.
5.  **Guest Flow**: Mở link trả tiền bằng trình ẩn danh.
    *   Kỳ vọng: Phải hiện bảng chọn tên trước khi xem được bill.
6.  **Attendance Warning**: Nếu Admin đã chốt bill, sau đó quay lại "Check số lượng" để thêm người.
    *   Kỳ vọng: Khi nhấn "Tiếp theo", hệ thống phải hiện bảng cảnh báo danh sách đã thay đổi.

---
*Tài liệu được cập nhật ngày 14/01/2026 bởi DuyNH.*

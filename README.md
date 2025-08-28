# Novel Site (Firebase)

Một website đơn giản để đăng truyện tiểu thuyết với Firebase (Auth, Firestore, Storage).

## Tính năng
- Danh sách truyện, phân trang 10/trang, tìm kiếm theo tên.
- Mở truyện để xem danh sách chương, có nút Like mỗi chương (chặn like trùng bằng uid).
- Đăng ký/đăng nhập bằng Email/Password, lưu profile người dùng (nickname).
- Chế độ sáng/tối, chọn font & cỡ chữ (lưu trong localStorage).
- Trang Admin (chỉ user có `admin=true` trong `users/{uid}`) để tạo truyện, upload ảnh bìa, thêm chương.

## Cấu trúc Firestore
- `users/{uid}`: { email, nickname, admin:boolean, createdAt }
- `stories/{storyId}`: { title, description, coverUrl, createdAt, authorUid }
- `stories/{storyId}/chapters/{chapterId}`: { title, content, createdAt, likedBy: [uid,...] }

> *Gán quyền admin*: vào Firestore, sửa document `users/{uid}` và đặt `admin: true`.

## Chạy local
Mở `index.html` bằng live server (vì module import). Hoặc deploy lên hosting tĩnh (Firebase Hosting, Vercel, Netlify,...).

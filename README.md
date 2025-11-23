🚀 ShareZone — Real-Time, Login-Free File Sharing
ShareZone is a fast, modern, and secure real-time file-sharing platform designed for students, teams, and anyone who needs quick collaboration without the clutter of messaging apps.
Easily create a Zone, share files instantly, filter and sort uploads, and download only what you need — all without creating an account.

🌐 Live Demo:
🔗 https://sharezone-web.vercel.app/

📝 About ShareZone
College groups and teams often struggle with messy file sharing — PDFs, PPTs, photos, and videos get mixed up in WhatsApp/Telegram, unwanted downloads happen, storage fills up, and version confusion starts.
ShareZone solves this by giving users a clean shared space (Zone) where they can:
Upload files instantly
Add optional notes
Filter by uploader, file type, or upload time
See new files since their last visit
Download only what they actually need
Zones auto-expire after 10 hours, ensuring clean-up and zero leftover clutter.
It’s fast, real-time, minimal, and requires NO login.

🛠 Tech Stack
Frontend (Vite + React)
React (with Hooks)
Tailwind CSS (custom theme)
React Router
Axios
Socket.io Client
Vite

Backend (Node + Express)
Express.js REST API
MongoDB + Mongoose
Socket.io (real-time updates)
Cloudinary (file & image storage)
Multer + Multer-Storage-Cloudinary
CORS
Auto-clean logic for expired Zones

Hosting
🔹 Frontend → Vercel
🔹 Backend → Render
🔹 Storage → Cloudinary
🔹 Database → MongoDB Atlas

📦 Features

✔ Create private Zones
✔ Join instantly using shareable link (auto-fill)
✔ Upload files of any type (PDF, PPT, images, videos)
✔ Add optional message to identify files
✔ See uploader name & upload time
✔ Sort by: uploader, file type, recent, newest
✔ Filter by: file type, user, or “New since last visit”
✔ Real-time updates using Socket.io
✔ Auto-delete Zones after 10 hours
✔ Fully responsive — works great on mobile
✔ Modern UI with smooth animations
✔ No login required — hassle-free sharing

📁 Project Structure
ShareZone/
  ├── client/         # React frontend
  │   ├── src/
  │   ├── public/
  │   ├── vite.config.js
  │   └── package.json
  │
  └── server/         # Node.js backend
      ├── routes/
      ├── models/
      ├── cloudinary.js
      ├── server.js
      └── package.json

🧪 How to Run ShareZone Locally
1️⃣ Clone the repository
git clone https://github.com/Pramukh-P/ShareZone.git
cd ShareZone

2️⃣ Install backend dependencies
cd server
npm install

3️⃣ Create a .env file inside server/

Add:

MONGO_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_secret_key

4️⃣ Start the backend
npm start


Backend runs at:
http://localhost:10000

5️⃣ Install frontend dependencies

Open a new terminal:

cd client
npm install

6️⃣ Start the frontend
npm run dev

Frontend runs at:
http://localhost:5173

💡 Why I Built This

I wanted to create a simple but powerful file-sharing tool that avoids the common frustrations of group projects:
No login
No unwanted downloads
No storage overload
No messy chat attachments
Clean and fast collaboration
This project demonstrates full-stack development, real-time communication, cloud storage integration, and production deployment.

🤝 Contributions

Pull requests and suggestions are always welcome!

📬 Contact

GitHub: https://github.com/Pramukh-P

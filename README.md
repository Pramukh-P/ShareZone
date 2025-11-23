🚀 ShareZone — Real-Time, Login-Free File Sharing
ShareZone is a clean and easy file-sharing website made for students and teams.
Just create a Zone, share the link with others, and start uploading files instantly.

🌐 Live Demo:
🔗 https://sharezone-web.vercel.app/

ShareZone solves this by giving users a clean shared space (Zone) where they can:
•	Upload files instantly
•	Add optional notes
•	Filter by uploader, file type, or upload time
•	See new files since their last visit
•	Download only what they actually need

Zones stay active until their selected end-time, and the owner can extend the duration up to a total of 10 hours. 
Once the Zone expires or is manually deleted, all files and data linked to that Zone are automatically cleaned up — keeping everything clutter-free.
It’s fast, real-time, minimal, and requires NO login.

🛠 Tech Stack

Frontend (Vite + React)
•	React (with Hooks)
•	Tailwind CSS (custom theme)
•	React Router
•	Axios
•	Socket.io Client
•	Vite


Backend (Node + Express)
•	Express.js REST API
•	MongoDB + Mongoose
•	Socket.io (real-time updates)
•	Cloudinary (file & image storage)
•	Multer + Multer-Storage-Cloudinary
•	CORS
•	Auto-clean logic for expired Zones


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

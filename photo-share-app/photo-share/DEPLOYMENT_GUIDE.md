# 🚀 Photo Share — Free Deployment Guide

Deploy your Photo Share app online for FREE using **Render.com**.
No credit card required. Works on any device worldwide.

---

## 📁 Step 1 — Set Up Your Project Folder

Make sure your project looks like this:

```
photo-share/
├── server.js
├── package.json
├── .gitignore
└── public/
    └── index.html
```

---

## 🐙 Step 2 — Upload to GitHub (Free)

GitHub stores your code online so Render can deploy it.

1. Go to **https://github.com** → Sign up for a free account (if you don't have one)
2. Click the **"+"** button (top right) → **"New repository"**
3. Name it: `photo-share` → Click **"Create repository"**
4. Download and install **Git** from https://git-scm.com/downloads
5. Open **Terminal** (Mac/Linux) or **Command Prompt** (Windows)
6. Navigate to your project folder:
   ```bash
   cd path/to/photo-share
   ```
7. Run these commands one by one:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/photo-share.git
   git push -u origin main
   ```
   *(Replace YOUR_USERNAME with your GitHub username)*

---

## 🌐 Step 3 — Deploy on Render (Free Hosting)

Render gives you a free server that runs your Node.js app.

1. Go to **https://render.com** → Sign up with your GitHub account
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"** → Select your `photo-share` repo
4. Fill in these settings:

   | Setting | Value |
   |---|---|
   | **Name** | `photo-share` (or anything you like) |
   | **Region** | Singapore (closest to Philippines) |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Instance Type** | `Free` |

5. Click **"Create Web Service"**
6. Wait 2–3 minutes while Render builds and deploys your app
7. Your live URL will appear at the top — something like:
   ```
   https://photo-share-xxxx.onrender.com
   ```

---

## ✅ Step 4 — Test It

1. Open the URL on your phone, tablet, and computer
2. Upload photos — they should appear in the gallery
3. Share the URL with anyone — they can all see and upload photos!

---

## ⚠️ Important Notes About the Free Plan

| Thing | What Happens |
|---|---|
| **Server sleep** | Free Render servers sleep after 15 min of no traffic. First visit after sleep takes ~30 seconds to wake up. |
| **Storage** | Uploaded photos are stored on the server's disk. On Render's free plan, this resets when the server redeploys. |
| **Upgrade for persistence** | For permanent photo storage, upgrade to Render's $7/month plan OR add **Cloudinary** (free image cloud storage) |

---

## 🔁 How to Update Your App Later

Whenever you make changes to your code:
```bash
git add .
git commit -m "Describe your change"
git push
```
Render will automatically redeploy within 1–2 minutes.

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| Site won't load | Wait 30 seconds — server may be waking up |
| Upload fails | Check that Start Command is exactly `node server.js` |
| Git push fails | Make sure you replaced YOUR_USERNAME in the remote URL |
| Build fails | Check that `package.json` exists in the root folder |

---

*Deployed with ❤️ — Your Photo Share app is now live worldwide!*

📚 Flashcards PWA

A lightweight Progressive Web App (PWA) for studying with flashcards — powered by Google Sheets as a backend.

Designed to provide:

📱 A clean mobile study experience

☁️ Google Sheets as a simple data source

🔐 Read-only access for students

⚙️ Admin editing via Apps Script

No database. No server. No paid services.

🚀 Live Demo

👉 https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/

✨ Features

📱 Installable on iOS & Android

🔄 Shuffle cards

⬅️➡️ Previous / Next navigation

👀 Reveal answer

🏷️ Tag support

🎯 Self-grading (Easy / Unsure / Hard)

⚙️ Hidden configuration panel

🔐 Read-only API access via secret key

💾 Local progress stored in browser

🌐 Hosted on GitHub Pages

🏗 Architecture
Google Sheets
       ↓
Google Apps Script (Web App API)
       ↓
Flashcards PWA (GitHub Pages)
Backend

Google Sheets stores the cards

Google Apps Script exposes REST endpoints:

path=decks

path=sheets

path=cards

POST for admin updates

Frontend

Vanilla HTML/CSS/JavaScript

Service Worker for offline support

PWA install support

📂 Project Structure
.
├── index.html
├── app.js
├── sw.js
├── manifest.json
└── README.md
🌍 Deployment (GitHub Pages)

Push the project to a GitHub repository

Go to:

Settings → Pages

Choose:

Source: Deploy from branch

Branch: main

Folder: / (root)

Save

Your site will be available at:

https://USERNAME.github.io/REPO-NAME/
⚙️ Setup Guide
1️⃣ Prepare Google Sheets

Each sheet should have headers:

id	question	answer	tags	level	active

Example:

| 001 | What is the capital of France? | Paris | geography | 1 | TRUE |

2️⃣ Deploy Google Apps Script

Deploy as Web App:

Execute as: Me

Who has access: Anyone

Set a long random READONLY_KEY in the script configuration.

3️⃣ Configure the App

In the app settings panel:

Enter the Apps Script Web App URL (ending with /exec)

Enter your READONLY_KEY

Click Save

📱 Installing as an App
Android (Chrome)

Menu → Install app

iPhone (Safari)

Share → Add to Home Screen

🔐 Security Model

Read-only access controlled via secret key

Write access restricted to script owner

No external database

All data remains in your Google account

🛠 Roadmap

Spaced repetition algorithm

Statistics dashboard

Swipe gestures

Dark/light mode toggle

Built-in admin editor

Multi-user support

🎯 Why This Project?

The goal was to build a private, flexible and cost-free study tool without:

Hosting a backend server

Using a database

Paying for SaaS tools

Handling authentication systems

Simple, transparent, and fully under your control.

📄 License

MIT License

👤 Author

Erik Cato
Sweden 🇸🇪

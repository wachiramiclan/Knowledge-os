# Knowledge OS

A local-first place for your notes, ideas and projects. Search finds anything you saved,
including exact error messages. React (client) + Node.js/Express (server) + PostgreSQL (your data).
Your data stays in the database on your own computer.

## 1. Install once
- Node.js (LTS): https://nodejs.org
- PostgreSQL: https://www.postgresql.org/download
- VS Code: https://code.visualstudio.com

## 2. Create the database
In a terminal inside this folder:

    psql -U postgres -c "CREATE DATABASE knowledge;"
    psql -U postgres -d knowledge -f server/schema.sql
    psql -U postgres -d knowledge -f server/seed.sql      (optional sample notes)

## 3. Start the server
    cd server
    copy .env.example .env      (Mac/Linux: cp .env.example .env)
    # open .env and put your Postgres password in DATABASE_URL
    npm install
    npm start                   # http://localhost:4000

## 4. Start the website (second terminal)
    cd client
    npm install
    npm run dev                 # http://localhost:5173

## 5. Save to GitHub
    git init
    git add .
    git commit -m "Knowledge OS first version"
    git remote add origin https://github.com/YOUR-NAME/knowledge-os.git
    git branch -M main
    git push -u origin main

## Where to edit
- client/src/style.css  colours, fonts, glow, layout (gold colours are at the top)
- client/src/App.jsx    every card and screen
- client/index.html     page shell and fonts
- server/index.js       the API (notes, graph, projects, search)
- server/schema.sql     database tables

## How the "AI Assistant" works today
It searches your notes (full-text search plus exact text match) and shows what it found.
It does not call any outside AI, so nothing leaves your computer.

# 🔍 Google Index Checker Pro (`site:` Verifier)

A production-ready, full-stack Next.js web application and API that automatically checks whether your web page URLs are indexed on Google using automated `site:` search queries.

Designed specifically for seamless deployment on **GitHub** and **Vercel** with full **Google CAPTCHA & Datacenter IP blocking handling**.

---

## ✨ Features

- ⚡ **Single & Bulk URL Checking**: Check 1 URL or paste a batch of up to 100 URLs at once.
- 🛡️ **Anti-CAPTCHA Architecture**:
  - **Serper.dev Engine**: 2,500 free queries, zero CAPTCHA, returns real-time organic search results and snippet.
  - **Google Custom Search JSON API Engine**: 100 free queries/day directly via Google Cloud API.
  - **Smart Direct Scraper**: Automatic fallback with desktop User-Agent rotation and CAPTCHA detection.
  - **1-Click Live Google Verification**: Instant button to inspect the live query directly in your browser without any datacenter blocks.
- 📊 **Real-time Statistics & Indexation Rate**: Total, Indexed ✅, Not Indexed ❌, and CAPTCHA/Issues ⚠️.
- 📥 **Export to CSV**: Download complete inspection reports with 1 click.
- 📋 **Copy Indexed URLs**: Quick clipboard copy for further SEO workflows or indexing submission.
- 🎨 **Modern Responsive UI**: Built with Tailwind CSS, Lucide Icons, and clean glassmorphism design.
- 🚀 **100% Vercel Serverless Ready**: Zero heavy headless browser dependencies that timeout on Vercel.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTML Parsing**: Cheerio

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/YOUR_USERNAME/google-index-checker.git
cd google-index-checker
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

Add your free API keys:

```env
# Recommended (Get 2,500 free searches from https://serper.dev - No credit card needed)
SERPER_API_KEY=your_serper_api_key_here

# OR Google Official Custom Search API
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_CX=your_cx_engine_id
```

*(Note: You can also enter API keys directly in the Web UI Settings modal, stored securely in browser `localStorage`)*

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel in 2 Minutes

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "feat: Google Index Checker Pro"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/google-index-checker.git
git push -u origin main
```

### Step 2: Import into Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Import** next to your GitHub repository.
3. Under **Environment Variables**, add:
   - `SERPER_API_KEY` = your Serper key (Get from [serper.dev](https://serper.dev) for 2,500 free checks).
4. Click **Deploy**.

Your Google Index Checker will be live with a free `.vercel.app` domain!

---

## 🔌 API Endpoint

You can also use this as an API in your own scripts, cron jobs, or Google Sheets!

### `POST /api/check-index`

**Headers:**
```http
Content-Type: application/json
x-serper-key: your_key (optional if set in env)
```

**Body:**
```json
{
  "urls": [
    "https://example.com/blog/article-1",
    "https://example.com/blog/article-2"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "abc1234",
      "url": "https://example.com/blog/article-1",
      "cleanUrl": "https://example.com/blog/article-1",
      "status": "indexed",
      "isIndexed": true,
      "method": "serper",
      "title": "Article 1 Title - Example",
      "snippet": "Meta description of article 1...",
      "checkedAt": "2026-10-08T09:40:00.000Z",
      "siteQuery": "site:https://example.com/blog/article-1",
      "googleSearchUrl": "https://www.google.com/search?q=site%3Ahttps%3A%2F%2Fexample.com%2Fblog%2Farticle-1"
    }
  ],
  "summary": {
    "total": 1,
    "indexed": 1,
    "notIndexed": 0,
    "errors": 0
  }
}
```

---

## 📄 License

MIT License. Free for personal and commercial use.

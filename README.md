# LightNoteAI — AI-Powered Video Editing

An MVP application that lets users upload a video, describe an edit in natural language (e.g. "Replace the bottle with Pepsi"), and get a processed video with the requested modification applied.

## Features

- **Video Upload** — Upload MP4, MOV, AVI, or WebM videos (up to 100MB)
- **Reference Image** — Optionally upload an image to use as the replacement object
- **Natural Language Instructions** — Describe your edit in plain English
- **LLM Prompt Understanding** — Uses Gemini / OpenAI / Qwen to parse instructions into structured operations
- **Object Detection** — LLM-powered object location estimation
- **Object Replacement / Removal** — Modifies video frames using Sharp image processing
- **Object Tracking** — Tracks detected objects across frames with simulated drift
- **Background Processing** — Jobs run asynchronously with real-time progress updates
- **Video Rebuild** — Reassembles processed frames into a final MP4 using FFmpeg
- **Multi-Provider AI** — Switch between Gemini, OpenAI, and Qwen via environment variable

## Architecture

```
┌──────────────┐      ┌──────────────────────┐      ┌──────────┐
│   React UI   │─────▶│  Express API Server  │─────▶│ MongoDB  │
│ (Vite + TS)  │◀─────│  (Node.js + TS)      │◀─────│  Atlas   │
└──────────────┘      └──────────┬───────────┘      └──────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  FFmpeg   │ │  Sharp   │ │ LLM API  │
              │ (frames)  │ │ (images) │ │(Gemini/..)│
              └──────────┘ └──────────┘ └──────────┘
```

## Processing Flow

```
Upload Video + Prompt
        ↓
  Create Job (MongoDB)
        ↓
  Parse Prompt (LLM) → { operation, target, replacement }
        ↓
  Extract Frames (FFmpeg)
        ↓
  Detect Target Object (LLM)
        ↓
  Track Object Across Frames
        ↓
  Replace/Remove Object (Sharp)
        ↓
  Rebuild Video (FFmpeg)
        ↓
  Return Output Video
```

## Tech Stack

| Layer           | Technology                        |
|-----------------|-----------------------------------|
| Frontend        | React, TypeScript, Vite, Tailwind CSS, Axios |
| Backend         | Node.js, Express, TypeScript      |
| Database        | MongoDB Atlas, Mongoose           |
| Validation      | Zod, Multer                       |
| Video           | FFmpeg (fluent-ffmpeg)            |
| Image Processing| Sharp                             |
| AI              | Gemini / OpenAI / Qwen            |

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in your values:

```env
MONGODB_URI=mongodb+srv://...
AI_PROVIDER=gemini          # gemini | openai | qwen
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash
OPENAI_API_KEY=your-key     # optional
OPENAI_MODEL=gpt-4o-mini
QWEN_API_KEY=your-key       # optional
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
PORT=5000
```

Only the API key for your selected `AI_PROVIDER` is required.

## 🚀 Quick Start & Local Setup

Follow these steps to run the project locally on your machine.

### Prerequisites

Make sure you have:
- **Node.js** (v18 or later) — [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas** account (Free tier) — [Create Atlas Account](https://www.mongodb.com/cloud/atlas/register)
- **Google Gemini API Key** (Free tier available) — [Get Gemini API Key](https://aistudio.google.com/app/apikey)
  *(Optionally, you can use OpenAI or Qwen instead)*

> **Note on FFmpeg:** Portable FFmpeg and FFprobe binaries are already bundled in the backend dependencies (`@ffmpeg-installer/ffmpeg`), so **no manual FFmpeg installation or PATH configuration is needed!**

---

### Step-by-Step Installation

#### 1. Clone the repository
```bash
git clone https://github.com/Beastharsh970/LightNote-AI.git
cd LightNote-AI
```

#### 2. Backend Setup
1. Navigate to the server folder and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create your `.env` file from the example:
   - On Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - On Mac/Linux:
     ```bash
     cp .env.example .env
     ```

3. Open `server/.env` and update the values:
   ```env
   # 1. Paste your MongoDB connection string
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0

   # 2. Select your AI provider (default is gemini)
   AI_PROVIDER=gemini

   # 3. Paste your Gemini API key (from Google AI Studio)
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-2.0-flash

   PORT=5000
   ```

   > **MongoDB Atlas Tip:** Make sure your IP address is whitelisted in MongoDB Atlas under **Security** → **Network Access** → **Add IP Address** (choose *Allow Access from Anywhere `0.0.0.0/0`* for development).

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   You should see:
   ```text
   ✅ MongoDB connected
   🚀 LightNoteAI server running on http://localhost:5000
   🤖 AI Provider: gemini
   ```

---

#### 3. Frontend Setup
1. Open a **new terminal tab/window**, navigate to the `frontend` folder and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### Troubleshooting Common Issues

- **MongoDB Connection `querySrv ECONNREFUSED`**:
  Certain local ISP / Wi-Fi DNS servers block MongoDB SRV lookups. The backend already includes an automatic fallback to Google and Cloudflare public DNS (`8.8.8.8`, `1.1.1.1`). If you still encounter issues, verify that your IP is allowed in MongoDB Atlas Network Access.
- **Port 5000 already in use**:
  You can change `PORT=5001` in `server/.env`. If you do, update the proxy port in `frontend/vite.config.ts` accordingly.
- **Custom System FFmpeg (Optional)**:
  If you prefer using your own system-installed FFmpeg instead of the bundled portable binary, simply set `FFMPEG_PATH` and `FFPROBE_PATH` in `server/.env`.

---

## 🌐 Deployment (Render + Vercel)

### 1. Deploy Backend on [Render](https://render.com/)

1. Push your latest code to GitHub.
2. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your repository: `Beastharsh970/LightNote-AI`.
4. Fill in the settings:
   - **Name**: `lightnoteai-backend`
   - **Region**: Choose the closest to you
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Under **Environment Variables**, add:
   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | `mongodb+srv://...` (your full Atlas connection string) |
   | `AI_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | your Google AI Studio API key |
   | `GEMINI_MODEL` | `gemini-2.0-flash` |
   | `NODE_ENV` | `production` |
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render backend URL (e.g. `https://lightnoteai-backend.onrender.com`).

---

### 2. Deploy Frontend on [Vercel](https://vercel.com/)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
2. Import your GitHub repository: `Beastharsh970/LightNote-AI`.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`
4. Expand **Environment Variables** and add:
   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://lightnoteai-backend.onrender.com` *(your Render URL from step 1)* |
5. Click **Deploy**.
6. When deployment finishes, your app will be live on your custom `https://*.vercel.app` URL!

---

## API Endpoints

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | `/api/jobs`               | Create a processing job        |
| GET    | `/api/jobs/:jobId`        | Get job status and progress    |
| GET    | `/api/jobs/:jobId/output` | Download/stream output video   |
| GET    | `/api/health`             | Health check                   |

### POST /api/jobs

Multipart form data:
- `video` (required) — Video file
- `referenceImage` (optional) — Reference image for replacement
- `prompt` (required) — Natural language instruction

### GET /api/jobs/:jobId

Response:
```json
{
  "success": true,
  "data": {
    "jobId": "...",
    "status": "processing",
    "progress": 60,
    "currentStep": "Replacing object (15/25)",
    "parsedInstruction": {
      "operation": "replace_object",
      "target": "Coca-Cola bottle",
      "replacement": "Pepsi"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "TARGET_NOT_FOUND",
    "message": "The requested object could not be detected."
  }
}
```

## Example Prompts

- `"Replace the bottle with Pepsi"`
- `"Remove the laptop from the desk"`
- `"Replace the car with a bus"`
- `"Remove the person in the background"`

## Running Tests

```bash
cd server
npm test
```

## Limitations

1. **Object detection is LLM-based** — not pixel-accurate computer vision. The LLM estimates object location based on common scene compositions.
2. **Replacement quality** — Uses image overlay (Sharp), not neural inpainting. Results are functional but not production-grade.
3. **Object removal** — Uses blur-based fill rather than generative inpainting.
4. **Tracking** — Uses simulated drift rather than optical flow. Adequate for MVP demonstration.
5. **Frame rate** — Processes at reduced FPS (5 fps) for performance; output may appear choppy.
6. **File size** — Max 100MB upload limit.
7. **No audio processing** — Audio from the original video is preserved but not modified.

## Project Structure

```
server/
  src/
    config/          # env.ts, db.ts
    controllers/     # jobController.ts
    routes/          # api.ts
    services/
      ai/            # provider.ts, geminiProvider.ts, openaiProvider.ts, qwenProvider.ts, index.ts
      video/         # ffmpegService.ts, imageProcessor.ts, pipeline.ts
    models/          # ProcessingJob.ts
    middleware/      # errorHandler.ts, upload.ts
    types/           # index.ts
    __tests__/       # core.test.ts
    index.ts         # Express server entry

frontend/
  src/
    components/      # FileUpload, ProgressBar, VideoPlayer
    pages/           # HomePage
    services/        # api.ts
    types/           # index.ts
    App.tsx
    main.tsx
```

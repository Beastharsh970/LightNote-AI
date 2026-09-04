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

## Installation

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB Atlas** account (free tier works)
- **FFmpeg** installed and available in PATH
- At least one AI API key (Gemini recommended — free tier available)

### FFmpeg Setup

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html and add to PATH
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

### Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

## How to Run

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
npm run dev
```

Server starts at `http://localhost:5000`

### Frontend

```bash
cd frontend
npm run dev
```

Frontend starts at `http://localhost:5173` (proxies API requests to :5000)

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

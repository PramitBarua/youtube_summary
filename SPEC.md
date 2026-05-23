# Technical Specification: YouTube Live Summarizer Chrome Extension (MVP)

## 1. Project Overview

### Goal

Build a Chrome extension that generates live summaries of YouTube videos directly inside the browser using fully local AI inference.

The extension:

- Detects YouTube video pages
- Transcribes audio locally using Whisper when hardware allows
- Falls back to official YouTube captions on lower-end devices
- Continuously updates a rolling summary while the video plays
- Renders the UI in a Shadow DOM overlay
- Stores saved summaries locally in IndexedDB

## 2. Product Scope (MVP)

### Supported

#### Video Types

- Standard YouTube videos only

#### Features

- Live transcript processing
- Incremental live summarization
- Short summary
- Key takeaways
- Manual save
- Local persistence
- Hardware-aware model selection
- Shadow DOM overlay UI
- Offline-capable after model download

### Not Included in MVP

- Livestreams
- Shorts
- Cloud APIs
- User accounts
- Cross-device sync
- AI chat
- Semantic search
- Multi-language UI
- Export/share
- Full transcript viewer

## 3. High-Level Architecture

```text
YouTube Page
    |
    v
Content Script
    |
    v
Shadow DOM Overlay (React)
    |
    v
Message Bus
    |
    v
Worker Layer
    |- Transcript Worker
    |- Summary Worker
    '- Device Profiler
    |
    v
IndexedDB
```

## 4. Core Technical Decisions

| Area                | Decision              |
| ------------------- | --------------------- |
| Language            | TypeScript            |
| UI                  | React                 |
| Extension Framework | CRXJS + Vite          |
| Manifest            | MV3                   |
| AI Runtime          | Transformers.js       |
| Inference Backend   | ONNX Runtime Web      |
| GPU Acceleration    | WebGPU if available   |
| Worker Strategy     | Dedicated Web Workers |
| Storage             | IndexedDB             |
| DB Wrapper          | Dexie.js              |
| UI Isolation        | Shadow DOM            |
| Summarization       | Fully local           |
| Persistence         | Local-only            |

## 5. Extension Architecture

### 5.1 Components

#### Content Script

Responsibilities:

- Detect YouTube page
- Inject Shadow DOM root
- Bootstrap React app
- Communicate with workers

#### React Overlay

Responsibilities:

- Display live summary
- Display key takeaways
- Show loading/progress states
- Handle save summary action

#### Transcript Worker

Responsibilities:

- Load Whisper
- Process audio chunks
- Emit transcript segments

#### Summary Worker

Responsibilities:

- Incremental summarization
- Rolling summary generation
- Takeaway extraction

#### Device Profiler

Responsibilities:

- Determine hardware tier
- Select transcription strategy
- Select model variant

#### IndexedDB Layer

Responsibilities:

- Save summaries
- Cache metadata
- Persist transcript snapshots

## 6. Hardware Detection Strategy

### APIs Used

- navigator.deviceMemory
- navigator.hardwareConcurrency
- navigator.gpu

### Hardware Tiers

| Tier    | Conditions             |
| ------- | ---------------------- |
| LOW     | <=4GB RAM OR <=4 cores |
| MEDIUM  | 8GB RAM                |
| HIGH    | 16GB RAM               |
| PREMIUM | >=16GB + WebGPU        |

### Runtime Strategy

| Tier    | Strategy              |
| ------- | --------------------- |
| LOW     | YouTube captions only |
| MEDIUM  | whisper-tiny          |
| HIGH    | whisper-base          |
| PREMIUM | whisper-small         |

## 7. AI Model Strategy

### 7.1 Transcription Models

Using:

- Whisper via Transformers.js

Recommended models:

| Tier    | Model                |
| ------- | -------------------- |
| MEDIUM  | Xenova/whisper-tiny  |
| HIGH    | Xenova/whisper-base  |
| PREMIUM | Xenova/whisper-small |

### 7.2 Summarization Models

Recommended:

- Xenova/distilbart-cnn-6-6

Future upgrade:

- FLAN-T5
- Phi-3-mini

## 8. Transcript Acquisition Pipeline

### Preferred Pipeline

```text
Audio Stream
    |
    v
Chunk Extraction
    |
    v
Whisper Worker
    |
    v
Transcript Chunks
```

### Fallback Pipeline

```text
YouTube Captions
    |
    v
Caption Parser
    |
    v
Transcript Chunks
```

## 9. Audio Processing Strategy

### Chunk Duration

Recommended:

- 15-30 seconds

### Processing Flow

```text
Video Audio
-> PCM extraction
-> chunk buffering
-> worker transfer
-> Whisper transcription
-> transcript queue
```

## 10. Incremental Summarization Strategy

### Important Constraint

Never summarize the entire transcript repeatedly.

### Rolling Summary Algorithm

```text
new transcript chunk
-> chunk summary
-> merge into rolling summary
-> update takeaways
```

### Summary State Structure

```ts
interface RollingSummary {
  shortSummary: string;
  keyTakeaways: string[];
  processedChunks: number;
  lastUpdated: number;
}
```

## 11. Web Worker Architecture

### Worker Topology

```text
Main Thread
    |
    v
Coordinator
    |- Transcript Worker
    '- Summary Worker
```

### Transcript Worker

Responsibilities:

- Load Whisper model
- Process audio chunks
- Emit transcript text

Communication:

```ts
postMessage({
  type: "TRANSCRIPT_CHUNK",
  payload: {
    text,
    start,
    end,
  },
});
```

### Summary Worker

Responsibilities:

- Summarize transcript chunk
- Maintain rolling summary state

Communication:

```ts
postMessage({
  type: "SUMMARY_UPDATE",
  payload: summary,
});
```

## 12. Shadow DOM Overlay Architecture

### Injection Strategy

```ts
const host = document.createElement("div");
const shadowRoot = host.attachShadow({ mode: "open" });
```

### Overlay Placement

Position:

- Top-right fixed overlay

### Overlay Features

| Feature         | MVP      |
| --------------- | -------- |
| Draggable       | Yes      |
| Collapsible     | Yes      |
| Resizable       | Optional |
| Dark mode       | Yes      |
| Minimized state | Yes      |

## 13. React Application Structure

### Suggested Structure

```text
src/
├── background/
├── content/
├── workers/
├── ai/
├── db/
├── hooks/
├── components/
├── models/
├── types/
├── utils/
└── styles/
```

## 14. IndexedDB Design

Using:

- Dexie.js

### Database Schema

#### videos

- videoId
- title
- channel
- duration
- createdAt

#### summaries

- id
- videoId
- shortSummary
- keyTakeaways
- transcriptSnapshot
- modelUsed
- createdAt

#### settings

- id
- preferredMode
- autoStart

## 15. Summary Metadata

Saved summaries should include:

```ts
interface SavedSummary {
  videoId: string;
  title: string;
  channel: string;
  duration: number;
  generatedAt: number;
  transcriptSnapshot: string;
  shortSummary: string;
  keyTakeaways: string[];
  modelUsed: string;
}
```

## 16. YouTube Detection Logic

### URL Detection

- youtube.com/watch

### Video Change Detection

Use:

- MutationObserver

Because YouTube is SPA-based.

## 17. Extension Permissions

### manifest.json

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "scripting", "activeTab"],
  "host_permissions": ["https://www.youtube.com/*"]
}
```

## 18. Model Loading Strategy

### Lazy Loading

Models should:

- Download only when needed
- Initialize in workers
- Cache automatically

### First-Run UX

Show:

- Model download progress
- Estimated size
- Initialization status

## 19. Performance Strategy

### Key Constraints

- Never block main thread
- All inference in workers
- Chunked processing only

Never process:

- Full audio
- Full transcript

### Memory Safety

Use:

- Transcript pruning
- Rolling context windows

## 20. Suggested Context Window Strategy

### Transcript Buffer

Keep:

- Last 10-15 transcript chunks

### Compression Strategy

Older chunks:

- Compress -> aggregate summary

## 21. Recommended Runtime Libraries

| Core Purpose | Library         |
| ------------ | --------------- |
| Extension    | CRXJS           |
| Build        | Vite            |
| UI           | React           |
| AI           | Transformers.js |
| Storage      | Dexie           |
| State        | Zustand         |
| Styling      | Tailwind        |

## 22. Recommended Folder Structure

```text
src/
├── ai/
│   ├── transcription/
│   ├── summarization/
│   └── hardware/
│
├── workers/
│   ├── transcript.worker.ts
│   └── summary.worker.ts
│
├── content/
│   ├── inject.tsx
│   └── observer.ts
│
├── components/
│   ├── Overlay/
│   ├── Summary/
│   └── Controls/
│
├── db/
│   └── database.ts
│
├── hooks/
├── styles/
├── types/
└── utils/
```

## 23. Real-Time Processing Lifecycle

```text
User opens video
    |
    v
Detect hardware
    |
    v
Initialize AI workers
    |
    v
Capture transcript/audio
    |
    v
Generate transcript chunk
    |
    v
Generate chunk summary
    |
    v
Merge into rolling summary
    |
    v
Update overlay UI
    |
    v
Optional manual save
```

## 24. Failure Handling

### Whisper Failure

Fallback:

- Official captions

### WebGPU Failure

Fallback:

- WASM backend

### Model Load Failure

Show:

- AI unavailable

## 25. Security & Privacy

### Privacy Model

Everything remains local:

- No backend
- No telemetry
- No analytics

### Chrome Store Advantages

This greatly simplifies:

- Privacy disclosures
- Compliance
- Permissions review

## 26. MVP Performance Targets

| Metric               | Target      |
| -------------------- | ----------- |
| Overlay load         | <1s         |
| First summary        | <20s        |
| Summary updates      | Every chunk |
| Main-thread blocking | None        |
| Memory growth        | Bounded     |

## 27. Risks & Constraints

### Biggest Technical Risks

#### 1. Browser Audio Access

Capturing YouTube audio robustly can be tricky.

Mitigation:

- Fallback captions pipeline

#### 2. In-browser Whisper Performance

Large models may struggle.

Mitigation:

- Aggressive tiering
- Quantized models

#### 3. Memory Pressure

Long videos may exhaust memory.

Mitigation:

- Rolling context windows

## 28. Recommended MVP Implementation Order

### Phase 1

- CRXJS setup
- Content script
- Shadow DOM injection
- React overlay

### Phase 2

- YouTube detection
- Transcript extraction from captions

### Phase 3

- Local summarization worker

### Phase 4

- Whisper transcription worker

### Phase 5

- IndexedDB persistence

### Phase 6

- Hardware-aware model selection

## 29. Future Expansion (Post-MVP)

Architecture already supports:

- AI chat
- Semantic search
- Vector embeddings
- Cloud acceleration
- Cross-device sync
- Transcript export
- Multilingual support
- Chapter generation

## 30. Recommended MVP Success Criteria

MVP is successful if:

- Extension loads reliably on YouTube
- Summaries update live
- No noticeable UI lag
- Works entirely offline after model download
- Saved summaries persist correctly
- Low-end devices gracefully fallback to captions

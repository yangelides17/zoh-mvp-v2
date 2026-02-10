# zoh-mvp-v2 - Unified Fragment Feed

A TikTok/Instagram Reels-style vertical scroll feed for browsing labeled web fragments.

## Overview

This application displays labeled web fragments (articles, videos, products, comments, etc.) extracted and classified by the ML training system in a unified, scrollable feed interface.

## Architecture

```
┌─────────────────────────────────────────┐
│     React Frontend (Port 3001)          │
│  - TikTok-style vertical scroll         │
│  - Fragment cards with screenshots      │
│  - Infinite scroll pagination           │
└──────────────┬──────────────────────────┘
               │ HTTP
               ↓
┌─────────────────────────────────────────┐
│  Flask Backend (Port 5001)               │
│  - Feed API (/api/feed/*)                │
│  - On-demand screenshot cropping         │
└──────────────┬──────────────────────────┘
               │ SQL
               ↓
┌─────────────────────────────────────────┐
│       PostgreSQL Database                │
│  - ml_fragment_labels                    │
│  - ml_pages (screenshots)                │
└─────────────────────────────────────────┘
```

## Features

### Current (MVP)
- ✅ Vertical scroll feed with snap scrolling
- ✅ Cropped fragment screenshots (generated on-demand)
- ✅ Archetype badges and metadata display
- ✅ Infinite scroll pagination
- ✅ Keyboard navigation (↑/↓ arrows, J/K keys)
- ✅ Click to open source URL in new tab
- ✅ Lazy image loading with placeholders
- ✅ Mobile responsive design

### Future
- Scroll to fragment position on source page
- Archetype filtering
- Interactive fragments (play videos, read articles in-feed)
- User preferences and saved fragments
- Ranking/recommendation algorithm
- Real-time extraction from curated URLs

## Quick Start

### Prerequisites
- Backend Flask server running on port 5001
- PostgreSQL database with labeled fragments
- Node.js and npm installed

### Development

1. **Start Backend** (if not already running)
   ```bash
   cd /path/to/vector-graph-database-2
   python ml_training/labeling_app.py
   ```
   Backend runs on: http://localhost:5001

2. **Start Frontend**
   ```bash
   cd /path/to/zoh-mvp-v2
   PORT=3001 npm start
   ```
   Frontend runs on: http://localhost:3001

3. **Open Browser**
   Navigate to: http://localhost:3001

### Both Frontends Simultaneously
- **Labeling UI**: http://localhost:3000
- **Fragment Feed**: http://localhost:3001
- **Backend API**: http://localhost:5001

## Project Structure

```
zoh-mvp-v2/
├── src/
│   ├── components/
│   │   └── Feed/
│   │       ├── Feed.jsx              # Main feed container
│   │       ├── FragmentCard.jsx      # Individual fragment card
│   │       └── FragmentImage.jsx     # Lazy-loaded image
│   ├── hooks/
│   │   └── useFeedData.js            # Data fetching & pagination
│   ├── services/
│   │   └── api.js                    # API client
│   ├── styles/
│   │   └── Feed.css                  # TikTok-style layout
│   ├── App.js                        # Root component
│   └── index.js                      # Entry point
├── package.json
├── .env                              # API_URL configuration
└── README.md
```

## Backend API Endpoints

### GET /api/feed/fragments
Fetch paginated list of fragments
- **Query Params:**
  - `limit` (int): Number to return (default: 20, max: 100)
  - `cursor` (string): Fragment ID for pagination
- **Filters:**
  - Only `human_approved=true` fragments
  - Minimum bbox area: 10,000 pixels
  - Must have screenshot available
- **Response:**
  ```json
  {
    "fragments": [{
      "fragment_id": "uuid",
      "archetype": "video_card",
      "domain": "youtube.com",
      "url": "https://...",
      "bbox": {"x": 0, "y": 0, "width": 300, "height": 200},
      "has_screenshot": true
    }],
    "next_cursor": "uuid",
    "has_more": true
  }
  ```

### GET /api/feed/fragment/:id/screenshot
Get cropped screenshot for a fragment
- **Returns:** PNG image bytes
- **Processing:**
  1. Fetch full page screenshot (R2 or BYTEA)
  2. Get fragment bounding box
  3. Crop image using PIL
  4. Return PNG (no caching)
- **Error:** 404 if screenshot unavailable

### GET /api/feed/fragment/:id/metadata
Get detailed fragment metadata
- **Returns:** JSON with full fragment details

### GET /api/feed/health
Health check endpoint

## Keyboard Shortcuts

- **↑ / K**: Scroll to previous fragment
- **↓ / J**: Scroll to next fragment
- **R**: Refresh feed

## Configuration

### Environment Variables (.env)
```
REACT_APP_API_URL=http://localhost:5001
```

### Port Configuration (package.json)
```json
"proxy": "http://localhost:5001"
```

To change port:
```bash
PORT=3001 npm start
```

## Backend Implementation

### New Files Created
1. **ml_training/api/feed_routes.py**
   - Feed API endpoints
   - Separate from labeling API for organization

2. **ml_training/services/fragment_screenshot_service.py**
   - On-demand screenshot cropping
   - Handles R2 and BYTEA storage
   - Computes fragment bboxes from candidates

### Modified Files
1. **ml_training/labeling_app.py**
   - Registered `feed_bp` blueprint

## Database Schema

### Key Tables
- **ml_fragment_labels**: Labeled fragments
  - `id`, `page_id`, `bbox`, `label_metadata->>'archetype_name'`

- **ml_pages**: Page data and screenshots
  - `page_id`, `url`, `domain`, `screenshot_r2_key`, `full_page_screenshot`

- **ml_candidates**: DOM nodes (for bbox computation)
  - `page_id`, `node_index`, `bbox`

## Performance Notes

### Screenshot Generation
- **On-demand**: No pre-processing required
- **No caching**: Simpler implementation, evaluate performance first
- **Lazy loading**: Only loads images in viewport
- **Future optimization**: Add caching if needed

### Pagination
- **Cursor-based**: Uses fragment ID for stable pagination
- **Batch size**: 20 fragments per request
- **Infinite scroll**: Loads more at 80% scroll

## Troubleshooting

### Port Already in Use
If port 3001 is taken, use a different port:
```bash
PORT=3002 npm start
```

### Backend Not Running
Ensure Flask backend is running on port 5001:
```bash
curl http://localhost:5001/api/feed/health
```

### No Fragments Loading
Check database has labeled fragments:
```sql
SELECT COUNT(*) FROM ml_fragment_labels WHERE human_approved = true;
```

### Screenshot Not Loading
- Check backend logs for errors
- Verify page has screenshot (R2 or BYTEA)
- Check fragment bbox is valid

## Development

### Install Dependencies
```bash
npm install
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

## Tech Stack

- **Frontend**: React 19, Axios, CSS3
- **Backend**: Flask, PIL/Pillow, PostgreSQL
- **Storage**: Cloudflare R2, PostgreSQL BYTEA
- **Styling**: TikTok-inspired vertical scroll with snap

## Contributing

When adding features:
1. Update this README
2. Test on both desktop and mobile
3. Ensure keyboard shortcuts work
4. Check performance with large datasets

## License

MIT

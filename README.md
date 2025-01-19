# TRD Blinkenlights

A system monitoring dashboard built with SvelteKit, featuring real-time updates via MQTT for tracking active calls, system status, and recording activities.

## Tech Stack

- **Frontend Framework**: SvelteKit 2.x with Svelte 5
- **Styling**: Tailwind CSS
- **Real-time Communication**: MQTT
- **Charting**: uPlot
- **Build Tool**: Vite

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Python 3.8+ for Crisper API service
- CUDA-capable GPU recommended (but not required)

## Installation

### Frontend Setup
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install
```

### Crisper API Service Setup

The transcription service uses [CrisperWhisper](https://github.com/nyrahealth/CrisperWhisper) for speech-to-text functionality.

```bash
# Clone the CrisperWhisper repository
git clone https://github.com/nyrahealth/CrisperWhisper.git

# Create and activate Python virtual environment
cd CrisperWhisper
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the API service (development)
python api.py
```

The API service will run on `http://localhost:8001`. It requires a model path to be provided when making transcription requests. The service supports both CPU and GPU (CUDA) execution, with GPU recommended for better performance.

Note: The model files are not included in the repository. You'll need to provide the path to your model when making transcription requests through the API.

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ActiveCalls.svelte    # Active calls monitoring
│   │   ├── Recorders.svelte      # Recording system status
│   │   ├── StatusDots.svelte     # Header status indicators
│   │   ├── SystemOverview.svelte # System status dashboard
│   │   ├── ThemeToggle.svelte    # Dark/light mode toggle
│   │   └── TranscriptionDisplay.svelte # Transcription display component
│   ├── server/
│   │   ├── state.svelte.js       # Server-side state management
│   │   └── transcription.js      # Transcription processing logic
│   └── stores/
│       └── theme.js              # Theme management store
├── routes/
│   ├── +layout.svelte           # Root layout
│   ├── +page.server.js          # Server-side logic
│   ├── +page.svelte            # Main page component
│   └── flag-call/
│       └── +server.js           # Flagged call endpoint
└── app.html                     # HTML template
```

## Features

- Real-time system monitoring with live status indicators
- Active calls tracking and visualization
- Recording system status with state indicators and material design-inspired UI
- Numerically ordered recorder cards for consistent display
- System overview dashboard with real-time charts
- MQTT-based real-time updates
- Dark/light mode support
- Real-time transcription display and processing
- Flagged call handling and endpoint
- Comprehensive testing suite for transcription functionality

## Development Notes

- The project uses SvelteKit's node adapter for deployment
- Tailwind CSS is configured for styling
- MQTT is used for real-time data updates
- uPlot provides efficient data visualization
- Status indicators show real-time recorder states
- Server hooks for initialization and configuration
- Theme management through centralized store

## License

MIT License - See [LICENSE](LICENSE) file for details

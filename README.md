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

## Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install
```

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
│   │   └── ThemeToggle.svelte    # Dark/light mode toggle
│   └── server/
│       └── state.svelte.js       # Server-side state management
├── routes/
│   ├── +layout.svelte           # Root layout
│   ├── +page.server.js          # Server-side logic
│   └── +page.svelte            # Main page component
└── app.html                     # HTML template
```

## Features

- Real-time system monitoring with live status indicators
- Active calls tracking and visualization
- Recording system status with state indicators
- System overview dashboard with real-time charts
- MQTT-based real-time updates
- Dark/light mode support

## Development Notes

- The project uses SvelteKit's node adapter for deployment
- Tailwind CSS is configured for styling
- MQTT is used for real-time data updates
- uPlot provides efficient data visualization
- Status indicators show real-time recorder states

## License

MIT License - See [LICENSE](LICENSE) file for details

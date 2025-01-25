# Crisper Whisper Development Setup Guide

This guide details the setup process for the Crisper Whisper transcription system.

## Prerequisites

- Python 3.x
- Node.js and npm (for the frontend)
- Git
- CUDA-compatible GPU (recommended for better performance)

## Python Dependencies

The backend requires the following specific package versions:
```
fastapi==0.109.2
uvicorn==0.27.1
pydantic==2.6.1
numpy==1.26.3
torch==2.1.2
torchaudio==2.1.2
scipy==1.12.0
transformers==4.37.2
python-multipart==0.0.6
librosa==0.10.1
```

## Project Structure

The project consists of two main components:
1. CrisperWhisper - The Python backend API service
2. Frontend - A Svelte-based web interface

## Backend Setup (CrisperWhisper)

1. Set up the Python virtual environment:
```bash
cd CrisperWhisper
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

2. Install required Python packages:
```bash
pip install -r requirements.txt
```

3. Model Setup:
   - The model is stored in the `crisper-model` directory at the project root
   - Ensure the model files are present in this directory
   - The model directory should be one level up from the CrisperWhisper directory when running the API

4. Running the Backend:
```bash
cd CrisperWhisper
source venv/bin/activate  # On Windows use: venv\Scripts\activate
python3 api.py --model_id ../crisper-model
```

## Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Development server:
```bash
npm run dev
```

## Running the Complete System

1. Start the backend (in one terminal):
```bash
cd CrisperWhisper
source venv/bin/activate
python3 api.py --model_id ../crisper-model
```

2. Start the frontend (in another terminal):
```bash
npm run dev
```

3. Access the application at `http://localhost:5173` (or the port shown in your terminal)

## Important Notes

- Always ensure the Python virtual environment is activated when running the backend
- The model path (`../crisper-model`) is relative to the CrisperWhisper directory
- Keep both the backend and frontend running simultaneously for full functionality
- The backend API must be running for transcription features to work

## Troubleshooting

1. If the model fails to load:
   - Verify the model directory path is correct
   - Ensure all model files are present in the crisper-model directory
   - Check Python virtual environment is activated

2. If the frontend can't connect to the backend:
   - Verify the backend is running and accessible
   - Check the API endpoint configuration in the frontend
   - Ensure no firewall rules are blocking the connection

## Development Workflow

1. Backend Development:
   - Work within the CrisperWhisper directory
   - Always use the virtual environment
   - Test API endpoints using tools like curl or Postman

2. Frontend Development:
   - Modify Svelte components in the src directory
   - Use the development server for hot-reloading
   - Check the browser console for errors

## Integration Architecture

The frontend application interfaces with CrisperWhisper through a sophisticated integration layer:

1. Audio Processing Flow:
   - Audio data is received in base64-encoded WAV format
   - The frontend converts this to binary data using `Uint8Array`
   - A request is prepared with specific configuration parameters:
     ```javascript
     {
       audio: base64_audio_data,
       model_path: config.whisper.modelPath,
       model_name: config.whisper.model,
       output_format: 'verbose_json',
       word_timestamps: true
     }
     ```

2. Transcription Process:
   - Audio is sent to CrisperWhisper's `/transcribe` endpoint
   - The response includes detailed transcription data with:
     - Word-level timestamps
     - Confidence scores
     - Segment information

3. Post-Processing:
   - Transcriptions are cleaned and enhanced through several steps:
     - Removal of duplicate phrases
     - Merging of similar segments
     - Quality metrics calculation
     - Text formatting and normalization

4. State Management:
   - Transcriptions are stored in a Svelte-based state management system
   - Recent calls are tracked with their associated transcriptions
   - Automatic cleanup of old transcriptions based on configuration

## API Endpoints

The backend API provides the following endpoints:

1. Transcription Service:
   - Endpoint: `/transcribe`
   - Method: POST
   - Purpose: Handles audio transcription requests
   - Input: JSON payload with audio data and configuration
   - Output: Detailed JSON response with transcription results

2. Model Status:
   - Endpoint: `/status`
   - Method: GET
   - Purpose: Check if the model is loaded and ready
   - Output: JSON response with model status information

The API runs on `http://localhost:8000` by default when started with uvicorn.

## Configuration

The system uses both environment variables and application configuration:

1. Environment Variables:
   - `MODEL_PATH`: Path to the Whisper model (defaults to command line argument)
   - `PORT`: API server port (defaults to 8000)
   - `HOST`: API server host (defaults to localhost)

2. Frontend Configuration:
   - Whisper Service Settings:
     ```javascript
     whisper: {
       servicePath: 'http://localhost:8000',
       modelPath: '../crisper-model',
       model: 'whisper-large-v3'
     }
     ```
   - System Settings:
     ```javascript
     system: {
       maxRecentCalls: 100,        // Maximum number of recent calls to keep
       callCleanupInterval: 3600000, // Cleanup interval for old calls (1 hour)
       maxRateHistory: 100         // Maximum data points for rate history
     }
     ```

You can set environment variables using a `.env` file in the CrisperWhisper directory, and modify frontend configuration in the `config.js` file.

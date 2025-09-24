# SentryDash : Classroom Capacity Monitoring powered by Azure

SentryDash is a cloud-native system that monitors classroom occupancy across a simulated campus. It uses Azure Monitor and Application Insights for real-time tracking, triggers alerts for capacity breaches, and recommends alternate rooms using predefined metadata.

## Project Structure

```
sentrydash-prototype/
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── Dockerfile
├── .dockerignore
├── index.js
└── data/
    └── rooms.json
```

## Setup

1. Clone the repo:

```
git clone https://github.com/<username>/sentrydash-prototype.git
cd sentrydash-prototype
```

2. Install dependencies:

```
npm install
```

3. Configure `.env`:

```
APPINSIGHTS_CONNECTION_STRING=<your_connection_string>
PORT=3000
```

## Run Locally

```
node index.js
```

Access: `http://localhost:3000`

## Docker

Build image:

```
docker build -t sentrydash-prototype:1.0 .
```

Run container:

```
docker run -p 3000:3000 -e APPINSIGHTS_CONNECTION_STRING="<your_connection_string>" -e PORT=3000 -v ${PWD}/data:/app/data sentrydash-prototype:1.0
```

## API Endpoints

* `GET /health` → Health check
* `GET /` → Home route
* `GET /api/rooms` → List all rooms
* `GET /api/room/:id` → Get single room
* `POST /api/entry` → Mark entry/exit
* `POST /api/suggest` → Suggest alternate room if over capacity

## Notes

* `rooms.json` persists changes via Docker volume
* App Insights logs requests and metrics
* Phase 1 focuses on **backend, telemetry, and Docker**

## Next Steps

* Terraform + Azure deployment
* CI/CD pipeline
* Advanced room suggestion logic
* GenAI integration

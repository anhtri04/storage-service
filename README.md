# Smart Storage Service

A full-stack application for efficient file storage and retrieval, featuring chunked uploads and S3 integration.

## 🚀 Tech Stack

- **Backend:** Java 21, Spring Boot, PostgreSQL, AWS S3
- **Frontend:** React, TypeScript, Vite
- **Infrastructure:** Docker (for PostgreSQL)

## 🛠️ Getting Started

### 1. Database Setup
Navigate to the `storage-service` directory and start the database:
```bash
cd storage-service
docker-compose up -d
```

### 2. Backend Configuration
Create a `.env` file in `storage-service` with the following:
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket
```

Run the backend:
```bash
./mvnw spring-boot:run
```

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.
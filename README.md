# 📦 Backend for LuxAI Chat

Backend for the app [LuxAI Chat](https://github.com/TIC-13/rag-chat). Right now, it only stores reported conversations sent by the users.

## 🛠️ Tech Stack

* **Node.js** / **Express.js**
* **TypeScript**
* **Prisma** (ORM)
* **SQLite** (default DB, can be changed)
* **Yarn** for package management


## 📦 Installation & Setup

1. **Clone the repo**:

   Clone the repo and navigate to the cloned folder.

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Create a MYSQL database**:

    Create a MYSQL database that will be connected to the app.

4. **Set up environment**:
   Create a `.env` file, replacing the placeholders in uppercase with your database information:

   ```env
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
   ```

4. **Initialize Prisma & DB**:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the server**:

   ```bash
   yarn dev
   ```

6. **(Optional) Deploy for production using pm2**
   If you want to run the application using `pm2` there's a bash script called `deploy_pm2.sh` that does just that. 

---

## 📮 API Endpoints

### `GET /health`

**Description**: Health check of the server

**Response**:

```json
{
  "status": "OK",
  "timestamp": "2025-07-01T12:00:00.000Z",
  "uptime": 42.345
}
```

---

### `GET /reports`

**Description**: Fetch all reports (most recent first)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "Some report text",
      "createdAt": "2025-07-01T12:34:56.000Z"
    }
  ],
  "count": 1
}
```

---

### `POST /reports`

**Description**: Create a new report

**Body**:

```json
{
  "content": "This is a report string"
}
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "content": "This is a report string",
    "createdAt": "2025-07-01T13:00:00.000Z"
  },
  "message": "Report created successfully"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Content is required and must be a string"
}
```

## Running in Production Using Docker

You can run this project in production using Docker.

1. **Start the MySQL database container:**

   ```bash
   docker compose up db
   ```

   You can configure the container using environment variables in the `.env` file:

   * `DOCKER_MYSQL_ROOT_PASSWORD`: Password for the root user (default: `root`)
   * `DOCKER_MYSQL_USER`: Database user (default: `user`)
   * `DOCKER_DB_VOLUME_PATH`: Path for the database volume (default: named volume `ranking_db_data`)
   * `DOCKER_DB_BACKUP_FILE_TO_CONSUME`: Path to a backup file to initialize the database with, if any. When provided, the database will start with the backup data.
   * `ENABLE_BACKUP`: If the database container should do backup in the BACKUP_PATH
   * `DOCKER_DB_BACKUP_PATH`: Path to store the backup if ENABLE_BACKUP is true (default: `./backup`)`
   * `BACKUP_INTERVAL`: Interval to do the backup (default: 86400 seconds, or one day)

2. **Start the API container:**

   ```bash
   docker compose up app
   ```

   Environment variables you can set in `.env`:

   * `DOCKER_BACK_PORT_EXPOSED`: Port on the host machine to access the API (default: `3030`)
   * `PORT`: Port where the API will run inside the container (and outside, if run without Docker) (default: `3030`)

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

--

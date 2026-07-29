# Calendar Feature — Backend Endpoints

> Send to backend team for alignment.

---

## Events

### `GET /calendar/events?from=&to=&type=`

**Purpose**: Fetch calendar events within a date range.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `string` (date) | Yes | Start date (YYYY-MM-DD) |
| `to` | `string` (date) | Yes | End date (YYYY-MM-DD) |
| `type` | `string` | No | Filter by event type |

**Response `200`**:
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "date": "2026-03-15",
      "type": "EVENT | EXAM | MEETING | SPORTS",
      "audience": "ALL | TEACHERS | PARENTS | STAFF",
      "createdBy": { "id": "uuid", "name": "string" }
    }
  ]
}
```

---

### `POST /calendar/events`

**Purpose**: Create a new calendar event.

**Payload**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "date": "YYYY-MM-DD (required)",
  "type": "EVENT | EXAM | MEETING | SPORTS (required)",
  "audience": "ALL | TEACHERS | PARENTS | STAFF (required)"
}
```

**Response `201`**: Returns the created event object (with server-generated `id`).

---

### `PATCH /calendar/events/:id`

**Purpose**: Update an existing event. All fields optional.

**Payload**: Same shape as POST, all fields optional.

**Response `200`**: Returns the updated event object.

---

### `DELETE /calendar/events/:id`

**Purpose**: Delete an event.

**Response `200`**: `{ "message": "Event deleted" }`

---

## Holidays

### `GET /holidays?from=&to=`

**Purpose**: Fetch holidays within a date range.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `string` (date) | Yes | Start date (YYYY-MM-DD) |
| `to` | `string` (date) | Yes | End date (YYYY-MM-DD) |

**Response `200`**:
```json
{
  "holidays": [
    {
      "id": "uuid",
      "date": "2026-03-15",
      "reason": "string",
      "createdBy": "uuid"
    }
  ]
}
```

---

### `POST /holidays`

**Purpose**: Mark a date as a holiday.

**Payload**:
```json
{
  "date": "YYYY-MM-DD (required)",
  "reason": "string (required)"
}
```

**Response `201`**: Returns the created holiday object (with server-generated `id`).

---

### `DELETE /holidays/:id`

**Purpose**: Remove a holiday.

**Response `200`**: `{ "message": "Holiday removed" }`

---

## Academic Terms

### `GET /academic-terms`

**Purpose**: Fetch all academic terms for the school.

**Response `200`**:
```json
{
  "terms": [
    {
      "id": "uuid",
      "term": "first | second | third",
      "session": "2024/2025",
      "startDate": "2024-09-01",
      "endDate": "2025-01-15",
      "isCurrent": false
    }
  ]
}
```

---

### `POST /academic-terms`

**Purpose**: Create a new academic term.

**Payload**:
```json
{
  "term": "first | second | third (required)",
  "session": "2024/2025 (required)",
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD (required)"
}
```

**Response `201`**: Returns the created term object (with server-generated `id`).

---

### `PATCH /academic-terms/:id`

**Purpose**: Update an academic term. **All fields should be editable**.

**Payload**:
```json
{
  "term": "first | second | third (optional)",
  "session": "2024/2025 (optional)",
  "startDate": "YYYY-MM-DD (optional)",
  "endDate": "YYYY-MM-DD (optional)"
}
```

**Response `200`**: Returns the updated term object with all fields.

> **IMPORTANT**: The frontend sends ALL edited fields (term, session, startDate, endDate). The backend MUST accept and persist all of them. If any field is ignored, the response will have stale data and the sync context will overwrite the local cache.

---

### `POST /academic-terms/:id/set-current`

**Purpose**: Set a term as the active/current term. This should unset any previously current term.

**Payload**: `{}` (empty object)

**Response `200`**: `{ "message": "Current term updated" }`

> **Preferred**: Return the full updated terms array so the frontend can sync the `isCurrent` state for all terms.

---

### `DELETE /academic-terms/:id`

**Purpose**: Delete an academic term.

**Response `200`**: `{ "message": "Term removed" }`

---

## Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/calendar/events` | List events by date range |
| `POST` | `/calendar/events` | Create event |
| `PATCH` | `/calendar/events/:id` | Update event |
| `DELETE` | `/calendar/events/:id` | Delete event |
| `GET` | `/holidays` | List holidays by date range |
| `POST` | `/holidays` | Create holiday |
| `DELETE` | `/holidays/:id` | Delete holiday |
| `GET` | `/academic-terms` | List all terms |
| `POST` | `/academic-terms` | Create term |
| `PATCH` | `/academic-terms/:id` | Update term (all fields) |
| `POST` | `/academic-terms/:id/set-current` | Set active term |
| `DELETE` | `/academic-terms/:id` | Delete term |

Content-Type: application/json
Cache-Control: no-cache
X-RateLimit-Limit: 60
X-RateLimit-Remaining: [remaining requests]
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": 2,
      "code": "WELCOME50",
      "description": "Welcome Bonus for New Users",
      "bonusAmount": "$50",
      "requiredWager": "$500",
      "totalClaims": 100,
      "currentClaims": 0,
      "createdAt": "2025-02-13T02:43:46.024Z",
      "updatedAt": "2025-02-13T02:43:46.024Z",
      "expiresAt": "2025-02-20T02:43:46.024Z",
      "status": "active",
      "source": "web",
      "createdBy": 1
    }
  ],
  "_meta": {
    "timestamp": "2025-02-13T04:13:26.821Z",
    "filters": {
      "status": "active",
      "expiresAfter": "2025-02-13T04:13:26.821Z"
    }
  }
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "status": "error",
  "message": "Failed to fetch bonus codes",
  "error": "Error details"
}
```

## Admin Endpoints

### GET /api/admin/bonus-codes
Retrieves all bonus codes (requires admin authentication).

**Authentication:**
- Requires valid JWT token in Authorization header
- Admin privileges required

**Success Response (200 OK):**
```json
[
  {
    "id": 2,
    "code": "WELCOME50",
    "description": "Welcome Bonus for New Users",
    "bonusAmount": "$50",
    "requiredWager": "$500",
    "totalClaims": 100,
    "currentClaims": 0,
    "createdAt": "2025-02-13T02:43:46.024Z",
    "updatedAt": "2025-02-13T02:43:46.024Z",
    "expiresAt": "2025-02-20T02:43:46.024Z",
    "status": "active",
    "source": "web",
    "createdBy": 1
  }
]
```

### POST /api/admin/bonus-codes
Creates a new bonus code (requires admin authentication).

**Request Body:**
```json
{
  "code": "WELCOME50",
  "description": "Welcome Bonus for New Users",
  "bonusAmount": "$50",
  "requiredWager": "$500",
  "totalClaims": 100,
  "expiresAt": "2025-02-20T02:43:46.024Z",
  "source": "web"
}
```

**Success Response (201 Created):**
```json
{
  "id": 2,
  "code": "WELCOME50",
  "description": "Welcome Bonus for New Users",
  "bonusAmount": "$50",
  "requiredWager": "$500",
  "totalClaims": 100,
  "currentClaims": 0,
  "createdAt": "2025-02-13T02:43:46.024Z",
  "updatedAt": "2025-02-13T02:43:46.024Z",
  "expiresAt": "2025-02-20T02:43:46.024Z",
  "status": "active",
  "source": "web",
  "createdBy": 1
}
```

### PUT /api/admin/bonus-codes/:id
Updates an existing bonus code (requires admin authentication).

**Request Body:**
```json
{
  "description": "Updated description",
  "bonusAmount": "$75",
  "requiredWager": "$750",
  "totalClaims": 150,
  "expiresAt": "2025-02-25T00:00:00.000Z",
  "status": "active"
}
```

**Success Response (200 OK):**
```json
{
  "id": 2,
  "code": "WELCOME50",
  "description": "Updated description",
  "bonusAmount": "$75",
  "requiredWager": "$750",
  "totalClaims": 150,
  "currentClaims": 0,
  "createdAt": "2025-02-13T02:43:46.024Z",
  "updatedAt": "2025-02-13T04:17:03.402Z",
  "expiresAt": "2025-02-25T00:00:00.000Z",
  "status": "active",
  "source": "web",
  "createdBy": 1
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Bonus code not found"
}
```

### DELETE /api/admin/bonus-codes/:id
Deactivates a bonus code (requires admin authentication).

**Success Response (200 OK):**
```json
{
  "message": "Bonus code deactivated successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Bonus code not found"
}
```

## Integration Testing

### Test Cases:
1. Public endpoint:
   ```bash
   # Test public endpoint
   curl http://localhost:5000/api/bonus-codes

   # Expected: Returns active, non-expired bonus codes
   ```

2. Admin endpoints (requires admin token):
   ```bash
   # Get admin test token (development only)
   TOKEN=$(curl http://localhost:5000/api/test-token | jq -r .token)

   # Test admin endpoints
   curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/bonus-codes

   # Create new bonus code
   curl -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"code":"TEST100","description":"Test Bonus","bonusAmount":"$100","totalClaims":50,"expiresAt":"2025-03-01T00:00:00.000Z"}' \
        http://localhost:5000/api/admin/bonus-codes
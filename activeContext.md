# API Logic Cleanup Plan

## Current Issues

1. **API Configuration Issues**:
   - API_CONFIG contains invalid/unused endpoints
   - Only the leaderboard endpoint (/user2/affiliate/referral-leaderboard/2RW440E) and health endpoint (/health) are valid

2. **Inconsistent API Access Methods**:
   - Some code uses direct fetch calls
   - References to an ApiService class exist but the implementation appears to be missing

3. **Error Handling Problems**:
   - Current errors show "affiliateStats is not defined"
   - Insufficient error handling for API requests

4. **Data Storage and Transformation**:
   - External API data needs to be properly transformed and stored in our database
   - Schema mismatch between external API response and our database structure

## Action Plan

### 1. Simplify API Configuration

- Update API_CONFIG to only include valid endpoints:
  - Leaderboard: "/user2/affiliate/referral-leaderboard/2RW440E"
  - Health: "/health"
- Remove invalid/unused endpoints like wagerRace and userProfile

### 2. Implement Consistent API Access

- Create a simple but effective api-service.ts utility to handle:
  - Fetching data from the Goated API with proper error handling
  - Token management for authentication
  - Response validation and transformation

### 3. Fix Backend Routes

- Update /api/affiliate/stats endpoint to:
  - Properly fetch data from Goated API
  - Transform external API data to our expected format
  - Fix the "affiliateStats is not defined" error
  - Implement proper error handling

### 4. Ensure Data Synchronization

- Implement or fix the syncLeaderboardData function to:
  - Store transformed API data in our database
  - Update relevant tables (users, affiliateStats, wagerRaces, etc.)

### 5. Clean Up Unused Code

- Remove any mock data implementations
- Eliminate redundant or unused code paths

## Technical Details

### API Data Flow

1. External API Request:
   ```
   GET https://api.goated.com/user2/affiliate/referral-leaderboard/2RW440E
   Headers: 
     - Authorization: Bearer {GOATED_API_TOKEN}
     - Content-Type: application/json
   ```

2. Response Structure:
   ```json
   {
     "data": {
       "today": { 
         "data": [
           {
             "uid": "string",
             "name": "string",
             "wagered": {
               "today": number,
               "this_week": number,
               "this_month": number,
               "all_time": number
             }
           }
         ]
       },
       "weekly": { "data": [...] },
       "monthly": { "data": [...] },
       "all_time": { "data": [...] }
     }
   }
   ```

3. Transform and Store:
   - Store data in affiliateStats table
   - Update users table with profile information
   - Update wagerRaces and wagerRaceParticipants as needed

### Database Tables Used

- users
- affiliateStats
- wagerRaces
- wagerRaceParticipants
- notificationPreferences
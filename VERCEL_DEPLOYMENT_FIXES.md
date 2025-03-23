# Vercel Deployment Fixes

This document outlines the fixes implemented to resolve deployment issues on Vercel.

## Issue: 404 NOT_FOUND Error After Deployment

The application was successfully building on Vercel but returning a 404 NOT_FOUND error when accessing the deployed site.

### Root Causes:

1. **Incomplete Build Process**:
   - The `vercel-build` script in `package.json` was only building the client-side code
   - The server-side code was not being built or included in the deployment

2. **Incorrect Server Route Configuration**:
   - The API routes in `vercel.json` were pointing to `server/index.js` instead of the built server file in the `dist` directory

### Implemented Fixes:

1. **Updated Build Command**:
   - Changed the build command in `vercel.json` from `npm run vercel-build` to `npm run build`
   - This ensures both client-side and server-side code are built during deployment

2. **Fixed API Route Destination**:
   - Updated the API route destination in `vercel.json` from `server/index.js` to `dist/index.js`
   - This points to the correct path where the server code is built

## Vercel Configuration Details

The updated `vercel.json` file now contains:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": { 
        "buildCommand": "npm run build"
      }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "dist/index.js" },
    { "src": "/(.*)", "dest": "dist/public/index.html" }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"]
}
```

## Deployment Process

The deployment process now:

1. Runs `npm run build` which includes:
   - `build:client`: Builds the React frontend with Vite
   - `build:server`: Bundles the server code with esbuild

2. Correctly routes:
   - API requests to the built server file
   - All other requests to the frontend entry point

## Notes for Future Deployments

- Always ensure both client and server code are built for full-stack applications
- Verify that route destinations in `vercel.json` match the actual paths of built files
- Remember that Vercel uses a case-sensitive file system, so file paths must exactly match

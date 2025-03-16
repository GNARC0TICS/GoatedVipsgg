# GoatedVIPs Telegram Bot

## Overview
The GoatedVIPs Telegram Bot is an advanced bot designed for managing affiliate marketing and user engagement. It provides real-time statistics, user verification, and community management features.

## Core Features

### User Management
- User verification system
- Stats tracking and reporting
- Race position monitoring
- Leaderboard integration
- Custom notifications

### Admin Capabilities
- Admin panel with inline controls
- User verification management
- Broadcast messaging
- Channel forwarding
- Group message control
- User statistics access
- Moderation commands (/mute, /warn, /ban, /bootfuck)

### Security Features
- Rate limiting (5 requests per user within 10 seconds)
- Command cooldowns (3 seconds between commands)
- Admin privilege system
- Secure verification process
- Group access control

## Technical Details

### Database Schema
The bot utilizes PostgreSQL with the following main tables:
- telegram_users: Stores user information and verification status
- verification_requests: Manages verification process
- challenges: Handles user challenges and competitions
- challenge_entries: Tracks challenge participation

### Communication Methods
- Polling-based updates
- Real-time message forwarding
- Group and private chat handling
- Channel message management

### Security Measures
- Rate limiting: 5 requests per user within 10 seconds
- Group cooldown: 2 seconds between group commands
- Admin verification checks
- Secure environment variable handling

## Available Commands

### User Commands
- `/start` - Initialize bot interaction
- `/verify` - Begin account verification
- `/stats` - Check wager statistics
- `/race` - View race position
- `/leaderboard` - See top players
- `/play` - Get affiliate link
- `/website` - Visit main website
- `/help` - View command list

### Admin Commands
- `/adminpanel` - Open admin control panel
- `/broadcast` - Send message to all users
- `/group_message` - Send to specific group
- `/pending` - View verification requests
- `/verify_user` - Approve verification
- `/reject_user` - Reject verification
- `/makeadmin` - Grant admin privileges
- `/setup_forwarding` - Configure channel forwarding
- `/stop_forwarding` - Disable forwarding
- `/list_forwardings` - View active forwards

### Moderation Commands
- `/mute @username duration` - Temporarily mute user
- `/warn @username reason` - Issue warning to user
- `/ban @username reason` - Ban user from group
- `/bootfuck @username` - Remove user from group

## Environment Variables
- `TELEGRAM_BOT_TOKEN` - Bot API token
- `ALLOWED_GROUP_IDS` - Authorized group IDs
- `DATABASE_URL` - PostgreSQL connection string

## Integration Points
- Goated.com API integration
- PostgreSQL database
- Express.js backend
- React frontend dashboard

## Error Handling
- Comprehensive error logging
- Graceful shutdown handling
- Database connection management
- API request error handling

## Custom Stickers/Emojis
The bot uses a custom Goated logo sticker (ID: 5956308779791291440) for certain interactions, with fallback to standard emojis when needed:
- ✅ Success
- ⚠️ Warning
- ❌ Error
- 🐐 Goated (fallback)
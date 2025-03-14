
# GoatedVIPs Telegram Bot Command Checklist

Use this checklist to systematically verify all Telegram bot commands are working properly.

## Testing Prerequisites
- Bot must be running
- Telegram token must be valid
- Database must be properly configured
- Commands must be registered with BotFather

## User Commands

| Command | Description | Expected Behavior | Working? |
|---------|-------------|-------------------|----------|
| `/start` | Initialize bot | Welcome message with instructions | [ ] |
| `/verify` | Begin verification | Prompt user for verification details | [ ] |
| `/stats` | View statistics | Display user's wager statistics | [ ] |
| `/check_stats <username>` | Check user stats | Display stats for the specified user | [ ] |
| `/race` | View race position | Show user's position in current wager race | [ ] |
| `/leaderboard` | See top players | Display leaderboard of top players | [ ] |
| `/play` | Get affiliate link | Provide affiliate link to Goated.com | [ ] |
| `/website` | Visit website | Provide link to GoatedVIPs.gg | [ ] |
| `/help` | View command list | Display list of available commands | [ ] |

## Admin Commands

| Command | Description | Expected Behavior | Working? |
|---------|-------------|-------------------|----------|
| `/adminpanel` | Open admin panel | Display admin control options | [ ] |
| `/broadcast <message>` | Send to all users | Send message to all users | [ ] |
| `/group_message <group> <message>` | Send to specific group | Send message to specified group | [ ] |
| `/pending` | View verification requests | Show pending verification requests | [ ] |
| `/verify_user <username>` | Approve verification | Approve user verification | [ ] |
| `/reject_user <username>` | Reject verification | Reject user verification | [ ] |
| `/makeadmin` | Grant admin privileges | Make user an admin | [ ] |
| `/setup_forwarding` | Configure forwarding | Setup message forwarding | [ ] |
| `/stop_forwarding` | Disable forwarding | Stop message forwarding | [ ] |
| `/list_forwardings` | View active forwards | List active forwarding configurations | [ ] |

## Moderation Commands

| Command | Description | Expected Behavior | Working? |
|---------|-------------|-------------------|----------|
| `/mute @username <duration>` | Mute user | Temporarily mute user in group | [ ] |
| `/warn @username <reason>` | Warn user | Issue warning to user | [ ] |
| `/ban @username <reason>` | Ban user | Ban user from group | [ ] |
| `/bootfuck @username` | Remove user | Remove user from group | [ ] |

## Testing Notes

- For each command, test both valid and invalid inputs
- Check rate limiting functionality
- Verify admin-only commands are restricted to admin users
- Test in both private chats and group chats

## Debugging Tips

1. Check server logs for errors
2. Verify environment variables (TELEGRAM_BOT_TOKEN)
3. Ensure database connectivity
4. Check bot permissions in groups

## How to Use This Checklist

1. Run the verification script: `npm run telegram:verify`
2. Manually test each command in Telegram
3. Mark each command as working or not working
4. Fix any issues found during testing
5. Re-test until all commands work as expected

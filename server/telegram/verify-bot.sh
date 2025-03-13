
#!/bin/bash

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GoatedVIPs Telegram Bot Verification Tool${NC}"
echo "=========================================="

# Check if the bot is running
echo -e "${YELLOW}Step 1: Checking if the bot is running...${NC}"
BOT_PROC=$(ps aux | grep "node.*telegram.*bot" | grep -v grep)

if [ -z "$BOT_PROC" ]; then
  echo -e "${RED}[ERROR] Telegram bot does not appear to be running.${NC}"
  echo -e "${YELLOW}Would you like to start the bot? (y/n)${NC}"
  read -r START_BOT
  
  if [[ $START_BOT == "y" || $START_BOT == "Y" ]]; then
    echo -e "${YELLOW}Starting the bot...${NC}"
    cd ../..
    npm run telegram-bot &
    echo -e "${GREEN}Bot started in background.${NC}"
  else
    echo -e "${RED}Please start the bot and try again.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}[OK] Bot is running!${NC}"
  echo "$BOT_PROC"
fi

echo

# Test commands
echo -e "${YELLOW}Step 2: Verifying bot commands...${NC}"
npx ts-node ./test-commands.ts

echo

# Manual verification list
echo -e "${YELLOW}Step 3: Manual verification checklist${NC}"
echo -e "${BLUE}Please verify the following commands manually in Telegram:${NC}"
echo "-----------------------------------------------"
echo -e "1. ${GREEN}/start${NC} - Bot should respond with welcome message"
echo -e "2. ${GREEN}/verify${NC} - Bot should initiate verification process"
echo -e "3. ${GREEN}/stats${NC} - Bot should display user statistics"
echo -e "4. ${GREEN}/race${NC} - Bot should show race position"
echo -e "5. ${GREEN}/leaderboard${NC} - Bot should display leaderboard"
echo -e "6. ${GREEN}/play${NC} - Bot should provide affiliate link"
echo -e "7. ${GREEN}/website${NC} - Bot should provide website link"
echo -e "8. ${GREEN}/help${NC} - Bot should display help information"
echo
echo -e "${BLUE}Admin commands (for admin users only):${NC}"
echo "-----------------------------------------------"
echo -e "1. ${GREEN}/adminpanel${NC} - Should open admin panel"
echo -e "2. ${GREEN}/broadcast${NC} - Should prompt for broadcast message"
echo -e "3. ${GREEN}/pending${NC} - Should show pending verifications"
echo -e "4. ${GREEN}/verify_user${NC} - Should allow verification approval"
echo -e "5. ${GREEN}/reject_user${NC} - Should allow verification rejection"
echo

echo -e "${YELLOW}Verification complete! Please report any issues found.${NC}"

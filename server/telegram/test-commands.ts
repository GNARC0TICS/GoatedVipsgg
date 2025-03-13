
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { createBot } from './bot';

// Log output colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m"
};

async function testBotCommands() {
  console.log(`${colors.blue}[Test] Starting Telegram bot command testing...${colors.reset}`);
  
  try {
    // Create the bot instance 
    const bot = createBot();
    
    // Get the bot info
    const botInfo = await bot.getMe();
    console.log(`${colors.green}[Test] Bot connected successfully: @${botInfo.username}${colors.reset}`);
    
    // Get the bot commands
    const commands = await bot.getMyCommands();
    
    if (commands.length === 0) {
      console.log(`${colors.red}[Test] No commands registered with BotFather!${colors.reset}`);
      console.log(`${colors.yellow}[Test] Please register commands using /setcommands in BotFather.${colors.reset}`);
    } else {
      console.log(`${colors.green}[Test] Found ${commands.length} registered commands:${colors.reset}`);
      
      commands.forEach(cmd => {
        console.log(`${colors.blue}[Command] /${cmd.command} - ${cmd.description}${colors.reset}`);
      });
      
      // Check if all expected commands are registered
      const expectedCommands = [
        'start', 'verify', 'stats', 'check_stats', 'race', 
        'leaderboard', 'play', 'website', 'help'
      ];
      
      const adminCommands = [
        'adminpanel', 'broadcast', 'group_message', 'pending',
        'verify_user', 'reject_user', 'makeadmin'
      ];
      
      const missingCommands = expectedCommands.filter(
        cmd => !commands.some(c => c.command === cmd)
      );
      
      if (missingCommands.length > 0) {
        console.log(`${colors.yellow}[Test] Missing user commands: ${missingCommands.join(', ')}${colors.reset}`);
      } else {
        console.log(`${colors.green}[Test] All expected user commands are registered.${colors.reset}`);
      }
      
      // Check for admin commands (these might not be registered with BotFather)
      console.log(`${colors.blue}[Test] Admin commands to check manually: ${adminCommands.join(', ')}${colors.reset}`);
    }
    
    console.log(`${colors.green}[Test] Telegram bot command verification completed.${colors.reset}`);
    console.log(`${colors.yellow}[Test] Note: This test only verifies command registration, not functionality.${colors.reset}`);
    console.log(`${colors.yellow}[Test] To test functionality, please use the bot directly in Telegram.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}[Test] Error testing bot commands:${colors.reset}`, error);
  }
}

// Run the test
testBotCommands();

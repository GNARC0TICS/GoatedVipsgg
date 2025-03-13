
import TelegramBot from 'node-telegram-bot-api';
import { createBot } from './bot';

// Usage: npx tsx ./server/telegram/test-specific-command.ts start
// This will simulate a /start command to the bot

async function testSpecificCommand() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx ./server/telegram/test-specific-command.ts <command> [args]');
    console.log('Example: npx tsx ./server/telegram/test-specific-command.ts start');
    console.log('Example: npx tsx ./server/telegram/test-specific-command.ts check_stats username');
    process.exit(1);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1).join(' ');
  
  console.log(`Testing command: /${command} ${commandArgs}`);
  
  try {
    // Create a mock message for testing
    const mockChatId = process.env.TELEGRAM_TEST_CHAT_ID || '123456789'; // Use a real chat ID for testing if available
    const mockMessage: TelegramBot.Message = {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: {
        id: parseInt(mockChatId),
        type: 'private',
        first_name: 'Test',
        last_name: 'User',
      },
      from: {
        id: parseInt(mockChatId),
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'xGoombas', // Use test admin account username
      },
      text: `/${command} ${commandArgs}`,
    };
    
    const bot = createBot();
    
    // This is a bit of a hack - we're manually calling the event handler
    console.log('Simulating command...');
    console.log('Note: This is a simulation and may not fully work as expected.');
    console.log('For accurate testing, please use the bot directly in Telegram.');
    
    // Log all messages that would be sent by the bot
    bot.on('sendMessage', (chatId, text) => {
      console.log(`[Bot Response] ${text}`);
    });
    
    // Simulate the message event
    bot.processUpdate({
      update_id: 1,
      message: mockMessage,
    });
    
    // Keep the process alive briefly to allow for response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Command test complete. Check output above for responses.');
    process.exit(0);
  } catch (error) {
    console.error('Error testing command:', error);
    process.exit(1);
  }
}

testSpecificCommand();

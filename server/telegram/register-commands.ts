
/**
 * This script generates command lists for BotFather
 * Run this script and copy the output to send to BotFather
 */

// User commands that should be visible to all users
const userCommands = [
  { command: 'start', description: 'Get started with the Goated VIPs bot' },
  { command: 'verify', description: 'Link your Goated account' },
  { command: 'stats', description: 'View your wager statistics' },
  { command: 'check_stats', description: 'Check stats for a username' },
  { command: 'race', description: 'Check your race position' },
  { command: 'leaderboard', description: 'See top players' },
  { command: 'play', description: 'Play on Goated with our link' },
  { command: 'website', description: 'Visit GoatedVIPs.gg' },
  { command: 'help', description: 'Show available commands' },
];

// Admin commands that should only be visible to admins
const adminCommands = [
  { command: 'adminpanel', description: 'Open admin control panel' },
  { command: 'broadcast', description: 'Send message to all users' },
  { command: 'group_message', description: 'Send to specific group' },
  { command: 'pending', description: 'View verification requests' },
  { command: 'verify_user', description: 'Approve verification' },
  { command: 'reject_user', description: 'Reject verification' },
  { command: 'makeadmin', description: 'Grant admin privileges' },
];

// Format commands for BotFather
function formatCommandsForBotFather(commands: { command: string, description: string }[]): string {
  return commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n');
}

console.log('=== COMMANDS FOR BOTFATHER ===');
console.log('To register commands, send the following to @BotFather:');
console.log('\n1. Send /setcommands');
console.log('2. Select your bot');
console.log('3. Paste the following for regular users:');
console.log('\n' + formatCommandsForBotFather(userCommands));

console.log('\n\nFor admin commands:');
console.log('1. Send /setcommands');
console.log('2. Select your bot');
console.log('3. Choose "Edit admin commands scope"');
console.log('4. Select "Add admin commands"');
console.log('5. Paste the following:');
console.log('\n' + formatCommandsForBotFather(adminCommands));

console.log('\nNote: Admin commands will only be visible to users who have admin privileges.');

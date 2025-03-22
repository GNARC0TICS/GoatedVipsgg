// Test script to verify production mode behavior
import { isFallbackDataAllowed, createEnhancedFallbackData, createFallbackWagerRacePosition } from './server/utils/fallback-data.ts';

// Save original NODE_ENV
const originalEnv = process.env.NODE_ENV;

console.log('=== Testing in DEVELOPMENT mode ===');
process.env.NODE_ENV = 'development';
console.log('isFallbackDataAllowed:', isFallbackDataAllowed());
console.log('createEnhancedFallbackData:', createEnhancedFallbackData().status);
console.log('createFallbackWagerRacePosition:', createFallbackWagerRacePosition(1) ? 'returns data' : 'returns null');

console.log('\n=== Testing in PRODUCTION mode ===');
process.env.NODE_ENV = 'production';
console.log('isFallbackDataAllowed:', isFallbackDataAllowed());
console.log('createEnhancedFallbackData:', createEnhancedFallbackData().status);
console.log('createFallbackWagerRacePosition:', createFallbackWagerRacePosition(1) ? 'returns data' : 'returns null');

// Restore original NODE_ENV
process.env.NODE_ENV = originalEnv;
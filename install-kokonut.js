// Script to install Kokonut UI components
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to install a Kokonut UI component
async function installComponent(componentUrl) {
  try {
    console.log(`Installing component from: ${componentUrl}`);
    // Use yes to automatically answer 'yes' to all prompts
    execSync(`echo "y" | npx shadcn@latest add ${componentUrl}`, { stdio: 'inherit' });
    console.log(`Successfully installed component from ${componentUrl}`);
    return true;
  } catch (error) {
    console.error(`Failed to install component from ${componentUrl}`);
    console.error(error);
    return false;
  }
}

// Install utils first
(async function main() {
  console.log('Starting Kokonut UI installation');
  
  // First, try to install the utils
  const utilsSuccess = await installComponent('https://kokonutui.com/r/utils.json');
  
  if (!utilsSuccess) {
    console.log('Failed to install utils. Creating manually...');
    
    // Ensure the kokonutui directory exists
    const kokonutDir = path.join(__dirname, 'client', 'src', 'components', 'kokonutui');
    if (!fs.existsSync(kokonutDir)) {
      fs.mkdirSync(kokonutDir, { recursive: true });
    }
  }

  // Try to install individual components
  const components = [
    'https://kokonutui.com/r/card-05.json',
    'https://kokonutui.com/r/hero-01.json',
    'https://kokonutui.com/r/features-01.json',
    'https://kokonutui.com/r/testimonials-01.json',
    'https://kokonutui.com/r/cta-01.json'
  ];

  let successCount = 0;
  for (const component of components) {
    const success = await installComponent(component);
    if (success) successCount++;
  }

  console.log(`Installation completed. Successfully installed ${successCount}/${components.length + 1} components.`);
})();
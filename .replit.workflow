import { Workflow } from "$replit-workflow";

new Workflow("Start application")
  .setDescription("Starts the development server")
  .setCommand("npm run dev")
  .build()
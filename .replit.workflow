import { Workflow } from "$replit-workflow";

new Workflow("start_server")
  .setDescription("Starts the development server")
  .setCommand("npm run dev")
  .build()

new Workflow("db_push")
  .setDescription("Push database schema changes")
  .setCommand("npm run db:push")
  .build()
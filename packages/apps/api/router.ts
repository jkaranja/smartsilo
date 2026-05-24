import { Elysia } from "elysia";
import { registerRoutes } from "./routes/register";
import { acceptInviteRoutes } from "./routes/accept-invite";
import { userRoutes } from "./routes/users";
import { integrationRoutes } from "./routes/integrations";
import { garageRoutes } from "@saas/garage";
import { clinicRoutes } from "@saas/clinic";
import { dealershipRoutes } from "@saas/dealership";

export const router = new Elysia({ name: "extensions router", prefix: "/api" })
  .use(registerRoutes)
  .use(acceptInviteRoutes)
  .use(userRoutes)
  .use(integrationRoutes)
  .use(garageRoutes)
  .use(clinicRoutes)
  .use(dealershipRoutes);

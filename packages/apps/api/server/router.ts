import { app } from "./app";
import { garageRoutes } from "@saas/garage";
import { clinicRoutes } from "@saas/clinic";
import { dealershipRoutes } from "@saas/dealership";

// Platform routes — each file imports app and registers its routes as a side effect
import "../routes/register";
import "../routes/invitations";
import "../routes/users";
import "../routes/integrations";
import "../routes/sso";
import "../routes/mcp";

// Extension routes are standalone Elysia plugins from external packages
app.use(garageRoutes).use(clinicRoutes).use(dealershipRoutes);

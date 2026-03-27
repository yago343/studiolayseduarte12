import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import clientsRouter from "./clients";
import appointmentsRouter from "./appointments";
import financesRouter from "./finances";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/services", servicesRouter);
router.use("/clients", clientsRouter);
router.use("/appointments", appointmentsRouter);
router.use("/finances", financesRouter);
router.use("/dashboard", dashboardRouter);
router.use(settingsRouter); // settings, schedule, availability, public/book are mounted directly

export default router;

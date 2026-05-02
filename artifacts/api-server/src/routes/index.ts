import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import clinicalRecordsRouter from "./clinical-records";
import invoicesRouter from "./invoices";
import inventoryRouter from "./inventory";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(clinicalRecordsRouter);
router.use(invoicesRouter);
router.use(inventoryRouter);
router.use(dashboardRouter);

export default router;

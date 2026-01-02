import Router from "koa-router";
import accessRequests from "./accessRequests";

const router = new Router();

router.use("/", accessRequests.routes());

export default router;

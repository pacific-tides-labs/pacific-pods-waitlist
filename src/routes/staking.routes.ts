import { Router } from "express";
import { StakingController } from "../controllers/staking.controllers";

const router = Router();

// 1. GET: Fetches the user's points and currently soft-staked tokens
router.get("/", StakingController.getUserStakingData);

// 2. POST: Initiates a new soft stake
router.post("/", StakingController.staking);

// 3. DELETE: Unstakes the token and banks the points
router.delete("/", StakingController.unstake);

export default router;
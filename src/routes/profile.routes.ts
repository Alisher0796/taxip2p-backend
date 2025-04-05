import express from 'express';
import { authenticateTelegram } from '../middleware/auth';
import { getProfile, updateProfile } from '../controllers/profile.controller';

const router = express.Router();

router.get('/', authenticateTelegram, getProfile);
router.put('/', authenticateTelegram, updateProfile);

export default router;

import express from 'express';
import { authenticateTelegram } from '../middleware/auth.middleware';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';

const router = express.Router();

router.get('/', authenticateTelegram, getProfile);
router.put('/', authenticateTelegram, updateProfile);

export default router;

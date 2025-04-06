import express from 'express';
import { getProfile, updateProfile } from './profile.controller';
import { authenticateTelegram } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticateTelegram, getProfile);
router.put('/', authenticateTelegram, updateProfile);

export default router;

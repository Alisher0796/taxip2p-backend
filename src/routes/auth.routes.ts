import express from 'express'
import { authWithTelegram } from '../controllers/auth.controller'

const router = express.Router()

router.post('/', authWithTelegram)

export default router

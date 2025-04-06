import express from 'express'
import { authWithTelegram } from './auth.controller'

const router = express.Router()

router.post('/', authWithTelegram)

export default router

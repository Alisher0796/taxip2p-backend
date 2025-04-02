import express from 'express'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser
} from '../controllers/user.controller'

const router = express.Router()

router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.post('/', createUser)
router.put('/:id', updateUser) // ✅ обновление пользователя

export default router

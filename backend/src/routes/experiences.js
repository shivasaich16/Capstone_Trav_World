import {Router} from 'express';
import {readStore} from '../db.js';
const router = Router();
router.get('/', (_req,res) => {
  const store = readStore();
  res.json(store.experiences.filter(item => item.isActive !== false));
});
export default router;

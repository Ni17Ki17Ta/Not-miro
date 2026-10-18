import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import {
  createBoard,
  getUserBoards,
  getBoardById,
  getBoardByInviteToken,
  updateBoard,
  deleteBoard,
  regenerateInviteToken,
  BoardError,
} from '../services/boards.js';
import { requireAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Все роуты требуют авторизации + общий rate limit
router.use(requireAuth);
router.use(apiLimiter);

// ============ Схемы валидации ============

const createBoardSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200).trim().optional(),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  elements: z.array(z.unknown()).optional(),
});

// ============ GET /api/boards ============
// Список моих досок

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boards = await getUserBoards(req.userId!);
    res.json({ boards });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/boards ============
// Создать новую доску

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBoardSchema.parse(req.body);
    const board = await createBoard(req.userId!, data.title || 'Новая доска');
    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/boards/join/:token ============
// Войти на доску по invite-токену (создаёт сессию доступа)
// ВАЖНО: этот роут должен идти ДО /:id, иначе Express перехватит его как id

router.post('/join/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardByInviteToken(req.params.token);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/boards/join/:token ============
// Альтернатива через GET (для удобства клиента)

router.get('/join/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardByInviteToken(req.params.token);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// ============ GET /api/boards/:id ============
// Одна доска — только владелец

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardById(req.params.id, req.userId!);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// ============ PATCH /api/boards/:id ============
// Обновить доску (только владелец) — title и/или elements

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateBoardSchema.parse(req.body);
    const board = await updateBoard(req.params.id, req.userId!, data);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// ============ DELETE /api/boards/:id ============
// Удалить доску (только владелец)

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteBoard(req.params.id, req.userId!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/boards/:id/invite ============
// Регенерировать invite-токен (только владелец)

router.post('/:id/invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await regenerateInviteToken(req.params.id, req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ============ Экспорт ============

export default router;
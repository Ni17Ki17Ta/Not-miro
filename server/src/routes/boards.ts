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
import { applyOperation, saveNow } from '../socket/boardStore.js';

const router = Router();

router.use(requireAuth);
router.use(apiLimiter);

const createBoardSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200).trim().optional(),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  elements: z.array(z.unknown()).optional(),
});

// Схема для добавления элемента напрямую
const addElementSchema = z.object({
  element: z.record(z.unknown()),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boards = await getUserBoards(req.userId!);
    res.json({ boards });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBoardSchema.parse(req.body);
    const board = await createBoard(req.userId!, data.title || 'Новая доска');
    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
});

// ВАЖНО: этот эндпоинт должен быть до /:id
router.post('/join/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardByInviteToken(req.params.token);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

router.get('/join/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardByInviteToken(req.params.token);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardById(req.params.id, req.userId!);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateBoardSchema.parse(req.body);
    const board = await updateBoard(req.params.id, req.userId!, data);
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteBoard(req.params.id, req.userId!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/invite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await regenerateInviteToken(req.params.id, req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// НОВЫЙ ЭНДПОИНТ: прямое добавление элемента (обход сокета)
router.post('/:id/elements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addElementSchema.parse(req.body);
    const boardId = req.params.id;
    const userId = req.userId!;

    // Проверяем доступ к доске (владелец)
    const board = await getBoardById(boardId, userId);

    // Применяем операцию add через in-memory хранилище
    const result = applyOperation(boardId, { type: 'add', element: data.element as any }, userId);
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Ошибка добавления' });
      return;
    }

    // Принудительно сохраняем в БД немедленно
    await saveNow(boardId);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
import { Router, type Request, type Response } from "express";
import { authenticateToken, type AuthJwtPayload } from "../middleware/authMiddleware"
import { createTodo, getTodos, getTodoById, updateTodo, patchTodo, deleteTodo, getStats, type CreateTodoInput, type UpdateTodoInput } from "../services/registrationService";

const router = Router();


router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.user as AuthJwtPayload;

    const result = await getTodos(user.userId, req.query);

    res.status(200).json(result);
  }
);

router.get("/stats", authenticateToken, async (req: Request, res: Response) => {
  const stats = await getStats();

  res.status(200).json(stats);
});

router.get("/:id", authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.user as AuthJwtPayload;
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    const todo = await getTodoById(user.userId, id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(200).json(todo);
  }
)

router.post('/', authenticateToken, async (req, res) => {
  const user = req.user as AuthJwtPayload;
  const input = req.body as CreateTodoInput;
  const todo = await createTodo(user.userId, input) 

  res.status(201).json({ success: true, data: todo });  
});

router.put("/:id", authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.user as AuthJwtPayload;
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    const todo = await updateTodo(user.userId, id, req.body as UpdateTodoInput);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(200).json(todo);
  }
)

router.patch("/:id", authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.user as AuthJwtPayload;
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    const todo = await patchTodo(user.userId, id, req.body as UpdateTodoInput);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(200).json(todo);
  }
)

router.delete("/:id", authenticateToken,
  async (req: Request, res: Response) => {
    const user = req.user as AuthJwtPayload;
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid todo id",
      });
    }

    const todo = await deleteTodo(user.userId, id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(204);
  }
)



export default router;
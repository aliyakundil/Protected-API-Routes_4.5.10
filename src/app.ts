import express from "express";
import authRouter from "./routes/auth.js";
import protectedTodosRouter from "./routes/protectedTodos";
import profileRouter from "./routes/profile.js";
import adminRouter from "./routes/admin.js"
import { connectToDb } from "./models/User.js";
import { authenticateToken, requireRole } from "./middleware/authMiddleware"
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

interface ApiError extends Error {
  status?: number;
}

const app = express();
const PORT = 3000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Todo REST API",
    version: "1.0.0",
    links: {
      api: "/api",
      health: "/health",
      todos: "/api/users",
    },
  });
});

app.use("/api", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/profile", profileRouter);
app.use("/api/protected/todos", protectedTodosRouter);

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const status = err.status || 500;

  console.error("Error:", {
    message: err.message,
    status,
    stack: err.stack,
  });

  res.status(status).json({
    success: false,
    error: err.message,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: "Not found!",
    message: `Route ${req.originalUrl} does not exist`,
  });
}

app.use(authenticateToken);
app.use(requireRole);

async function startServer() {
  try {
    await connectToDb();

    app.listen(PORT, () => {
      console.log("Server started on port 3000");
    });
  } catch (err) {
    console.log("Failed to start server: ", err);
    process.exit(1);
  }
}

startServer();

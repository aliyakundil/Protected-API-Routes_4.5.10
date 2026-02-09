import { Router } from "express";
import dotenv from "dotenv";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  deleteUser,
  followUser,
  unfollowUser,
  changeUserdRole,
  changeUserdStatus,
  geStatic,
  getTodoUserById
} from "../services/userServices.js";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";


const router = Router();

dotenv.config();

// ===== Админские =====
router.get(
  "/users",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { users, meta } = await getUsers(req.query);
      res.status(200).json({ success: true, data: users, meta });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/statistics",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { users, todos, generatedAt } = await geStatic();
      res.status(200).json({ success: true, data: users, todos, generatedAt });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      const result = await getUserById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Invalid user id",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/users",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const result = await createUser(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      const result = await updateUser(id, req.body);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      const body = req.body;

      if (!body || Object.keys(body).length === 0) {
        const err = new Error("Body не может быть пустым");
        (err as any).status = 400;
        return next(err);
      }

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      const result = await patchUser(id, req.body);

      if (!result) {
        const err = new Error("Not Found");
        (err as any).status = 400;
        return next(err);
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      const deleted = await deleteUser(id);

      if (!deleted) {
        const err = new Error("User not found");
        (err as any).status = 404;
        return next(err);
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/users/:id/follow",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.body.userId;

      if (!currentUserId) {
        const err = new Error("User ID is required to like post");
        (err as any).status = 400;
        return next(err);
      }

      if (currentUserId === targetUserId) {
        const err = new Error("You cannot follow yourself");
        (err as any).status = 400;
        return next(err);
      }

      if (!targetUserId || Array.isArray(targetUserId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user targetUserId" });
      }

      const result = await followUser(targetUserId, currentUserId);

      res.status(201).json({
        success: true,
        data: result.following,
        followersCount: result.following.followers.length,
        followed: result.followed,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/users/:id/unfollow",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.body.userId;

      if (!currentUserId) {
        const err = new Error("User ID is required to like post");
        (err as any).status = 400;
        return next(err);
      }

      if (currentUserId === targetUserId) {
        const err = new Error("You cannot unfollow yourself");
        (err as any).status = 400;
        return next(err);
      }

      if (!targetUserId || Array.isArray(targetUserId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user targetUserId" });
      }

      const result = await unfollowUser(currentUserId, targetUserId);

      res.status(201).json({
        success: true,
        data: result.following,
        followersCount: result.following.followers.length,
        unfollowed: result.follower,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/users/:id/role",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const role = req.body.role;

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      if (!role) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid role" });
      }

      const result = await changeUserdRole(id, role);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/users/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const status = req.body.isActive;

      console.log(status)

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      if (status == undefined) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid status" });
      }

      const result = await changeUserdStatus(id, status);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/users/:id/todos",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      const result = await getTodoUserById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Invalid user id",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
)

export default router;
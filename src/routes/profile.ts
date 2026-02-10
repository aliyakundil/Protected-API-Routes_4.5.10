import { Router } from "express";
import dotenv from "dotenv";
import {
  getUsersProfile,
  getUserProfileById,
  createUserProfile,
  updateUserProfile,
  patchUserProfile,
  deleteUserProfile,
  followUserProfile,
  unfollowUserProfile
} from "../services/userServices.js";
import { authenticateToken, requireRole, type AuthJwtPayload } from "../middleware/authMiddleware.js";

const router = Router();

dotenv.config();

router.get(
  "/",
  authenticateToken,
  async (req, res, next) => {
    try {
      const id = req.user as AuthJwtPayload;
      if (!id) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }
      const userId = id.userId;
      const user = await getUserProfileById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
);


router.get(
  "/:id",
  authenticateToken,
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

      const result = await getUserProfileById(id);

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
  "/",
  authenticateToken,
  async (req, res, next) => {
    try {
      const result = await createUserProfile(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userPayload = req.user as AuthJwtPayload;
      const userId = userPayload.userId;

      const body = req.body;
      const updateData: any = {};
      const allowedFields = ["firstName", "lastName", "bio"];

      if (body.profile) {
        for (const key of allowedFields) {
          if (body.profile[key] !== undefined) {
            updateData[`profile.${key}`] = body.profile[key];
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: "No valid fields to update" });
      }

      const result = await updateUserProfile(userId, updateData);

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
  "/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const userPayload = req.user as AuthJwtPayload;
      const userId = userPayload.userId;

      const body = req.body;
      const updateData: any = {};
      const allowedFields = ["firstName", "lastName", "bio"];

      if (body.profile) {
        for (const key of allowedFields) {
          if (body.profile[key] !== undefined) {
            updateData[`profile.${key}`] = body.profile[key];
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: "No valid fields to update" });
      }

      const result = await patchUserProfile(userId, updateData);

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
  "/:id",
  authenticateToken,
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = req.user as AuthJwtPayload;

      if (!id || Array.isArray(id)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid user id" });
      }

      if (user.userId !== id && user.role !== "admin") {
        return res.status(403).json({ success: false, error: "You can delete only your own profile or must be admin" });
      }

      const deleted = await deleteUserProfile(id);

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
  "/:id/follow",
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

      const result = await followUserProfile(targetUserId, currentUserId);

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
  "/:id/unfollow",
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

      const result = await unfollowUserProfile(currentUserId, targetUserId);

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

export default router;
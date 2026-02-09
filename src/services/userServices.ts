import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import User from "../models/User.js";
import Todo from "../models/Todo.js";
import bcrypt from "bcrypt";

interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    bio: string;
  };
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
}

interface UpdateUserInput {
  username: string;
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
    bio: string;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  completed?: string;
  priority?: string;
  search?: string;
}

export async function getUsers(options: PaginationQuery) {
  const page = options.page ? parseInt(options.page) : 1;
  const limit = options.limit ? parseInt(options.limit) : 10;
  const offset = (page - 1) * limit;

  const filter: any = {};

  if (options.search) {
    filter.username = { $regex: options.search, $options: "i" };
  }

  const users = await User.find(filter)
    .populate("followers", "username profile")
    .populate("following", "username profile")
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const total = await User.countDocuments(filter);

  return {
    users: users,
    meta: {
      total: total,
      page: page,
      limit: limit,
      totalPage: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string) {
  const user = await User.findById(id)
    .populate("followers", "username profile")
    .populate("following", "username profile");
  return user;
}

export async function createUser(input: CreateUserInput) {
  if (!input.username || input.username.trim() === "")
    throw new Error("Username is required");
  if (!input.password || input.password.trim() === "")
    throw new Error("Password is required");
  const hashPassword = await bcrypt.hash(input.password, 16);
  const newUser = await User.create({
    username: input.username,
    email: input.email,
    password: hashPassword,
    profile: {
      firstName: input.profile.firstName,
      lastName: input.profile.lastName,
      bio: input.profile.bio,
    },
  });

  return newUser;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const userUpdate = await User.findOne({ _id: new ObjectId(id) });

  if (!userUpdate) return null;

  if (input.username !== undefined) userUpdate.username = input.username.trim();
  if (input.email !== undefined) userUpdate.email = input.email;

  await userUpdate.save();

  return userUpdate;
}

export async function patchUser(id: string, input: Partial<UpdateUserInput>) {
  const userPatch = await User.findOne({ _id: new ObjectId(id) });

  if (!userPatch) return null;

  if (input.username !== undefined)
    userPatch.username = input.username.trimEnd();
  if (input.email !== undefined) userPatch.email = input.email;

  const update = await User.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: userPatch },
    { returnDocument: "after" },
  );

  return update ?? null;
}

export async function deleteUser(id: string) {
  const result = await User.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You cannot follow yourself");
  }

  const followerObjectId = new mongoose.Types.ObjectId(followerId);
  const followingObjectId = new mongoose.Types.ObjectId(followingId);

  const follower = await User.findById(followerObjectId);
  const following = await User.findById(followingObjectId);

  if (!follower || !following) {
    throw new Error("User not found");
  }

  // если уже подписан — ничего не делаем
  if (follower.following.some((id) => id.equals(followingObjectId))) {
    return { follower, following, followed: false };
  }

  follower.following.push(followingObjectId);
  following.followers.push(followerObjectId);

  await follower.save();
  await following.save();

  return {
    follower,
    following,
    followed: true,
  };
}

export async function unfollowUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You cannot unfollow yourself");
  }

  const followerObjectId = new mongoose.Types.ObjectId(followerId);
  const followingObjectId = new mongoose.Types.ObjectId(followingId);

  const follower = await User.findById(followerObjectId);
  const following = await User.findById(followingObjectId);

  if (!follower || !following) {
    throw new Error("User not found");
  }

  follower.following = follower.following.filter(
    (id) => !id.equals(followingObjectId),
  );
  following.followers = following.followers.filter(
    (id) => !id.equals(followerObjectId),
  );

  await follower.save();
  await following.save();

  return {
    follower,
    following,
    followed: false,
  };
}

export async function changeUserdRole(id: string, role: "admin" | "user") {
  const userRole = await User.findOne({ _id: new ObjectId(id) });

  if (!role) return null;

  if (!userRole) return null;

  if ( userRole !== undefined)
    userRole.role = role;

  const update = await User.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: userRole },
    { returnDocument: "after" },
  );

  return update ?? null;
}

export async function changeUserdStatus(id: string, status: true | false) {
  const userStatus = await User.findOne({ _id: new ObjectId(id) });

  if (!userStatus) return null;

  if ( userStatus !== undefined)
    userStatus.isActive = status;

  const update = await User.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: userStatus },
    { returnDocument: "after" },
  );

  return update ?? null;
}

export async function geStatic() {
  const now = new Date();

  const adminRole = await User.countDocuments({ role: "admin" });
  const userRole = await User.countDocuments({ role: "user" });
  const activeStatus = await User.countDocuments({ isActive: true });
  const notActiveStatus = await User.countDocuments({ isActive: false });
  const todoCompleted  = await Todo.countDocuments({ completed: true });
  const todoPending = await Todo.countDocuments({ completed: false });
  const overdueTodos = await Todo.countDocuments({
    completed: false,
    dueDate: { $lt: now },
  });
  

  return {
    users: {
      byRole: { admin: adminRole, user: userRole },
      byStatus: { active: activeStatus, inactive: notActiveStatus }
    },
    todos: {
      completed: todoCompleted,
      pending: todoPending,
      overdue: overdueTodos
    },
    generatedAt: now
  };
}

export async function getTodoUserById(id: string) {
  const user = await User.findById(id)
  
    if (!user) return null;

  const todo = await Todo.find({ userId: user._id})
  return todo;
}

// ========== Profile ========== /
export async function getUsersProfile(options: PaginationQuery) {
  const page = options.page ? parseInt(options.page) : 1;
  const limit = options.limit ? parseInt(options.limit) : 10;
  const offset = (page - 1) * limit;

  const filter: any = {};

  if (options.search) {
    filter.username = { $regex: options.search, $options: "i" };
  }

  const users = await User.find(filter)
    .populate("followers", "username profile")
    .populate("following", "username profile")
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const total = await User.countDocuments(filter);

  return {
    users: users,
    meta: {
      total: total,
      page: page,
      limit: limit,
      totalPage: Math.ceil(total / limit),
    },
  };
}

export async function getUserProfileById(id: string) {
  const user = await User.findById(id)
    .populate("followers", "username profile")
    .populate("following", "username profile")
    .select("username profile role");
  return user;
}

export async function createUserProfile(input: CreateUserInput) {
  if (!input.username || input.username.trim() === "")
    throw new Error("Username is required");
  if (!input.password || input.password.trim() === "")
    throw new Error("Password is required");
  const hashPassword = await bcrypt.hash(input.password, 16);
  const newUser = await User.create({
    username: input.username,
    email: input.email,
    password: hashPassword,
    profile: {
      firstName: input.profile.firstName,
      lastName: input.profile.lastName,
      bio: input.profile.bio,
    },
  });

  return newUser;
}

export async function updateUserProfile(id: string, input: UpdateUserInput) {
  const userUpdate = await User.findOne({ _id: new ObjectId(id) });

  if (!userUpdate) return null;

  if (input.username !== undefined) userUpdate.username = input.username.trim();
  if (input.email !== undefined) userUpdate.email = input.email;

  await userUpdate.save();

  return userUpdate;
}

export async function patchUserProfile(id: string, input: Partial<UpdateUserInput>) {
  const userPatch = await User.findOne({ _id: new ObjectId(id) });

  if (!userPatch) return null;

  if (input.username !== undefined)
    userPatch.username = input.username.trimEnd();
  if (input.email !== undefined) userPatch.email = input.email;

  const update = await User.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: userPatch },
    { returnDocument: "after" },
  );

  return update ?? null;
}

export async function deleteUserProfile(id: string) {
  const result = await User.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function followUserProfile(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You cannot follow yourself");
  }

  const followerObjectId = new mongoose.Types.ObjectId(followerId);
  const followingObjectId = new mongoose.Types.ObjectId(followingId);

  const follower = await User.findById(followerObjectId);
  const following = await User.findById(followingObjectId);

  if (!follower || !following) {
    throw new Error("User not found");
  }

  // если уже подписан — ничего не делаем
  if (follower.following.some((id) => id.equals(followingObjectId))) {
    return { follower, following, followed: false };
  }

  follower.following.push(followingObjectId);
  following.followers.push(followerObjectId);

  await follower.save();
  await following.save();

  return {
    follower,
    following,
    followed: true,
  };
}

export async function unfollowUserProfile(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("You cannot unfollow yourself");
  }

  const followerObjectId = new mongoose.Types.ObjectId(followerId);
  const followingObjectId = new mongoose.Types.ObjectId(followingId);

  const follower = await User.findById(followerObjectId);
  const following = await User.findById(followingObjectId);

  if (!follower || !following) {
    throw new Error("User not found");
  }

  follower.following = follower.following.filter(
    (id) => !id.equals(followingObjectId),
  );
  following.followers = following.followers.filter(
    (id) => !id.equals(followerObjectId),
  );

  await follower.save();
  await following.save();

  return {
    follower,
    following,
    followed: false,
  };
}
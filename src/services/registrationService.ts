import bcrypt from "bcrypt";
import User from "../models/User.js";
import Todo from "../models/Todo.js";
import crypto from "crypto";
import { ObjectId } from "mongodb";

export interface Todos {
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateTodoInput {
  text: string;
  priority?: "low" | "medium" | "high";
  completed?: string | boolean;
  dueDate?: Date;
}

export interface UpdateTodoInput {
  text: string;
  priority?: "low" | "medium" | "high";
  completed?: string | boolean;
  dueDate?: Date;
}

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: {
        total: number;
        page: number;
        limit: number;
        totalPage: number;
      };
    }
  | { success: false; error: string; details?: string[] };

export interface PaginationQuery {
  page?: string;
  limit?: string;
  completed?: string;
  priority?: string;
  search?: string;
}

export async function registerUser(data: any) {
  const { email, password, username, profile, role } = data;

  const hashPassword = await bcrypt.hash(password, 16);

  const emailToken = crypto.randomBytes(32).toString("hex");

  const user = new User({
    email,
    password: hashPassword,
    username,
    profile,
    emailVerificationToken: emailToken,
    role,
  });

  await user.save();

  return { success: true, data: user };
}

// =========== Todo =========== //

export async function getTodos(userId: any, query: PaginationQuery) {
const page = query.page ? parseInt(query.page) : 1;
  const limit = query.limit ? parseInt(query.limit) : 10;

  const filter: any = { userId };

  if (query.completed !== undefined) filter.completed = query.completed === "true";
  if (query.priority) filter.priority = query.priority;
  if (query.search) filter.text = { $regex: query.search, $options: "i" };

  const total = await Todo.countDocuments(filter);
  const todos = await Todo.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    success: true,
    data: todos,
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
  };
}

export async function getTodoById(userId: string, todoId: string): Promise <Todos | null > {
  return Todo.findOne({  _id: todoId, userId: userId });
}

export async function createTodo(userId: string, input: CreateTodoInput): Promise < Todos > {
  const newTodo = await Todo.create({
    text: input.text.trim(),
    completed: input.completed === "true" || input.completed === true,
    priority: input.priority ?? "low",
    dueDate: input.dueDate ?? null,
    userId,
  });
  return newTodo;
}

export async function updateTodo(todoId: string,
  userId: string,
  input: UpdateTodoInput): Promise <Todos | null > {
  const todo = await Todo.findOne({ _id: todoId, userId: userId });
  if (!todo) return null; 
  todo.text = input.text.trim();
  todo.completed =
    typeof input.completed === "string"
      ? input.completed === "true"
      : input.completed ?? false;
  todo.priority = input.priority ?? "low";
  if (input.dueDate !== undefined) todo.dueDate = input.dueDate;

  await todo.save();
  return todo;
}

export async function patchTodo(todoId: string,
  userId: string,
  input: UpdateTodoInput): Promise<Todos | null> {
  const todoUpdate = await Todo.findOne({ _id: todoId, userId });

  if (!todoUpdate) return null;

  if (input.text !== undefined) todoUpdate.text = input.text.trim();
  if (input.completed !== undefined)
    todoUpdate.completed =
      typeof input.completed === "string"
        ? input.completed === "true"
        : input.completed;
  if (input.priority !== undefined) todoUpdate.priority = input.priority;

  await todoUpdate.save();

  return todoUpdate;
}

export async function deleteTodo(todoId: string) {
  const result = await User.deleteOne({ _id: new ObjectId(todoId) });
  return result.deletedCount === 1;
}

export async function getStats() {

  const total = await Todo.find().countDocuments();
  const completed = await Todo.find({"completed": true}).countDocuments();
  const pending = await Todo.find({"completed": false}).countDocuments();
  const low = await Todo.find({"priority": "low"}).countDocuments();
  const medium = await Todo.find({"priority": "medium"}).countDocuments();
  const high = await Todo.find({"priority": "high"}).countDocuments();
  return {
      total: total,
      completed: completed,
      pending: pending,
      byPriority: {
      low: low,
      medium: medium,
      high: high,
    },
  };
}
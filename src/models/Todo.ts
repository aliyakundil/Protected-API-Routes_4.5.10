import mongoose from "mongoose";

export const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate: { type: Date },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

todoSchema.index({ userId: 1, createdAt: -1 });
todoSchema.index({ userId: 1, completed: 1 });

export default mongoose.model("Todo", todoSchema);

let uri = process.env.MONGODB_URI!;

console.log("MONGODB_URI =", process.env.MONGODB_URI);

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function connectToDb() {
  await mongoose.connect(uri);

  console.log("MongoDB connected");

  mongoose.connection.on("error", (err: string) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
}
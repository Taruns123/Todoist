import { ObjectId } from "mongodb";
import type {
  ScheduledTodo,
  ScheduledTodoActionRequest,
} from "@/types/todos";
import { getCollection } from "./mongodb";

type ScheduledTodoDoc = {
  _id: ObjectId;
  title: string;
  note?: string;
  targetTime: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "scheduled_todos";

function toScheduled(doc: ScheduledTodoDoc): ScheduledTodo {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    note: doc.note,
    targetTime: doc.targetTime,
    done: doc.done,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function fetchScheduledTodos(): Promise<ScheduledTodo[]> {
  const collection = await getCollection<ScheduledTodoDoc>(COLLECTION);
  const docs = await collection
    .find({})
    .sort({ targetTime: 1 })
    .toArray();
  return docs.map(toScheduled);
}

export async function createScheduledTodo(input: {
  title: string;
  note?: string;
  targetTime: string;
}): Promise<ScheduledTodo> {
  const trimmed = input.title.trim();
  if (!trimmed) {
    throw new Error("Task title cannot be empty.");
  }

  const timestamp = new Date(input.targetTime);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Provide a valid date and time.");
  }

  const now = new Date();
  const collection = await getCollection<ScheduledTodoDoc>(COLLECTION);

  const doc: Omit<ScheduledTodoDoc, "_id"> = {
    title: trimmed,
    note: input.note?.trim() || undefined,
    targetTime: timestamp.toISOString(),
    done: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);

  return toScheduled({
    ...doc,
    _id: result.insertedId as ObjectId,
  });
}

export async function applyScheduledTodoAction(
  payload: ScheduledTodoActionRequest,
): Promise<void> {
  const collection = await getCollection<ScheduledTodoDoc>(COLLECTION);
  const _id = new ObjectId(payload.id);

  if (payload.kind === "delete") {
    const result = await collection.deleteOne({ _id });
    if (!result.deletedCount) {
      throw new Error("Task not found.");
    }
    return;
  }

  const result = await collection.updateOne(
    { _id },
    {
      $set: {
        done: payload.done,
        updatedAt: new Date(),
      },
    },
  );

  if (!result.matchedCount) {
    throw new Error("Task not found.");
  }
}


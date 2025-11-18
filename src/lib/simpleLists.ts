import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import type {
  SimpleList,
  SimpleListActionRequest,
  SimpleTask,
} from "@/types/todos";
import { getCollection } from "./mongodb";

type SimpleSubtaskDoc = {
  id: string;
  title: string;
  done: boolean;
};

type SimpleTaskDoc = SimpleTask & { subtasks: SimpleSubtaskDoc[] };

type SimpleListDoc = {
  _id: ObjectId;
  title: string;
  tasks: SimpleTaskDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION = "simple_lists";

function toSimpleList(doc: SimpleListDoc): SimpleList {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    tasks: doc.tasks ?? [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function newTask(title: string): SimpleTaskDoc {
  return {
    id: randomUUID(),
    title: title.trim(),
    done: false,
    subtasks: [],
  };
}

function newSubtask(title: string): SimpleSubtaskDoc {
  return {
    id: randomUUID(),
    title: title.trim(),
    done: false,
  };
}

export async function fetchSimpleLists(): Promise<SimpleList[]> {
  const collection = await getCollection<SimpleListDoc>(COLLECTION);
  const docs = await collection
    .find({})
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toSimpleList);
}

export async function createSimpleList(title: string): Promise<SimpleList> {
  const trimmed = title.trim();

  if (!trimmed) {
    throw new Error("List title cannot be empty.");
  }

  const collection = await getCollection<SimpleListDoc>(COLLECTION);
  const now = new Date();

  const doc: SimpleListDoc = {
    _id: new ObjectId(),
    title: trimmed,
    tasks: [] as SimpleTaskDoc[],
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(doc);

  return toSimpleList({
    ...doc,
  });
}

export async function applySimpleListAction(
  payload: SimpleListActionRequest,
): Promise<SimpleList | null> {
  const collection = await getCollection<SimpleListDoc>(COLLECTION);
  const listId = new ObjectId(payload.listId);

  if (payload.kind === "delete-list") {
    const result = await collection.deleteOne({ _id: listId });
    if (!result.deletedCount) {
      throw new Error("List not found.");
    }
    return null;
  }

  const doc = await collection.findOne({ _id: listId });

  if (!doc) {
    throw new Error("List not found.");
  }

  switch (payload.kind) {
    case "add-task": {
      const trimmed = payload.title.trim();
      if (!trimmed) break;
      doc.tasks.push(newTask(trimmed));
      break;
    }
    case "delete-task": {
      const index = doc.tasks.findIndex((task) => task.id === payload.taskId);
      if (index >= 0) {
        doc.tasks.splice(index, 1);
      }
      break;
    }
    case "toggle-task": {
      const task = doc.tasks.find((taskItem) => taskItem.id === payload.taskId);
      if (task) task.done = payload.done;
      break;
    }
    case "add-subtask": {
      const task = doc.tasks.find((taskItem) => taskItem.id === payload.taskId);
      if (task) {
        const trimmed = payload.title.trim();
        if (!trimmed) break;
        task.subtasks.push(newSubtask(trimmed));
      }
      break;
    }
    case "toggle-subtask": {
      const task = doc.tasks.find((taskItem) => taskItem.id === payload.taskId);
      const subtask = task?.subtasks.find(
        (item) => item.id === payload.subtaskId,
      );
      if (subtask) subtask.done = payload.done;
      break;
    }
    default: {
      throw new Error("Unsupported action.");
    }
  }

  doc.updatedAt = new Date();

  const { _id, ...rest } = doc;
  await collection.updateOne({ _id }, { $set: rest });

  return toSimpleList({ ...doc, _id });
}


import { NextResponse } from "next/server";
import {
  applyScheduledTodoAction,
  createScheduledTodo,
  fetchScheduledTodos,
} from "@/lib/scheduledTodos";
import type { ScheduledTodoActionRequest } from "@/types/todos";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const todos = await fetchScheduledTodos();
    return NextResponse.json(todos);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load scheduled todos.";
    return errorResponse(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      targetTime?: string;
      note?: string;
    };

    if (!body?.title || !body?.targetTime) {
      return errorResponse("Provide a title, date, and time.");
    }

    const todo = await createScheduledTodo({
      title: body.title,
      targetTime: body.targetTime,
      note: body.note,
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create timer todo.";
    const status = message.includes("Missing MONGODB_URI") ? 500 : 400;
    return errorResponse(message, status);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as
      | ScheduledTodoActionRequest
      | null;
    if (!payload || !payload.kind || !payload.id) {
      return errorResponse("Invalid action payload.");
    }

    await applyScheduledTodoAction(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update timer todo.";
    const status =
      message === "Task not found." ? 404 : message.includes("Missing") ? 500 : 400;
    return errorResponse(message, status);
  }
}


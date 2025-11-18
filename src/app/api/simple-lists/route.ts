import { NextResponse } from "next/server";
import {
  applySimpleListAction,
  createSimpleList,
  fetchSimpleLists,
} from "@/lib/simpleLists";
import type { SimpleListActionRequest } from "@/types/todos";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const lists = await fetchSimpleLists();
    return NextResponse.json(lists);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load lists.";
    return errorResponse(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { title } = (await request.json()) as { title?: string };
    if (!title) {
      return errorResponse("Provide a title for the list.");
    }

    const list = await createSimpleList(title);
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create list.";
    const status = message.includes("Missing MONGODB_URI") ? 500 : 400;
    return errorResponse(message, status);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as SimpleListActionRequest | null;
    if (!payload || !payload.kind || !payload.listId) {
      return errorResponse("Invalid action payload.");
    }

    const list = await applySimpleListAction(payload);
    return NextResponse.json(list ?? { deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Action could not be applied.";
    const status =
      message === "List not found." ? 404 : message.includes("Missing") ? 500 : 400;
    return errorResponse(message, status);
  }
}


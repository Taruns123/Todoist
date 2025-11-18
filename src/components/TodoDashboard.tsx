"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ApiErrorResponse,
  ScheduledTodo,
  SimpleList,
  SimpleListActionRequest,
  SimpleTask,
} from "@/types/todos";

const SIMPLE_API = "/api/simple-lists";
const SCHEDULED_API = "/api/scheduled-todos";

const inputRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-soft";

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const textBody = await response.text();
  let data: unknown = null;
  if (textBody) {
    try {
      data = JSON.parse(textBody);
    } catch {
      // Ignore JSON parse issues for non-JSON responses.
    }
  }

  if (!response.ok) {
    const message =
      (data as ApiErrorResponse | null)?.error ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

type SimpleListContext = {
  lists: SimpleList[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  createList: (title: string) => Promise<SimpleList | null>;
  runAction: (action: SimpleListActionRequest) => Promise<boolean>;
};

function useSimpleLists(): SimpleListContext {
  const [lists, setLists] = useState<SimpleList[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<SimpleList[]>(SIMPLE_API);
      setLists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createList = useCallback(
    async (title: string) => {
      if (!title.trim()) return null;
      setMutating(true);
      setError(null);
      try {
        const created = await apiRequest<SimpleList>(SIMPLE_API, {
          method: "POST",
          body: JSON.stringify({ title }),
        });
        await refresh();
        return created;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to create list.",
        );
        return null;
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  const runAction = useCallback(
    async (action: SimpleListActionRequest) => {
      setMutating(true);
      setError(null);
      try {
        await apiRequest(SIMPLE_API, {
          method: "PATCH",
          body: JSON.stringify(action),
        });
        await refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to update list.",
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  return { lists, loading, mutating, error, createList, runAction };
}

type ScheduledInput = {
  title: string;
  targetTime: string;
  note?: string;
};

type ScheduledContext = {
  todos: ScheduledTodo[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  createTodo: (input: ScheduledInput) => Promise<boolean>;
  toggleTodo: (id: string, done: boolean) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
};

function useScheduledTodos(): ScheduledContext {
  const [todos, setTodos] = useState<ScheduledTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ScheduledTodo[]>(SCHEDULED_API);
      setTodos(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load scheduled todos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTodo = useCallback(
    async (input: ScheduledInput) => {
      if (!input.title.trim()) return false;
      setMutating(true);
      setError(null);
      try {
        await apiRequest(SCHEDULED_API, {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to create timer todo.",
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  const toggleTodo = useCallback(
    async (id: string, done: boolean) => {
      setMutating(true);
      setError(null);
      try {
        await apiRequest(SCHEDULED_API, {
          method: "PATCH",
          body: JSON.stringify({ kind: "toggle", id, done }),
        });
        await refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to toggle timer todo.",
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      setMutating(true);
      setError(null);
      try {
        await apiRequest(SCHEDULED_API, {
          method: "PATCH",
          body: JSON.stringify({ kind: "delete", id }),
        });
        await refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to delete timer todo.",
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [refresh],
  );

  return { todos, loading, mutating, error, createTodo, toggleTodo, deleteTodo };
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

type CountdownMeta = {
  label: string;
  overdue: boolean;
  diff: number;
};

function describeCountdown(targetTime: string, now: number): CountdownMeta {
  const target = new Date(targetTime).getTime();
  if (Number.isNaN(target)) {
    return { label: "invalid", overdue: false, diff: 0 };
  }

  const diff = target - now;
  const absolute = Math.abs(diff);
  const hours = Math.floor(absolute / 3_600_000);
  const minutes = Math.floor((absolute % 3_600_000) / 60_000);
  const seconds = Math.floor((absolute % 60_000) / 1000);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (hours === 0 && minutes < 5) parts.push(`${seconds}s`);

  const label = parts.length ? parts.join(" ") : `${seconds}s`;
  return { label, overdue: diff < 0, diff };
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return dateFormatter.format(date);
}

type SimpleListsPanelProps = {
  ctx: SimpleListContext;
};

function SimpleListsPanel({ ctx }: SimpleListsPanelProps) {
  const [listTitle, setListTitle] = useState("");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const activeList = ctx.lists.find((list) => list.id === activeListId) ?? null;

  const handleCreateList = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await ctx.createList(listTitle);
    if (created) {
      setListTitle("");
      setActiveListId(created.id);
    }
  };

  const handleDeleteList = async (listId: string) => {
    const success = await ctx.runAction({
      kind: "delete-list",
      listId,
    });
    if (success && activeListId === listId) {
      setActiveListId(null);
    }
  };

  const computeProgress = (list: SimpleList) => {
    if (list.tasks.length === 0) return 0;
    const done = list.tasks.filter((task) => task.done).length;
    return Math.round((done / list.tasks.length) * 100);
  };

  const totalSteps = (list: SimpleList) =>
    list.tasks.reduce((acc, task) => acc + task.subtasks.length, 0);

  return (
    <section className="glass-panel rounded-3xl p-6 text-white shadow-halo">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
            Simple Flow
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Modular task clusters
          </h2>
        </div>
        <span className="rounded-full border border-aurora-soft/30 px-3 py-1 text-xs text-cyan-100">
          {ctx.lists.length} Lists
        </span>
      </div>

      <form
        onSubmit={handleCreateList}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={listTitle}
          onChange={(event) => setListTitle(event.target.value)}
          placeholder="Name your mission list"
          className={`w-full rounded-2xl border border-cyan-500/30 bg-slatepulse/60 px-4 py-2 text-base text-cyan-50 placeholder:text-cyan-200/40 ${inputRing}`}
          disabled={ctx.mutating}
        />
        <button
          type="submit"
          disabled={ctx.mutating}
          className="w-full rounded-2xl bg-gradient-to-r from-aurora-soft to-aurora px-4 py-2 text-sm font-semibold uppercase tracking-widest text-slate-900 shadow-neon transition hover:opacity-90 sm:w-auto"
        >
          Add List
        </button>
      </form>

      {ctx.error && (
        <p className="mt-4 rounded-2xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {ctx.error}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {ctx.loading ? (
          <p className="animate-pulse text-sm text-cyan-200/70">
            Syncing your lists...
          </p>
        ) : ctx.lists.length === 0 ? (
          <p className="text-sm text-cyan-200/80">
            Start by naming your first list – tasks and subtasks follow.
          </p>
        ) : (
          ctx.lists.map((list) => {
            const progress = computeProgress(list);
            const steps = totalSteps(list);
            return (
            <article
              key={list.id}
              className="rounded-2xl border border-cyan-500/15 bg-slatepulse/60 p-4 shadow-inner shadow-black/40"
            >
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {list.title}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
                    {list.tasks.length} tasks · {steps} subtasks
                  </p>
                </div>
                <span className="text-sm font-semibold text-aurora-soft">
                  {progress}%
                </span>
              </header>

              <div className="mt-4 h-2 w-full rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aurora-soft to-aurora transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-2xl border border-aurora-soft/40 px-4 py-2 text-sm font-semibold text-aurora-soft transition hover:bg-aurora-soft hover:text-slate-900"
                  onClick={() => setActiveListId(list.id)}
                >
                  Manage
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400 hover:text-slate-900"
                  onClick={() => handleDeleteList(list.id)}
                  disabled={ctx.mutating}
                >
                  Delete
                </button>
              </div>
            </article>
          );
          })
        )}
      </div>

      {activeList && (
        <ListModal
          key={activeList.id}
          list={activeList}
          ctx={ctx}
          onClose={() => setActiveListId(null)}
        />
      )}
    </section>
  );
}

type ListModalProps = {
  list: SimpleList;
  ctx: SimpleListContext;
  onClose: () => void;
};

function ListModal({ list, ctx, onClose }: ListModalProps) {
  const [taskDraft, setTaskDraft] = useState("");
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAddTask = async () => {
    if (!taskDraft.trim()) return;
    const success = await ctx.runAction({
      kind: "add-task",
      listId: list.id,
      title: taskDraft,
    });
    if (success) setTaskDraft("");
  };

  const handleAddSubtask = async (taskId: string) => {
    const draft = subtaskDrafts[taskId]?.trim();
    if (!draft) return;
    const success = await ctx.runAction({
      kind: "add-subtask",
      listId: list.id,
      taskId,
      title: draft,
    });
    if (success) {
      setSubtaskDrafts((prev) => ({ ...prev, [taskId]: "" }));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await ctx.runAction({
      kind: "delete-task",
      listId: list.id,
      taskId,
    });
  };

  const handleDeleteList = async () => {
    const success = await ctx.runAction({
      kind: "delete-list",
      listId: list.id,
    });
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" />
      <div
        className="glass-panel relative z-10 w-full max-w-3xl rounded-3xl border border-cyan-500/30 p-6 shadow-halo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">
              List detail
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {list.title}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-2xl border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-200 transition hover:bg-red-400 hover:text-slate-900"
              onClick={handleDeleteList}
              disabled={ctx.mutating}
            >
              Delete
            </button>
            <button
              type="button"
              className="rounded-2xl border border-cyan-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-500 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        {ctx.error && (
          <p className="mt-4 rounded-2xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {ctx.error}
          </p>
        )}

        <div className="mt-6 max-h-[55vh] space-y-4 overflow-y-auto pr-2">
          {list.tasks.length === 0 ? (
            <p className="text-sm text-cyan-200/80">
              No tasks yet. Use the composer below to seed this list.
            </p>
          ) : (
            list.tasks.map((task) => (
              <TaskCard
                key={task.id}
                listId={list.id}
                task={task}
                disabled={ctx.mutating}
                subtaskDraft={subtaskDrafts[task.id] ?? ""}
                setSubtaskDraft={(value) =>
                  setSubtaskDrafts((prev) => ({ ...prev, [task.id]: value }))
                }
                onToggle={ctx.runAction}
                onAddSubtask={() => handleAddSubtask(task.id)}
                onDeleteTask={() => handleDeleteTask(task.id)}
              />
            ))
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-black/20 p-4 md:flex-row">
          <input
            type="text"
            value={taskDraft}
            onChange={(event) => setTaskDraft(event.target.value)}
            placeholder="Drop a new task"
            className={`w-full rounded-2xl border border-cyan-500/30 bg-transparent px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-200/40 ${inputRing}`}
          />
          <button
            type="button"
            className="rounded-2xl border border-aurora-soft/40 px-4 py-2 text-sm font-semibold text-aurora-soft transition hover:bg-aurora-soft hover:text-slate-900"
            onClick={handleAddTask}
            disabled={ctx.mutating}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

type TaskCardProps = {
  listId: string;
  task: SimpleTask;
  onToggle: (action: SimpleListActionRequest) => Promise<boolean>;
  disabled: boolean;
  subtaskDraft: string;
  setSubtaskDraft: (value: string) => void;
  onAddSubtask: () => Promise<void>;
  onDeleteTask: () => Promise<void>;
};

function TaskCard({
  listId,
  task,
  onToggle,
  disabled,
  subtaskDraft,
  setSubtaskDraft,
  onAddSubtask,
  onDeleteTask,
}: TaskCardProps) {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <label className="flex flex-1 items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-cyan-400/50 bg-transparent text-aurora focus:ring-aurora-soft"
            checked={task.done}
            disabled={disabled}
            onChange={(event) =>
              onToggle({
                kind: "toggle-task",
                listId,
                taskId: task.id,
                done: event.target.checked,
              })
            }
          />
          <div className="space-y-1">
            <p
              className={`text-base font-medium ${
                task.done ? "text-cyan-200/60 line-through" : "text-white"
              }`}
            >
              {task.title}
            </p>
            {task.subtasks.length > 0 && (
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
                {task.subtasks.filter((item) => item.done).length}/
                {task.subtasks.length} steps
              </p>
            )}
          </div>
        </label>
        <button
          type="button"
          className="rounded-xl border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-400 hover:text-slate-900"
          onClick={onDeleteTask}
          disabled={disabled}
        >
          Delete
        </button>
      </div>

      {task.subtasks.length > 0 && (
        <ul className="mt-3 space-y-2 pl-7">
          {task.subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-3.5 rounded border-cyan-300/40 bg-transparent text-aurora-soft focus:ring-aurora-soft"
                checked={subtask.done}
                disabled={disabled}
                onChange={(event) =>
                  onToggle({
                    kind: "toggle-subtask",
                    listId,
                    taskId: task.id,
                    subtaskId: subtask.id,
                    done: event.target.checked,
                  })
                }
              />
              <span
                className={`${
                  subtask.done ? "text-cyan-200/60 line-through" : "text-cyan-100"
                }`}
              >
                {subtask.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2 pl-7">
        <input
          value={subtaskDraft}
          disabled={disabled}
          onChange={(event) => setSubtaskDraft(event.target.value)}
          placeholder="Subtask"
          className={`w-full rounded-xl border border-cyan-500/20 bg-transparent px-3 py-1.5 text-xs text-cyan-50 placeholder:text-cyan-200/40 ${inputRing}`}
        />
        <button
          type="button"
          onClick={() => onAddSubtask()}
          disabled={disabled}
          className="rounded-xl border border-aurora-soft/30 px-3 py-1 text-xs font-semibold text-aurora-soft transition hover:bg-aurora-soft hover:text-slate-900"
        >
          Add
        </button>
      </div>
    </div>
  );
}

type ScheduledPanelProps = {
  ctx: ScheduledContext;
  now: number;
};

function ScheduledPanel({ ctx, now }: ScheduledPanelProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [time, setTime] = useState(() => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    return nextHour.toISOString().slice(11, 16);
  });
  const [note, setNote] = useState("");

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const timestamp = new Date(`${date}T${time}:00`);
    const success = await ctx.createTodo({
      title,
      note,
      targetTime: timestamp.toISOString(),
    });
    if (success) {
      setTitle("");
      setNote("");
    }
  };

  return (
    <section className="glass-panel rounded-3xl p-6 text-white shadow-halo">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
            Timed Focus
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Chrono tasks</h2>
        </div>
        <span className="rounded-full border border-aurora-soft/30 px-3 py-1 text-xs text-cyan-100">
          {ctx.todos.length} Logged
        </span>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-5 grid gap-4 rounded-2xl border border-cyan-500/20 bg-black/20 p-4 md:grid-cols-2"
      >
        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
          Task
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`mt-2 w-full rounded-xl border border-cyan-500/30 bg-transparent px-3 py-2 text-sm text-white placeholder:text-cyan-200/40 ${inputRing}`}
            placeholder="Deep work sprint"
            required
          />
        </label>
        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`mt-2 w-full rounded-xl border border-cyan-500/30 bg-transparent px-3 py-2 text-sm text-white ${inputRing}`}
            required
          />
        </label>
        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
          Time
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={`mt-2 w-full rounded-xl border border-cyan-500/30 bg-transparent px-3 py-2 text-sm text-white ${inputRing}`}
            required
          />
        </label>
        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
          Notes
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Attach context or desired outcome"
            className={`mt-2 w-full rounded-xl border border-cyan-500/30 bg-transparent px-3 py-2 text-sm text-white placeholder:text-cyan-200/40 ${inputRing}`}
          />
        </label>
        <button
          type="submit"
          disabled={ctx.mutating}
          className="col-span-full rounded-2xl bg-gradient-to-r from-aurora-soft to-aurora px-4 py-3 text-sm font-semibold uppercase tracking-[0.5em] text-slate-900 shadow-neon transition hover:opacity-90"
        >
          Schedule
        </button>
      </form>

      {ctx.error && (
        <p className="mt-4 rounded-2xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {ctx.error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {ctx.loading ? (
          <p className="animate-pulse text-sm text-cyan-200/70">
            Surfacing upcoming pulses...
          </p>
        ) : ctx.todos.length === 0 ? (
          <p className="text-sm text-cyan-200/80">
            No chronos logged yet. Your next mission goes here.
          </p>
        ) : (
          ctx.todos.map((todo) => {
            const countdown = describeCountdown(todo.targetTime, now);
            return (
              <article
                key={todo.id}
                className="rounded-2xl border border-cyan-500/15 bg-slatepulse/60 p-4"
              >
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p
                      className={`text-lg font-semibold ${
                        todo.done ? "text-cyan-200/60 line-through" : "text-white"
                      }`}
                    >
                      {todo.title}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                      {formatTimestamp(todo.targetTime)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      countdown.overdue
                        ? "border border-red-400/60 text-red-200"
                        : "border border-aurora-soft/40 text-aurora-soft"
                    }`}
                  >
                    {countdown.overdue ? "Overdue" : "Upcoming"}
                  </span>
                </header>
                {todo.note && (
                  <p className="mt-2 text-sm text-cyan-100/80">{todo.note}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ctx.toggleTodo(todo.id, !todo.done)}
                    className="rounded-full border border-aurora-soft/40 px-4 py-1.5 text-xs font-semibold text-aurora-soft transition hover:bg-aurora-soft hover:text-slate-900"
                  >
                    {todo.done ? "Mark Active" : "Mark Done"}
                  </button>
                  <button
                    type="button"
                    onClick={() => ctx.deleteTodo(todo.id)}
                    className="rounded-full border border-red-400/40 px-4 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-400 hover:text-slate-900"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

type NotificationPanelProps = {
  upcoming: ScheduledTodo[];
  now: number;
  loading: boolean;
};

function NotificationPanel({ upcoming, now, loading }: NotificationPanelProps) {
  const clock = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [],
  );

  return (
    <aside className="glass-panel sticky top-6 rounded-3xl p-6 text-white shadow-halo">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
            Notification Rail
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Incoming pulses</h2>
        </div>
        <div className="rounded-2xl border border-aurora-soft/30 px-3 py-1 text-sm font-semibold text-aurora-soft">
          {clock.format(now)}
        </div>
      </div>
      <div className="beam-divider my-4" />

      {loading ? (
        <p className="animate-pulse text-sm text-cyan-200/70">
          Syncing mission control...
        </p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-cyan-200/80">
          No upcoming timers. Add a chrono task to populate this rail.
        </p>
      ) : (
        <ul className="space-y-4">
          {upcoming.map((todo) => {
            const countdown = describeCountdown(todo.targetTime, now);
            const isSoon = countdown.diff < 30 * 60 * 1000 && !countdown.overdue;
            return (
              <li
                key={todo.id}
                className={`rounded-2xl border border-cyan-500/20 px-4 py-3 ${
                  isSoon ? "bg-aurora-soft/10 shadow-neon" : "bg-black/20"
                }`}
              >
                <p className="text-base font-semibold text-white">
                  {todo.title}
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
                  {formatTimestamp(todo.targetTime)}
                </p>
                <p
                  className={`mt-2 text-sm ${
                    countdown.overdue ? "text-red-300" : "text-aurora-soft"
                  }`}
                >
                  {countdown.overdue ? "Delayed by" : "Due in"}{" "}
                  <span className="font-semibold">{countdown.label}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function HeroBanner() {
  return (
    <section className="glass-panel relative overflow-hidden rounded-3xl p-6 text-white shadow-halo">
      <div className="relative z-10">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
          Solo cockpit
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
          Dual-mode todo flow crafted for your personal missions.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-cyan-100/80">
          Spin up nested lists for flexible planning and lock-in chrono tasks
          with live countdowns. All synced through Mongo-backed APIs – no
          accounts, just vibes.
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-aurora/20 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-aurora-soft/30 blur-[120px]" />
      </div>
    </section>
  );
}

export default function TodoDashboard() {
  const simple = useSimpleLists();
  const scheduled = useScheduledTodos();
  const now = useNow();

  const upcoming = useMemo(() => {
    return scheduled.todos
      .filter((todo) => !todo.done)
      .filter((todo) => {
        const target = new Date(todo.targetTime).getTime();
        return !Number.isNaN(target);
      })
      .sort(
        (a, b) =>
          new Date(a.targetTime).getTime() - new Date(b.targetTime).getTime(),
      )
      .slice(0, 5);
  }, [scheduled.todos]);

  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]">
        <div className="space-y-8">
          <HeroBanner />
          <SimpleListsPanel ctx={simple} />
          <ScheduledPanel ctx={scheduled} now={now} />
        </div>
        <NotificationPanel
          upcoming={upcoming}
          now={now}
          loading={scheduled.loading}
        />
      </div>
    </div>
  );
}


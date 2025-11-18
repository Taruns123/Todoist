export type SimpleSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type SimpleTask = {
  id: string;
  title: string;
  done: boolean;
  subtasks: SimpleSubtask[];
};

export type SimpleList = {
  id: string;
  title: string;
  tasks: SimpleTask[];
  createdAt: string;
  updatedAt: string;
};

export type SimpleListActionRequest =
  | {
      kind: "add-task";
      listId: string;
      title: string;
    }
  | {
      kind: "delete-task";
      listId: string;
      taskId: string;
    }
  | {
      kind: "delete-list";
      listId: string;
    }
  | {
      kind: "toggle-task";
      listId: string;
      taskId: string;
      done: boolean;
    }
  | {
      kind: "add-subtask";
      listId: string;
      taskId: string;
      title: string;
    }
  | {
      kind: "toggle-subtask";
      listId: string;
      taskId: string;
      subtaskId: string;
      done: boolean;
    };

export type ScheduledTodo = {
  id: string;
  title: string;
  note?: string;
  targetTime: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledTodoActionRequest =
  | {
      kind: "toggle";
      id: string;
      done: boolean;
    }
  | {
      kind: "delete";
      id: string;
    };

export type ApiErrorResponse = {
  error: string;
};


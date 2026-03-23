import { type Task, useCreateTask, useDeleteTask, useListTasks, useListProjects, useUpdateTask } from "@workspace/api-client-react";
import { Card, Badge, Button, Dialog, Input } from "@/components/ui/shared";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Trello, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const BOARD_COUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'border-slate-500' },
  { id: 'todo', label: 'To Do', color: 'border-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'in_review', label: 'In Review', color: 'border-purple-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' },
];

export default function BoardView() {
  const { data: projects } = useListProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("backlog");
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<string | null>(null);
  
  // Default to first project if none selected
  const activeProjectId = selectedProjectId || projects?.[0]?.id;
  const { data: tasks, isLoading } = useListTasks(activeProjectId || 0, { query: { enabled: !!activeProjectId } });
  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        window.location.reload();
      },
    },
  });
  const updateTaskMutation = useUpdateTask({
    mutation: {
      onError: () => {
        window.location.reload();
      },
    },
  });
  const deleteTaskMutation = useDeleteTask({
    mutation: {
      onError: () => {
        window.location.reload();
      },
    },
  });

  useEffect(() => {
    setBoardTasks(tasks ?? []);
  }, [tasks]);

  const openCreateTask = (status: string) => {
    setDefaultStatus(status);
    setIsCreateOpen(true);
  };

  const handleDragStart = (taskId: number) => {
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTargetStatus(null);
  };

  const moveTaskToStatus = (taskId: number, nextStatus: string) => {
    const taskToMove = boardTasks?.find((task) => task.id === taskId);
    if (!taskToMove || taskToMove.status === nextStatus) {
      setDropTargetStatus(null);
      return;
    }

    setBoardTasks((currentTasks) =>
      currentTasks?.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ) ?? [],
    );

    updateTaskMutation.mutate({
      id: taskId,
      data: {
        sprintId: taskToMove.sprintId,
        title: taskToMove.title,
        description: taskToMove.description,
        status: nextStatus as "backlog" | "todo" | "in_progress" | "in_review" | "done",
        priority: taskToMove.priority,
        type: taskToMove.type,
        assigneeId: taskToMove.assigneeId,
        reporterId: taskToMove.reporterId,
        storyPoints: taskToMove.storyPoints,
        dueDate: taskToMove.dueDate,
        label: taskToMove.label,
        position: taskToMove.position,
      },
    });

    setDropTargetStatus(null);
  };

  const handleDeleteTask = (taskId: number) => {
    setBoardTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );

    deleteTaskMutation.mutate({ id: taskId });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-display text-white flex items-center">
            <Trello className="w-6 h-6 mr-3 text-primary" />
            Global Board
          </h2>
        </div>
        <div>
          <select 
            className="h-10 rounded-lg border border-white/10 bg-black/40 px-4 text-white focus:ring-2 focus:ring-primary focus:outline-none min-w-[200px]"
            value={activeProjectId || ''}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-4 h-[calc(100vh-12rem)] min-w-max px-2">
            {BOARD_COUMNS.map((col) => {
              const colTasks = boardTasks?.filter(t => t.status === col.id) || [];
              
              return (
                <div
                  key={col.id}
                  className={`w-80 flex flex-col h-full rounded-xl border transition-colors ${
                    dropTargetStatus === col.id
                      ? "bg-primary/10 border-primary/40"
                      : "bg-slate-900/40 border-white/5"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedTaskId != null) {
                      setDropTargetStatus(col.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTargetStatus === col.id) {
                      setDropTargetStatus(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTaskId != null) {
                      moveTaskToStatus(draggedTaskId, col.id);
                    }
                    setDraggedTaskId(null);
                  }}
                >
                  <div className={`p-3 border-t-2 ${col.color} shrink-0`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-slate-200 text-sm uppercase tracking-wider">{col.label}</h3>
                      <Badge variant="secondary" className="bg-white/5 text-slate-400">{colTasks.length}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-card hover:bg-slate-800 border-white/5 hover:border-primary/30 transition-all shadow-md group cursor-grab active:cursor-grabbing ${
                          draggedTaskId === task.id ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] uppercase text-slate-400 border-slate-700 bg-slate-800">
                            {task.type}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300"
                                onSelect={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h4 className="text-sm font-medium text-white mb-3">{task.title}</h4>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex -space-x-2">
                             <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-[10px] font-bold text-primary">JD</div>
                          </div>
                          {task.storyPoints && (
                            <span className="text-xs font-mono bg-slate-800 text-slate-400 px-1.5 rounded">{task.storyPoints}</span>
                          )}
                        </div>
                      </Card>
                    ))}
                    
                    <Button
                      variant="ghost"
                      className="w-full text-slate-500 hover:text-white hover:bg-white/5 border border-dashed border-white/10 justify-start"
                      onClick={() => openCreateTask(col.id)}
                      disabled={!activeProjectId}
                    >
                      + Add Task
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Task">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!activeProjectId) {
              return;
            }

            const fd = new FormData(e.currentTarget);
            createTaskMutation.mutate({
              projectId: activeProjectId,
              data: {
                title: fd.get("title") as string,
                description: (fd.get("description") as string) || undefined,
                status: fd.get("status") as "backlog" | "todo" | "in_progress" | "in_review" | "done",
                priority: fd.get("priority") as "low" | "medium" | "high" | "critical",
                type: fd.get("type") as "story" | "task" | "bug" | "epic" | "subtask",
                storyPoints: fd.get("storyPoints") ? Number(fd.get("storyPoints")) : undefined,
                label: (fd.get("label") as string) || undefined,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Task Title</label>
            <Input name="title" required placeholder="e.g. Build approval workflow" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Description</label>
            <textarea
              name="description"
              placeholder="Brief task details..."
              className="flex min-h-24 w-full rounded-lg border border-border bg-input/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select
                name="status"
                defaultValue={defaultStatus}
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {BOARD_COUMNS.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Priority</label>
              <select
                name="priority"
                defaultValue="medium"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Type</label>
              <select
                name="type"
                defaultValue="task"
                className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Story Points</label>
              <Input name="storyPoints" type="number" min="1" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Label</label>
            <Input name="label" placeholder="e.g. backend" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTaskMutation.isPending} disabled={!activeProjectId}>
              Create Task
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

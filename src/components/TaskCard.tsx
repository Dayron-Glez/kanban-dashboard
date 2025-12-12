import type { Task } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Textarea } from "./ui/textarea";

interface Props {
  task: Task;
  deleteTask: (id: number | string) => void;
  updateTask: (id: number | string, content: string) => void;
}

export default function TaskCard({ task, deleteTask, updateTask }: Props) {
  const [editedContent, setEditedContent] = useState(task.content);

  return (
    <Card className="bg-mainBg h-24 min-h-24 justify-center hover:ring-2 hover:ring-inset hover:ring-rose-500 cursor-grab text-md text-white rounded-lg font-bold p-2 my-2 border-transparent">
      <CardHeader className="p-0 flex">
        <CardTitle className="flex items-center justify-between w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-48 truncate block cursor-default">
                  {task.content}
                </span>
              </TooltipTrigger>
              <TooltipContent>{task.content}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex">
            <Sheet
              onOpenChange={(open) => {
                if (open) {
                  setEditedContent(task.content);
                } else {
                  setEditedContent(task.content);
                }
              }}
            >
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="group hover:bg-transparent"
                >
                  <IconEdit className="group-hover:stroke-rose-500" />
                </Button>
              </SheetTrigger>

              <SheetContent className="bg-mainBg border-transparent">
                <SheetHeader>
                  <SheetTitle className=" text-white">Edit Task</SheetTitle>
                  <SheetDescription className=" text-white">
                    Modify the content of this task and click save.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 px-2">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-32"
                  />
                </div>

                <SheetFooter className="mt-6">
                  <SheetClose asChild>
                    <Button
                      type="button"
                      onClick={() => {
                        updateTask(task.id, editedContent);
                      }}
                    >
                      Save changes
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button variant="outline" type="button">
                      Close
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Button
              onClick={() => deleteTask(task.id)}
              variant="ghost"
              size="icon-sm"
              className="group hover:bg-transparent"
            >
              <IconTrash className="group-hover:stroke-rose-500" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
}


import { useState } from 'react';
import {IconPlus} from '@tabler/icons-react';
import { Button } from "@/components/ui/button"
import type { ColumnType } from '../types';
import ColumnContainer from './ColumnContainer';

export default function KanbanBoard() {
    const [columns, setColumns] = useState<ColumnType[]>([]);

    const createNewColumn = (): void => {
        const columnsToAdd: ColumnType = {
            id: generateId(),
            title: `Column ${columns.length + 1}`,
        };
        setColumns([...columns,columnsToAdd]);
    };

    const deleteColumn = (id: number | string) => {
    setColumns(columns.filter(column => column.id !== id));
};

    const generateId = (): number => {
        return Math.floor(Math.random() * 10001)
    }
    

  return (
  <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-10">
    <div className="m-auto flex gap-4">
        <div className='flex gap-4'>{columns.map((column) => (
            <ColumnContainer 
                key={column.id} 
                column={column} 
                deleteColumn={deleteColumn} 
            />
        ))}</div>
       <Button
        onClick={() => createNewColumn()}
        className='group bg-mainBg border border-columnBg ring-2 hover:bg-mainBg hover:ring-rose-500 hover:text-white cursor-pointer'
        variant="outline"
        size="lg"
        >
            <IconPlus className="transition-transform duration-300 group-hover:rotate-45" />
            Add column
        </Button>

    </div>
  </div>
  );
}
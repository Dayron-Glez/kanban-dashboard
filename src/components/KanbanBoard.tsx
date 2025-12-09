
import { useState } from 'react';
import {IconPlus} from '@tabler/icons-react';
import type { ColumnType } from '../types';

export default function KanbanBoard() {
    const [columns, setColumns] = useState<ColumnType[]>([]);

    const createNewColumn = (): void => {
        const columnsToAdd: ColumnType = {
            id: generateId(),
            title: `Column ${columns.length + 1}`,
        };
        setColumns([...columns,columnsToAdd]);
    };

    const generateId = (): number => {
        return Math.floor(Math.random() * 10001)
    }

    console.log(columns);
    

  return (
  <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-10">
    <div className="m-auto">
        <button
        onClick={ () => {
            createNewColumn();
        }}
        className=" flex items-center justify-center gap-2 h-16 w-80 min-w-80 rounded-lg cursor-pointer p-4 bg-mainBg border-2 border-columnBg ring-rose-500 hover:ring-2 hover:border-transparent">
            <IconPlus/>
            Add column
        </button>
        <div>{columns.map((column) => <div key={column.id}>{column.title}</div>)}</div>

    </div>
  </div>
  );
}
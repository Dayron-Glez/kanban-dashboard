
import type { ColumnType } from "../types";
import {IconTrash} from '@tabler/icons-react'
interface Props {
    column: ColumnType;
    deleteColumn: (id: number | string) => void;
}
export default function ColumnContainer({ column, deleteColumn }: Props) {
    return (
        <div className="flex flex-col bg-columnBg rounded-lg w-80 h-[500px] max-h-[500px] p-4">
            <div className="flex items-center justify-between bg-mainBg text-md h-16 cursor-grab rounded-md rounded-b-none font-bold border-columnBg border-4 p-2">
                <div>0</div>
                {column.title}
                <button onClick={() => deleteColumn(column.id)}>
                    <IconTrash className="hover:stroke-red-500 cursor-pointer"/>
                </button>
            </div>
            <div className="flex grow">Content</div>
            <div>Footer</div>
        </div>
    );
}
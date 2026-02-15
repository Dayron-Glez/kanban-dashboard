import { createContext } from "react";

export const SearchContext = createContext<{
  searchValue: string;
  setSearchValue: (value: string) => void;
} | null>(null);

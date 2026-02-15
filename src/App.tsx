import { BrowserRouter, Routes, Route } from "react-router";
import "../tailwind.css";
import MainLayout from "./layouts/MainLayout";
import KanbanBoard from "./features/board/components/KanbanBoard";

export default App;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<KanbanBoard />} />
          {/* <Route path="about" element={<AboutPage />} />
          <Route path="dashboard" element={<DashboardPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

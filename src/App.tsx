import { BrowserRouter, Routes, Route } from "react-router";
import "./App.css";
import KanbanBoard from "./components/KanbanBoard";
import MainLayout from "./layouts/MainLayout";

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

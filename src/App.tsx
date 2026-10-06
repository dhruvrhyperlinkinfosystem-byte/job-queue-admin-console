import { Route, Routes } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<h1 className="p-6 text-xl font-semibold">Job Queue Admin</h1>} />
    </Routes>
  );
}

import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Setup from "./pages/Setup";
import Report from "./pages/Report";
import History from "./pages/History";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview/new" element={<Setup />} />
        <Route path="/interview/:sessionId" element={<Interview />} />
        <Route path="/report/:sessionId" element={<Report />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Layout>
  );
}

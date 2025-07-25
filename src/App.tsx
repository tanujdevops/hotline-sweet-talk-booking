
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple test components without complex dependencies
const TestIndex = () => (
  <div style={{ padding: "20px" }}>
    <h1>SweetyOnCall</h1>
    <p>Home page working</p>
  </div>
);

const TestNotFound = () => (
  <div style={{ padding: "20px" }}>
    <h1>404 - Page Not Found</h1>
  </div>
);

const App = () => {
  console.log("App with router rendered");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestIndex />} />
        <Route path="*" element={<TestNotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

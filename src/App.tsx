
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Simple components without lazy loading
const HomePage = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontSize: '24px'
  }}>
    <h1>SweetyOnCall - Home Page (Updated)</h1>
  </div>
);

const NotFoundPage = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontSize: '24px'
  }}>
    <h1>404 - Page Not Found</h1>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

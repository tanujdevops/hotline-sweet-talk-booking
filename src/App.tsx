
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Loading component
const Loading = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontSize: '18px'
  }}>
    Loading...
  </div>
);

// Test lazy loading
const HomePage = lazy(() => Promise.resolve({
  default: () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      fontSize: '24px'
    }}>
      <h1>SweetyOnCall - Lazy Loaded Home</h1>
    </div>
  )
}));

const NotFoundPage = lazy(() => Promise.resolve({
  default: () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      fontSize: '24px'
    }}>
      <h1>404 - Lazy Loaded Not Found</h1>
    </div>
  )
}));

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

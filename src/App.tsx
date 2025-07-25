
import React from "react";

const App = () => {
  console.log("App component rendered");
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>SweetyOnCall - Test</h1>
      <p>If you can see this, React is working in production!</p>
      <button onClick={() => alert("Click works!")}>Test Button</button>
    </div>
  );
};

export default App;

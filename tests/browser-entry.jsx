import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Field, TextInput } from '../src/index.tsx';
function App() {
  const [count, setCount] = useState(0);
  return <div className="martlet" data-martlet="light"><h1>React test</h1><Field label="Name" hint="Enter a name" error="Name is required">{props => <TextInput {...props} required />}</Field><Button onClick={() => setCount(count + 1)}>Count {count}</Button></div>;
}
createRoot(document.getElementById('root')).render(<App />);

/**
 * App Component
 *
 * Root component for zoh-mvp-v2 Fragment Feed
 */

import React from 'react';
import { Analytics } from "@vercel/analytics/react";
import Feed from './components/Feed/Feed';
import './App.css';

function App() {
  const isDevMode = window.location.pathname === '/dev';

  return (
    <div className="App">
      <Feed modernOnly={isDevMode} />
      <Analytics />
    </div>
  );
}

export default App;

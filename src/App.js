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
  return (
    <div className="App">
      <Feed />
      <Analytics />
    </div>
  );
}

export default App;

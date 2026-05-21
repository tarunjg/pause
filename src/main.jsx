import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ConnectPage from './ConnectPage'

const path = window.location.pathname;
const Page = path === '/connect' ? ConnectPage : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
)

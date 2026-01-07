import '@/index.css';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './core/routes';
import { AuthProvider } from './core/contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
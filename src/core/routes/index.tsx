import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { BaseLayout } from '@/templates/BaseLayout';
import { ProtectedRoute, PublicRoute } from './guards';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Profile from '@/pages/profile';
import Vote from '@/pages/vote';
import Admin from '@/pages/admin';
import Leaderboard from '@/pages/leaderboard';
import BillSplit from '@/pages/bill-split';
import Members from '@/pages/members';

export const router = createBrowserRouter([
  {
    element: <BaseLayout><Outlet /></BaseLayout>,
    children: [
      // Public routes (guest only)
      {
        element: <PublicRoute />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
        ],
      },
      // Protected routes (authenticated only)
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <Vote /> },
          { path: '/profile', element: <Profile /> },
          { path: '/leaderboard', element: <Leaderboard /> },
          { path: '/bills', element: <BillSplit /> },
          { path: '/members', element: <Members /> },
          { path: '/admin', element: <Admin /> },
        ],
      },
      // Catch all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], { basename: '/nhaujs' });

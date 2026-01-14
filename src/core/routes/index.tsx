import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { BaseLayout } from '@/templates/BaseLayout';
import { ProtectedRoute, PublicRoute } from './guards';
import Login from '@/pages/login';
import DU2Login from '@/pages/du2/login';
import Register from '@/pages/register';
import Profile from '@/pages/profile';
import Vote from '@/pages/vote';
import Admin from '@/pages/admin';
import Leaderboard from '@/pages/leaderboard';
import BillSplit from '@/pages/bill-split';
import Members from '@/pages/members';
import OnlyBillView from '@/pages/only-bill';
import OnlyBillAdmin from '@/pages/only-bill-admin';

export const router = createBrowserRouter([
  {
    element: <BaseLayout><Outlet /></BaseLayout>,
    children: [
      // --- NHAU JS ROUTES ---
      {
        element: <PublicRoute />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
        ],
      },
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

      // --- DU2 WE ARE ONE ROUTES ---
      {
        path: '/du2',
        children: [
          {
            element: <PublicRoute />,
            children: [
              { path: '/du2/login', element: <DU2Login /> },
            ],
          },
          {
            element: <ProtectedRoute />,
            children: [
              { index: true, element: <Vote /> },
              { path: '/du2/profile', element: <Profile /> },
              { path: '/du2/leaderboard', element: <Leaderboard /> },
              { path: '/du2/bills', element: <BillSplit /> },
              { path: '/du2/members', element: <Members /> },
              { path: '/du2/admin', element: <Admin /> },
            ],
          },
        ],
      },

      // --- ONLY BILL ROUTES ---
      {
        path: '/only-bill',
        children: [
            { index: true, element: <OnlyBillView /> },
            { path: 'bills', element: <BillSplit /> },
            { 
                element: <ProtectedRoute />,
                children: [
                    { path: 'admin', element: <OnlyBillAdmin /> },
                ]
            },
        ]
      },

      // Catch all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});

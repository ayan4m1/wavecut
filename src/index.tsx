import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';

import './index.scss';

import Layout from './components/Layout';
import SuspenseFallback from './components/SuspenseFallback';
import ErrorBoundary from './components/ErrorBoundary';
import { routes } from './routes';

const rootElem = document.getElementById('root');

if (rootElem) {
  const root = createRoot(rootElem);
  const router = createHashRouter([
    {
      path: '/',
      element: <Layout />,
      errorElement: <ErrorBoundary />,
      children: routes
    }
  ]);

  root.render(
    <Suspense fallback={<SuspenseFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

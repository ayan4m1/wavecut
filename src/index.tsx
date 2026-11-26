import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';

import './index.scss';

import SuspenseFallback from './components/SuspenseFallback';
import { routes } from './routes';

const rootElem = document.getElementById('root');

if (rootElem) {
  const root = createRoot(rootElem);
  const router = createHashRouter(routes);

  root.render(
    <Suspense fallback={<SuspenseFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

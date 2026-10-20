import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { Gallery } from '@/features/dev/Gallery';
import { Placeholder } from '@/features/dev/Placeholder';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Gallery /> },
      { path: '/collabs', element: <Placeholder title="Collabs" /> },
      { path: '/collabs/:id', element: <Placeholder title="Collaboration" /> },
      { path: '/payments', element: <Placeholder title="Payments" /> },
      {
        path: '/rights',
        element: (
          <Placeholder title="Rights" subtitle="Ad usage windows run from the go-live date." />
        ),
      },
      { path: '/settings', element: <Placeholder title="Settings" /> },
      { path: '*', element: <Placeholder title="Not found" /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

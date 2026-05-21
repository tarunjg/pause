import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ConnectPage from './ConnectPage';
import AdminLayout from './admin/AdminLayout';
import DashboardPage from './admin/DashboardPage';
import ComposePage from './admin/ComposePage';
import PostsPage from './admin/PostsPage';
import ContactsPage from './admin/ContactsPage';
import ImagesPage from './admin/ImagesPage';
import BlogIndexPage from './blog/BlogIndexPage';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/connect', element: <ConnectPage /> },
  { path: '/blog', element: <BlogIndexPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'compose', element: <ComposePage /> },
      { path: 'compose/:id', element: <ComposePage /> },
      { path: 'posts', element: <PostsPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'images', element: <ImagesPage /> },
    ],
  },
]);

export default router;

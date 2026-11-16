import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingState } from './components/Primitives';
import DashboardLayout from './layouts/DashboardLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ExploreProjectsPage from './pages/ExploreProjectsPage';
import FreelancersPage from './pages/FreelancersPage';
import FreelancerDetailsPage from './pages/FreelancerDetailsPage';
import DashboardPage from './pages/DashboardPage';
import MyProjectsPage from './pages/MyProjectsPage';
import SavedProjectsPage from './pages/SavedProjectsPage';
import PostProjectPage from './pages/PostProjectPage';
import ProposalsPage from './pages/ProposalsPage';
import ContractsPage from './pages/ContractsPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ReviewsPage from './pages/ReviewsPage';
import AdminPage from './pages/AdminPage';
import TeamProjectsPage from './pages/TeamProjectsPage';
import SmartMatchPage from './pages/SmartMatchPage';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace/>;
  return children;
}
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState/>;
  return user ? <Navigate to="/app/dashboard" replace/> : children;
}
function Workspace({ children, roles }) {
  return <Protected roles={roles}><DashboardLayout/>{children}</Protected>;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/projects" element={<ExploreProjectsPage publicMode/>}/>
    <Route path="/freelancers" element={<FreelancersPage publicMode/>}/>
    <Route path="/freelancers/:id" element={<FreelancerDetailsPage/>}/>
    <Route path="/login" element={<GuestOnly><AuthPage mode="login"/></GuestOnly>}/>
    <Route path="/register" element={<GuestOnly><AuthPage mode="register"/></GuestOnly>}/>
    <Route path="/app" element={<Protected><DashboardLayout/></Protected>}>
      <Route index element={<Navigate to="dashboard" replace/>}/>
      <Route path="dashboard" element={<DashboardPage/>}/>
      <Route path="smartmatch" element={<Protected roles={['FREELANCER']}><SmartMatchPage/></Protected>}/>
      <Route path="find-projects" element={<Protected roles={['FREELANCER']}><ExploreProjectsPage/></Protected>}/>
      <Route path="saved-projects" element={<Protected roles={['FREELANCER']}><SavedProjectsPage/></Protected>}/>
      <Route path="my-projects" element={<Protected roles={['CLIENT']}><MyProjectsPage/></Protected>}/>
      <Route path="post-project" element={<Protected roles={['CLIENT']}><PostProjectPage/></Protected>}/>
      <Route path="find-freelancers" element={<Protected roles={['CLIENT']}><FreelancersPage/></Protected>}/>
      <Route path="proposals" element={<Protected roles={['FREELANCER','CLIENT']}><ProposalsPage/></Protected>}/>
      <Route path="teams" element={<Protected roles={['CLIENT','FREELANCER']}><TeamProjectsPage/></Protected>}/>
      <Route path="teams/:projectId" element={<Protected roles={['CLIENT','FREELANCER']}><TeamProjectsPage/></Protected>}/>
      <Route path="contracts" element={<ContractsPage/>}/>
      <Route path="contracts/:id" element={<ContractsPage/>}/>
      <Route path="messages" element={<MessagesPage/>}/>
      <Route path="messages/:userId" element={<MessagesPage/>}/>
      <Route path="notifications" element={<NotificationsPage/>}/>
      <Route path="reviews" element={<ReviewsPage/>}/>
      <Route path="profile" element={<ProfilePage/>}/>
      <Route path="admin/:section" element={<Protected roles={['ADMIN']}><AdminPage/></Protected>}/>
      <Route path="*" element={<Navigate to="/app/dashboard" replace/>}/>
    </Route>
    <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/'} replace/>}/>
  </Routes>;
}

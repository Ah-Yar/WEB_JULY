import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from '../components/common/Loading.jsx';
import Home from '../pages/public/Home.jsx';
import PublicProfile from '../pages/public/PublicProfile.jsx';
import BookingPage from '../pages/client/BookingPage.jsx';
import IntakePage from '../pages/client/IntakePage.jsx';
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import Dashboard from '../pages/therapist/Dashboard.jsx';
import Analytics from '../pages/therapist/Analytics.jsx';
import Profile from '../pages/therapist/Profile.jsx';
import Availability from '../pages/therapist/Availability.jsx';
import Schedule from '../pages/therapist/Schedule.jsx';
import Clients from '../pages/therapist/Clients.jsx';
import ClientDetail from '../pages/therapist/ClientDetail.jsx';
import Billing from '../pages/therapist/Billing.jsx';
import Notes from '../pages/therapist/Notes.jsx';
import Messages from '../pages/therapist/Messages.jsx';
import Payment from '../pages/client/Payment.jsx';
import PackagePurchase from '../pages/client/PackagePurchase.jsx';
import Portal from '../pages/client/Portal.jsx';

function Protected({ children }) {
  const { therapist, isLoading } = useAuth(); const location = useLocation();
  // A protected screen may only mount when both pieces of a browser session exist.
  // This prevents an orphaned localStorage profile from firing unauthenticated API requests.
  const hasToken = Boolean(localStorage.getItem('unfazed_token'));
  if (isLoading) return <div className="page-loading"><Loading label="Restoring your practice"/></div>;
  if (!therapist || !hasToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
function PublicOnly({ children }) { const { therapist, isLoading } = useAuth(); const hasToken = Boolean(localStorage.getItem('unfazed_token')); if (isLoading) return <div className="page-loading"><Loading/></div>; return therapist && hasToken ? <Navigate to="/app/dashboard" replace/> : children; }
function NotFound() { return <main className="public-page public-page--simple"><div className="not-found"><span>u</span><h1>This page isn't here.</h1><p>It may have moved, or the link may be incomplete.</p><a className="button button--primary" href="/">Back to Unfazed</a></div></main>; }

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<PublicOnly><Login/></PublicOnly>}/>
    <Route path="/register" element={<PublicOnly><Register/></PublicOnly>}/>
    <Route path="/app/dashboard" element={<Protected><Dashboard/></Protected>}/>
    <Route path="/app/analytics" element={<Protected><Analytics/></Protected>}/>
    <Route path="/app/profile" element={<Protected><Profile/></Protected>}/>
    <Route path="/app/availability" element={<Protected><Availability/></Protected>}/>
    <Route path="/app/schedule" element={<Protected><Schedule/></Protected>}/>
    <Route path="/app/clients" element={<Protected><Clients/></Protected>}/>
    <Route path="/app/clients/:clientId" element={<Protected><ClientDetail/></Protected>}/>
    <Route path="/app/billing" element={<Protected><Billing/></Protected>}/>
    <Route path="/app/notes" element={<Protected><Notes/></Protected>}/>
    <Route path="/app/messages" element={<Protected><Messages/></Protected>}/>
    <Route path="/portal" element={<Portal/>}/>
    <Route path="/:slug/book" element={<BookingPage/>}/>
    <Route path="/:slug/packages" element={<PackagePurchase/>}/>
    <Route path="/:slug/payment" element={<Payment/>}/>
    <Route path="/:slug/intake" element={<IntakePage/>}/>
    <Route path="/:slug" element={<PublicProfile/>}/>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}

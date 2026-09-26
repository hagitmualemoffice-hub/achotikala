import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { IS_OFFLINE_BUILD } from "./offline/offlineContent";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import IndexV1 from "./pages/IndexV1.tsx";
import IndexV2 from "./pages/IndexV2.tsx";
import Blog from "./pages/Blog.tsx";
import BlogSection from "./pages/BlogSection.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Podcast from "./pages/Podcast.tsx";
import Events from "./pages/Events.tsx";
import FertilityPreservation from "./pages/FertilityPreservation.tsx";
import LifneyHashiava from "./pages/LifneyHashiava.tsx";
import MidaaLehachlata from "./pages/MidaaLehachlata.tsx";
import LifneyHatahalich from "./pages/LifneyHatahalich.tsx";
import LifneyChibur from "./pages/LifneyChibur.tsx";
import ShimurTahalich from "./pages/ShimurTahalich.tsx";
import AchareiHashiava from "./pages/AchareiHashiava.tsx";
import YotzotLaorYear from "./pages/YotzotLaorYear.tsx";
import TuBeavAwareness from "./pages/TuBeavAwareness.tsx";
import ApiTester from "./pages/ApiTester.tsx";
import Download from "./pages/Download.tsx";
import Install from "./pages/Install.tsx";
import Community from "./pages/Community.tsx";
import CommunityV1 from "./pages/CommunityV1.tsx";
import LibaLanding from "./pages/LibaLanding.tsx";
import Apartments from "./pages/Apartments.tsx";
import Hadassah from "./pages/Hadassah.tsx";
import BaarPage from "./pages/BaarPage.tsx";
import PlacesPage from "./pages/PlacesPage";
import SearchPage from "./pages/SearchPage";
import PersonalArea from "./pages/PersonalArea.tsx";
import LibaMessagesPage from "./pages/LibaMessagesPage.tsx";
import AuthBridge from "./pages/AuthBridge.tsx";
import NotFound from "./pages/NotFound.tsx";
import ScrollToTop from "./components/ScrollToTop";
import AwarenessFloatingButton from "./components/AwarenessFloatingButton";
import PreviewBanner from "./components/PreviewBanner";
import { LanguageProvider } from "./i18n/LanguageContext";
import TranslationOverlay from "./i18n/TranslationOverlay";
import { LibaChatProvider } from "./community/v1/LibaMessages";
import { CommunitySessionProvider } from "./community/useCommunitySession";
import AdminLogin from "./admin/pages/AdminLogin.tsx";
import AdminResetPassword from "./admin/pages/AdminResetPassword.tsx";
import { OfflineContentProvider } from "./offline/offlineContent";
import ContentVersionBar from "./offline/ContentVersionBar";

import AdminLayout from "./admin/components/AdminLayout.tsx";
import AdminDashboard from "./admin/pages/AdminDashboard.tsx";
import AdminBlogList from "./admin/pages/AdminBlogList.tsx";
import AdminBlogEditor from "./admin/pages/AdminBlogEditor.tsx";
import AdminEventsList from "./admin/pages/AdminEventsList.tsx";
import AdminEventEditor from "./admin/pages/AdminEventEditor.tsx";
import AdminEventTemplates from "./admin/pages/AdminEventTemplates.tsx";
import AdminPodcast from "./admin/pages/AdminPodcast.tsx";
import AdminMedia from "./admin/pages/AdminMedia.tsx";
import AdminLeads from "./admin/pages/AdminLeads.tsx";
import AdminUsers from "./admin/pages/AdminUsers.tsx";
import AdminPulse from "./admin/pages/AdminPulse.tsx";
import AdminQuiz from "./admin/pages/AdminQuiz.tsx";
import AdminRotatingContent from "./admin/pages/AdminRotatingContent.tsx";
import AdminInquiries from "./admin/pages/AdminInquiries.tsx";

// Offline (file://) uses HashRouter: either a dedicated offline build
// (VITE_OFFLINE_BUILD) or the shell marked us at runtime (ACHOTIKALA_OFFLINE_HOST).
const isOfflineHost =
  IS_OFFLINE_BUILD ||
  (typeof window !== "undefined" &&
    Boolean((window as unknown as { ACHOTIKALA_OFFLINE_HOST?: unknown }).ACHOTIKALA_OFFLINE_HOST));
const Router = isOfflineHost ? HashRouter : BrowserRouter;

const LibaRedirect = () => {
  const location = useLocation();
  const target =
    location.pathname.replace(/^\/kehila-v1/, "/liba") +
    location.search +
    location.hash;
  return <Navigate to={target} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <OfflineContentProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <ScrollToTop />
          <PreviewBanner />
          <TranslationOverlay />
          <CommunitySessionProvider>
          <LibaChatProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/v1" element={<IndexV1 />} />
            <Route path="/v2" element={<IndexV2 />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/section/:section" element={<BlogSection />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/podcast" element={<Podcast />} />
            <Route path="/download" element={<Download />} />
            <Route path="/install" element={<Install />} />
            <Route path="/events" element={<Events />} />
            <Route path="/shimur-poriut" element={<FertilityPreservation />} />
            <Route path="/lifney-hashiava" element={<LifneyHashiava />} />
            <Route path="/midaa-lehachlata" element={<MidaaLehachlata />} />
            <Route path="/lifney-chibur" element={<LifneyChibur />} />
            <Route path="/lifney-hatahalich" element={<LifneyHatahalich />} />
            <Route path="/shimur-tahalich" element={<ShimurTahalich />} />
            <Route path="/acharei-hashiava" element={<AchareiHashiava />} />
            <Route path="/yotzot-laor-year" element={<YotzotLaorYear />} />
            <Route path="/yom-hamodaut" element={<TuBeavAwareness />} />
            <Route path="/api-tester" element={<ApiTester />} />
            <Route path="/kehila" element={<Community />} />
            <Route path="/liba" element={<CommunityV1 />} />
            <Route path="/liba/baar" element={<BaarPage />} />
            <Route path="/liba/mekomot" element={<PlacesPage />} />
            <Route path="/liba/dirot" element={<Apartments />} />
            <Route path="/liba/ezor-ishi" element={<PersonalArea />} />
            <Route path="/liba/sheli" element={<PersonalArea />} />
            <Route path="/liba/messages" element={<LibaMessagesPage />} />
            <Route path="/liba/hipus" element={<SearchPage />} />
            <Route path="/liba-landing" element={<LibaLanding />} />
            <Route path="/kehila-v1/*" element={<LibaRedirect />} />
            <Route path="/apartments" element={<Apartments />} />
            <Route path="/luach-dirot" element={<Apartments />} />
            <Route path="/hadassah" element={<Hadassah />} />
            <Route path="/auth-bridge" element={<AuthBridge />} />


            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="blog" element={<AdminBlogList />} />
              <Route path="blog/new" element={<AdminBlogEditor />} />
              <Route path="blog/:id" element={<AdminBlogEditor />} />
              <Route path="events" element={<AdminEventsList />} />
              <Route path="events/new" element={<AdminEventEditor />} />
              <Route path="events/templates" element={<AdminEventTemplates />} />
              <Route path="events/:id" element={<AdminEventEditor />} />
              <Route path="podcast" element={<AdminPodcast />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="pulse" element={<AdminPulse />} />
              <Route path="rotating-content" element={<AdminRotatingContent />} />
              <Route path="quiz" element={<AdminQuiz />} />
              <Route path="inquiries" element={<AdminInquiries />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </LibaChatProvider>
          </CommunitySessionProvider>
          <AwarenessFloatingButton />
          <ContentVersionBar />
        </Router>
      </TooltipProvider>
      </OfflineContentProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

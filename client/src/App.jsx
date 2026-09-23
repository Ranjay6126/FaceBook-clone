import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Timeline from "./pages/Timeline";
import FriendsPage from "./pages/FriendsPage";
import ProfilePage from "./pages/ProfilePage";
import SavedPage from "./pages/SavedPage";
import WatchPage from "./pages/WatchPage";
import MemoriesPage from "./pages/MemoriesPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import MarketplacePage from "./pages/MarketplacePage";
import MessagesPage from "./pages/MessagesPage";
import ReelsPage from "./pages/ReelsPage";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import ChatDock from "./components/ChatDock";
import CallOverlay from "./components/CallOverlay";
import MobileBottomNav from "./components/MobileBottomNav";
import { getUser } from "./utils/storage";
import "./App.css";

function RequireAuth({ children }) {
  if (!getUser()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <CallProvider>
        <Routes>
        <Route path="/" element={<Timeline />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/friends"
          element={
            <RequireAuth>
              <FriendsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/saved"
          element={
            <RequireAuth>
              <SavedPage />
            </RequireAuth>
          }
        />
        <Route
          path="/watch"
          element={
            <RequireAuth>
              <WatchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/memories"
          element={
            <RequireAuth>
              <MemoriesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/reels"
          element={
            <RequireAuth>
              <ReelsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/gaming"
          element={
            <RequireAuth>
              <PlaceholderPage
                kind="gaming"
                title="Gaming"
                text="Play cloud games, watch live streams, and connect with gamers in your network. Gaming hub will be available soon!"
              />
            </RequireAuth>
          }
        />
        <Route
          path="/groups"
          element={
            <RequireAuth>
              <PlaceholderPage
                kind="groups"
                title="Groups"
                text="Groups aren't available in this demo yet. Create a page for your community later!"
              />
            </RequireAuth>
          }
        />
        <Route
          path="/marketplace"
          element={
            <RequireAuth>
              <MarketplacePage />
            </RequireAuth>
          }
        />
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <MessagesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <PlaceholderPage
                kind="notifications"
                title="Notifications"
                text="Pull to refresh notifications. Real notifications show up as badges on the home icon above!"
              />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChatDock />
          <CallOverlay />
          <MobileBottomNav />
        </CallProvider>
      </ChatProvider>
    </BrowserRouter>
  );
}
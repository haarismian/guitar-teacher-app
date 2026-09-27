import { useEffect } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Jam from './pages/Jam';
import { Curriculum, LessonPage } from './pages/Learn';
import { LickList, LickPage } from './pages/Licks';
import Practice from './pages/Practice';
import Progress from './pages/Progress';
import { SongEditor, SongList, SongPage } from './pages/Songs';
import Tools from './pages/Tools';

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/learn', label: 'Learn', icon: '📘' },
  { to: '/songs', label: 'Songs', icon: '🎵' },
  { to: '/jam', label: 'Jam', icon: '🎸' },
  { to: '/licks', label: 'Licks', icon: '⚡' },
  { to: '/tools', label: 'Tools', icon: '🧰' },
  { to: '/progress', label: 'Progress', icon: '📈' },
];

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <div className="app">
        <nav className="nav">
          <div className="brand">🎸 Fretwise</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/learn" element={<Curriculum />} />
            <Route path="/learn/:id" element={<LessonPage />} />
            <Route path="/songs" element={<SongList />} />
            <Route path="/songs/new" element={<SongEditor />} />
            <Route path="/songs/:id" element={<SongPage />} />
            <Route path="/songs/:id/edit" element={<SongEditor />} />
            <Route path="/jam" element={<Jam />} />
            <Route path="/licks" element={<LickList />} />
            <Route path="/licks/:id" element={<LickPage />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

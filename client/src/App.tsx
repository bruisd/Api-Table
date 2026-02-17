import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainPage from './pages/MainPage';
import SharedView from './components/SharedView';

export default function App() {
  return (
    <>
      <Header />
      <main className="main-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/s/:id" element={<SharedView />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

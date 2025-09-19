import { useState } from "react";
import { BotGame } from "./components/BotGame";
import { HomeScreen } from "./components/HomeScreen";
import { OfflineGame } from "./components/OfflineGame";
import { OnlineGame } from "./components/OnlineGame";
import { Footer } from "./components/links.jsx";

const MODES = {
  HOME: "home",
  OFFLINE: "offline",
  ONLINE: "online",
  BOT: "bot",
};

function App() {
  const [mode, setMode] = useState(MODES.HOME);

  const handleGoHome = () => {
    setMode(MODES.HOME);
  };

  return (
    <main className="app-shell">
      {mode === MODES.HOME && <HomeScreen onSelectMode={setMode} />}
      {mode === MODES.OFFLINE && <OfflineGame onGoHome={handleGoHome} />}
      {mode === MODES.ONLINE && <OnlineGame onGoHome={handleGoHome} />}
      {mode === MODES.BOT && <BotGame onGoHome={handleGoHome} />}
      <Footer />
    </main>
  );
}

export default App;

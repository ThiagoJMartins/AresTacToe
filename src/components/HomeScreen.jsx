import PropTypes from "prop-types";
import logo from "../assets/logo.svg";
import { TURN_ICONS } from "./constants";

const modeDescriptions = {
  offline: "Juega con un amigo en el mismo dispositivo.",
  online: "Creá o unite a una sala privada y enfrentate online.",
  bot: "Practica contra el bot inteligente para mejorar tus jugadas.",
};

export function HomeScreen({ onSelectMode }) {
  return (
    <section className="home-screen">
      <img src={logo} width={80} alt="Ares Tac Toe" className="home-logo" />
      <h1>Ares Tac Toe</h1>
      <p className="home-subtitle">
        Elegí cómo querés jugar: local, contra la IA o mediante salas online
        protegidas con contraseña.
      </p>

      <div className="mode-buttons">
        <button
          type="button"
          onClick={() => onSelectMode("offline")}
          className="mode-button"
        >
          <span className="mode-title">Juego Local</span>
          <span className="mode-description">{modeDescriptions.offline}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("online")}
          className="mode-button"
        >
          <span className="mode-title">Juego Online</span>
          <span className="mode-description">{modeDescriptions.online}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("bot")}
          className="mode-button"
        >
          <span className="mode-title">Jugar Solo</span>
          <span className="mode-description">{modeDescriptions.bot}</span>
        </button>
      </div>

      <div className="home-icons" aria-hidden>
        <span>{TURN_ICONS.X}</span>
        <span>vs</span>
        <span>{TURN_ICONS.O}</span>
      </div>
    </section>
  );
}

HomeScreen.propTypes = {
  onSelectMode: PropTypes.func.isRequired,
};

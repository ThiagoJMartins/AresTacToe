import github from "../assets/github.svg";
import linkedin from "../assets/linkedin.svg";
import portfolio from "../assets/portfolio.svg";

export function Footer() {
  return (
    <footer className="footer">
      <p>Developed by Ares WebDev</p>
      <a
        className="links"
        href="https://linkedin.com/in/thiago-javier-martins"
        target="_blank"
        rel="noreferrer"
      >
        <img src={linkedin} width={30} />
      </a>
      <a
        className="links"
        href="https://thiagomartins.vercel.app"
        target="_blank"
        rel="noreferrer"
      >
        <img src={portfolio} width={30} />
      </a>
      <a
        className="links"
        href="https://github.com/thiagojmartins"
        target="_blank"
        rel="noreferrer"
      >
        <img src={github} width={30} />
      </a>
    </footer>
  );
}

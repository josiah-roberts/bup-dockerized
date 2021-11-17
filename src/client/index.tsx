import { render } from "preact";
import "./index.css";
import { Application } from "./Application";

render(
  <Application />,
  document.body,
  document.getElementById("app-root") ?? undefined
);

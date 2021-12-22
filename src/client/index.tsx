import { render } from "preact";
import "./index.css";
import { WrappedApplication } from "./Application";

render(
  <WrappedApplication />,
  document.body,
  document.getElementById("app-root") ?? undefined
);

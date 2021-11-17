import React, { render } from "preact";
import "./index.css";
import { Application } from "./Application";

render(
  <>
    Outer
    <Application />
  </>,
  document.getElementById("app-root")!
);

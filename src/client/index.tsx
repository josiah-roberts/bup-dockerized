import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { Application } from "./Application";

ReactDOM.render(<Application />, document.getElementById("app-root"), () => {
  document.title = "Bup";
});

import React from "react";
import Nav from "react-bootstrap/Nav";
import RBNavbar from "react-bootstrap/Navbar";
import ReactDOM from "react-dom";
import { BrowserRouter, Link, Route } from "react-router-dom";

import PhylotreeApplication from "./PhylotreeApplication.jsx";

import "bootstrap/dist/css/bootstrap.min.css";

function NavLink(props) {
  return (<Nav.Link as={Link} to={props.to}>
    {props.header}
  </Nav.Link>);
}

function Navbar() {
  return (<RBNavbar bg="light">
    <RBNavbar.Brand>
      React Phylotree
    </RBNavbar.Brand>
    {/* <Nav className="mr-auto">
      <NavLink to="/" header="Application" />
    </Nav> */}
  </RBNavbar>);
}

function App() {
  return (<BrowserRouter>
    <div>
      <Navbar />
      <div style={{ maxWidth: 1140 }} className="container-fluid"> 
        <Route path="/"> 
          <PhylotreeApplication />
        </Route>
      </div>
    </div>
  </BrowserRouter>);
}

ReactDOM.render(
  <App />,
  document.body.appendChild(document.createElement("div"))
);


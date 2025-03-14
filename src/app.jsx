import React from "react";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import RBNavbar from "react-bootstrap/Navbar";
import ReactDOM from "react-dom";
import { BrowserRouter, Link, Route } from "react-router-dom";

import PhylotreeApplication from "./components/PhylotreeApplication.jsx";

import "bootstrap/dist/css/bootstrap.min.css";
import { Switch } from "react-router-dom/cjs/react-router-dom.min.js";

function DropdownLink(props) {
  return (<NavDropdown.Item as={Link} to={props.to}>
    {props.header}
  </NavDropdown.Item>);
}

// function NavLink(props) {
//   return (<Nav.Link as={Link} to={props.to}>
//     {props.header}
//   </Nav.Link>);
// }

function Navbar() {
  return (<RBNavbar bg="light">
    <RBNavbar.Brand>
      Visualization
    </RBNavbar.Brand>
    <Nav className="mr-auto">
      {/* <NavLink to="/" header="Application" /> */}
      <NavDropdown title="Tools">
        <DropdownLink to="/" header="Phylotree" />
        <DropdownLink to="#" header="Sequence Alignment" />
        <DropdownLink to="#" header="Haplotype Network" />
      </NavDropdown>
    </Nav>
  </RBNavbar>);
}

function App() {
  return (<BrowserRouter>
    <div>
      <Navbar />
      <div style={{ maxWidth: 1140 }} className="container-fluid"> 
        <Switch>
          <Route path="/"> 
            <PhylotreeApplication />
          </Route>
        </Switch>
      </div>
    </div>
  </BrowserRouter>);
}

ReactDOM.render(
  <App />,
  document.body.appendChild(document.createElement("div"))
);


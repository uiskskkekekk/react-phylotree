import {
  faAlignLeft,
  faAlignRight,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faSortAmountUp
} from "@fortawesome/free-solid-svg-icons"; //icona
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; //icons
import React, { Component } from "react";
import RBButton from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import Phylotree from "./phylotree.jsx";

import "./styles/phylotree.css";


function Button(props) {
  return (<OverlayTrigger
    placement="top"
    overlay={<Tooltip>
      {props.title}
    </Tooltip>}
  >
    <RBButton
      variant="secondary"
      {...props}
    >
      {props.children}
    </RBButton>
  </OverlayTrigger>);
}

function HorizontalExpansionButton(props) {
  return (<Button
    style={{ fontSize: 10 }}
    title="Expand horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowLeft} />
    <FontAwesomeIcon key={2} icon={faArrowRight} />
  </Button>);
}

function HorizontalCompressionButton(props) {
  return (<Button
    style={{ fontSize: 10 }}
    title="Compress horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowRight} />
    <FontAwesomeIcon key={2} icon={faArrowLeft} />
  </Button>);
}

function VerticalExpansionButton(props) {
  return (<Button
    style={{fontSize: 10, display: "flex", flexDirection: "column"}}
    title="Expand vertically"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowUp} />
    <FontAwesomeIcon key={2} icon={faArrowDown} />
  </Button>);
}

function VerticalCompressionButton(props) {
  return (<Button
    style={{fontSize: 10, display: "flex", flexDirection: "column"}}
    title="Compress vertically"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowDown} />
    <FontAwesomeIcon key={2} icon={faArrowUp} />
  </Button>);
}


function AscendingSortButton(props) {
  return (<Button
    title="Sort in ascending order"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faSortAmountUp} flip="vertical"/>
  </Button>);
}


function DescendingSortButton(props) {
  return (<Button
    title="Sort in descending order"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faSortAmountUp}/>
  </Button>);
}


function AlignTipsRightButton(props) {   //節點名稱對稱
  return (<Button
    title="Align tips to right"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faAlignRight}/>
  </Button>);
}


function AlignTipsLeftButton(props) {   //節點名稱貼齊
  return (<Button
    title="Align tips to left"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faAlignLeft}/>
  </Button>);
}


class PhylotreeApplication extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tree: null,
      width: 500,
      height: 500,
      alignTips: "right",
      sort: null,
      internal: false,
      clickedBranch: null,
      newick: ""
    };
    this.handleFileChange = this.handleFileChange.bind(this);
  }

  handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newick = e.target.result;
        this.setState({ newick });
      };
      reader.readAsText(file);
    }
  }
  // componentDidMount() {
  //   text("data/CD2.new")
  //     .then(newick => {
  //       this.setState({newick});
  //     });
  // }
  toggleDimension(dimension, direction) {  //調整樹寬樹高
    const new_dimension = this.state[dimension] +
      (direction == "expand" ? 40 : -40),  //增長或縮短
      new_state = {};
    new_state[dimension] = new_dimension;
    this.setState(new_state);
  }

  handleSort(direction) {
    this.setState({sort: direction});
  }

  alignTips(direction) {
    this.setState({alignTips: direction});
  }

  render() {
    const { padding } = this.props;
    const { width, height, clickedBranch } = this.state;
    return (<div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
      <h1>React Phylotree</h1>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <div className="phylotree-application">
          <div className="file-input-container">
            <input type="file" accept=".nwk" onChange={this.handleFileChange} />
            {/* Render the rest of your component here */}
          </div>
          <div className="button-group-container">
            <ButtonGroup>
              <VerticalExpansionButton
                onClick={()=>this.toggleDimension("height", "expand")}
              />
              <VerticalCompressionButton
                onClick={()=>this.toggleDimension("height", "compress")}
              />
              <HorizontalExpansionButton
                onClick={()=>this.toggleDimension("width", "expand")}
              />
              <HorizontalCompressionButton
                onClick={()=>this.toggleDimension("width", "compress")}
              />
              <AscendingSortButton
                onClick={()=>this.handleSort("ascending")}
              />
              <DescendingSortButton
                onClick={()=>this.handleSort("descending")}
              />
              <AlignTipsLeftButton
                onClick={()=>this.alignTips("left")}
              />
              <AlignTipsRightButton
                onClick={()=>this.alignTips("right")}
              />
            </ButtonGroup>
            <input
              type='checkbox'
              onChange={()=>this.setState({internal: !this.state.internal})}
            />
            {this.state.internal ? 'Hide' : 'Show'} internal labels
            {/* <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: "20px" }}> */}
              {/* 动态调整宽度 */}
              <div>
                <label>Width: {width}px</label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  value={width}
                  step="10"
                  onChange={(e) => this.setState({ width: parseInt(e.target.value, 10) })}
                />
              </div>

              {/* 动态调整高度 */}
              <div>
                <label>Height: {height}px</label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  value={height}
                  step="10"
                  onChange={(e) => this.setState({ height: parseInt(e.target.value, 10) })}
                />
              </div>
            {/* </div> */}
          </div> {/*button group container*/}
        </div> {/*phylotree container*/}
      </div>
      <svg width={width} height={height}>
        {/*這裡呼叫Phylotree，Phylotree會在呼叫Branch*/}
        <Phylotree
          width={width-2*padding}
          height={height-2*padding}
          transform={`translate(${padding}, ${padding})`}
          newick={this.state.newick}
          alignTips={this.state.alignTips}
          sort={this.state.sort}
          internalNodeLabels={this.state.internal}
          onBranchClick={branch => {
            this.setState({clickedBranch: branch.target.data.name})
          }}
          includeBLAxis
        />
      </svg>
      {clickedBranch ? <p>
        Last clicked branch was {clickedBranch}.
      </p> : null}
    </div>);
  }
}

PhylotreeApplication.defaultProps = {
  padding: 10
};

export default PhylotreeApplication;
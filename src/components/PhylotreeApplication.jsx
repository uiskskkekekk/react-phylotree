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

import ContextMenu from "./phylotree/ContextMenu.jsx"; // 導入 ContextMenu 組件
import Phylotree from "./phylotree/phylotree.jsx";

import "../styles/phylotree.css";


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
      alignTips: "left",
      sort: null,
      internal: false,
      clickedBranch: null,
      newick: "",
      width: 500,  // 默認寬度
      height: 500, // 默認高度
      collapsedNodes: new Set(), // 折疊節點集合
      // ContextMenu 狀態
      contextMenu: {
        visible: false,
        position: { x: 0, y: 0 },
        nodeId: null,
        nodeData: null
      },
      treeInstance: null,
      currentThreshold: null
    };
    
    // 綁定方法
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleContextMenuEvent = this.handleContextMenuEvent.bind(this);
    this.closeContextMenu = this.closeContextMenu.bind(this);
    this.toggleNode = this.toggleNode.bind(this);
    this.handleCollapseSubtree = this.handleCollapseSubtree.bind(this);
    this.exportModifiedNewick = this.exportModifiedNewick.bind(this);
  }

  // 檔案上傳處理
  handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newick = e.target.result;
        
        // this.setState({ newick });
        this.setState({
          newick,  // 設置新的 newick 字符串
          tree: null,  // 重置樹實例
          treeInstance: null,  // 重置樹實例
          alignTips: "left",  // 恢復默認對齊
          sort: null,  // 清除排序
          internal: false,  // 隱藏內部標簽
          clickedBranch: null,  // 清除點擊分支
          collapsedNodes: new Set(),  // 清除所有折疊節點
          currentThreshold: null,  // 清除當前閾值
          contextMenu: {  // 重置右鍵菜單
            visible: false,
            position: { x: 0, y: 0 },
            nodeId: null,
            nodeData: null
          }
        });
      };
      reader.readAsText(file);
    }
  }

  // 處理尺寸變化
  handleDimensionsChange = ({ width, height }) => {
    this.setState({ width, height });
  }

  // 調整樹寬樹高
  toggleDimension(dimension, direction) {  
    const new_dimension = this.state[dimension] +
      (direction === "expand" ? 40 : -40),  //增長或縮短
      new_state = {};
    new_state[dimension] = new_dimension;
    this.setState(new_state);
  }

  // 處理排序
  handleSort(direction) {
    this.setState({sort: direction});
  }

  // 處理節點對齊
  alignTips(direction) {
    this.setState({alignTips: direction});
  }

  // 處理 ContextMenu 事件
  handleContextMenuEvent(event) {
    this.setState({
      contextMenu: event
    });
  }

  // 關閉 ContextMenu
  closeContextMenu() {
    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        visible: false
      }
    });
  }

  // 處理節點的折疊/展開
  toggleNode(nodeId) {
    this.setState(prevState => {
      const collapsedNodes = new Set(prevState.collapsedNodes);
      if (collapsedNodes.has(nodeId)) {
        collapsedNodes.delete(nodeId);
      } else {
        collapsedNodes.add(nodeId);
      }
      return { collapsedNodes };
    });
  }
  
  // 處理折疊子樹選單項
  handleCollapseSubtree() {  //single merge
    const { nodeId } = this.state.contextMenu;
    if (nodeId) {
      this.toggleNode(nodeId);
    }
    this.closeContextMenu();
  }

  handleTreeReady = (tree) => {
    this.setState({ 
      treeInstance: tree,
      // 如果樹實例有 getNewick 方法，可以在這裡保存
    });
  }

  handleThresholdCollapse = (threshold) => {  //group merge
    const { treeInstance, collapsedNodes } = this.state;
    if (!treeInstance) {
      console.log("樹實例尚未準備好");
      return;
    }
    
    // 使用現有的樹實例
    console.log("閾值:", threshold);
    
    // 獲取所有需要折疊的節點 ID
    const nodesToCollapse = new Set(collapsedNodes);
    
    // 自定義遍歷函數
    const traverseNodes = (node, hasParentCollapsed = false) => {
      if (!node) return;
      
      // 如果父節點已經被折疊，則跳過這個節點的檢查
      let shouldCollapseThisNode = false;
      
      // 只檢查尚未被父節點折疊的節點
      if (!hasParentCollapsed) {
        // 非葉節點且分支長度大於等於閾值
        if (node.children && node.children.length > 0) {
          if (node.data.abstract_x >= threshold) {
            console.log("折疊節點:", node.unique_id, "分支長度:", node.data.abstract_x);
            nodesToCollapse.add(node.unique_id);
            shouldCollapseThisNode = true;
          }
        }
      }
      
      // 遍歷子節點，如果當前節點被折疊，則傳遞 true 給子節點
      if (node.children) {
        node.children.forEach(child => traverseNodes(child, hasParentCollapsed || shouldCollapseThisNode));
      }
    };
    
    // 從根節點開始遍歷
    if (treeInstance.nodes) {
      traverseNodes(treeInstance.nodes);
    }
    
    // 更新折疊節點集合
    this.setState({ collapsedNodes: nodesToCollapse });
  } 

  // 添加匯出功能
  exportModifiedNewick = () => {
    const { newick, treeInstance } = this.state;
  
    // 優先使用樹實例的轉換方法（如果有的話）
    let exportNewick = newick; // 預設使用原始 newick 字符串
    
    if (treeInstance && typeof treeInstance.getNewick === 'function') {
      // 如果樹實例有 getNewick 方法，優先使用它獲取當前樹的結構
      exportNewick = treeInstance.getNewick();
    } else if (treeInstance && treeInstance.export_newick) {
      // 或者其他可能的方法名稱
      exportNewick = treeInstance.export_newick();
    }
    
    // 確保有內容可以匯出
    if (!exportNewick) {
      alert('No tree data available to export.');
      return;
    }
    
    // 創建一個下載連結
    const element = document.createElement('a');
    const file = new Blob([exportNewick], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'exported_tree.nwk';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  render() {
    const { padding } = this.props;
    const { width, height, clickedBranch, contextMenu, collapsedNodes } = this.state;

    const svgWidth = width + (padding * 4);  // 增加左右邊距
    const svgHeight = height + (padding * 4); // 增加上下邊距

    return (
      <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
        {/* <h1>React Phylotree</h1> */}
        
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div className="phylotree-application">
            <div className="file-input-container">
              <input type="file" accept=".nwk" onChange={this.handleFileChange} style={{marginTop: "20px"}}/>
              <button onClick={this.exportModifiedNewick}>
                Export
              </button>
            </div>
            
            <div className="button-group-container">
              <ButtonGroup>
                <VerticalExpansionButton
                  onClick={() => this.toggleDimension("height", "expand")}
                />
                <VerticalCompressionButton
                  onClick={() => this.toggleDimension("height", "compress")}
                />
                <HorizontalExpansionButton
                  onClick={() => this.toggleDimension("width", "expand")}
                />
                <HorizontalCompressionButton
                  onClick={() => this.toggleDimension("width", "compress")}
                />
                <AscendingSortButton
                  onClick={() => this.handleSort("ascending")}
                />
                <DescendingSortButton
                  onClick={() => this.handleSort("descending")}
                />
                <AlignTipsLeftButton
                  onClick={() => this.alignTips("left")}
                />
                <AlignTipsRightButton
                  onClick={() => this.alignTips("right")}
                />
              </ButtonGroup>
              
              <input
                type='checkbox'
                onChange={() => this.setState({ internal: !this.state.internal })}
                style={{
                  margin: "0px 3px 0px 10px"
                }}
              />
              {this.state.internal ? 'Hide' : 'Show'} internal labels
              
              <div>
                <label>Width: {width}px</label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  value={width}
                  step="10"
                  onChange={(e) => this.setState({ width: parseInt(e.target.value, 10) })}
                  style={{ marginTop: 10 }}
                />
              </div>

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
            </div> {/*button group container*/}
          </div> {/*phylotree container*/}
        </div>
        
        <div className="tree_container" style={{ position: "relative" }}>
          {/* ContextMenu 組件 */}
          <ContextMenu 
            visible={contextMenu.visible}
            position={contextMenu.position}
            onClose={this.closeContextMenu}
            onCollapseSubtree={this.handleCollapseSubtree}
            isNodeCollapsed={contextMenu.isNodeCollapsed}
          />
          
          <svg width={svgWidth+150} height={svgHeight}>
            {/*這裡呼叫Phylotree*/}
            <Phylotree
              width={width}
              height={height}
              transform={`translate(${padding * 2}, ${padding * 2})`}
              newick={this.state.newick}
              onDimensionsChange={this.handleDimensionsChange}
              alignTips={this.state.alignTips}
              sort={this.state.sort}
              internalNodeLabels={this.state.internal}
              onBranchClick={branch => {
                this.setState({clickedBranch: branch.target.data.name})
              }}
              includeBLAxis
              // 需要保留的 props
              collapsedNodes={this.state.collapsedNodes}  //merge
              onContextMenuEvent={this.handleContextMenuEvent}
              onTreeReady={this.handleTreeReady}
              onThresholdCollapse={this.handleThresholdCollapse}
            />
          </svg>
        </div>
        
        {clickedBranch ? (
          <p>Last clicked branch was {clickedBranch}.</p>
        ) : null}
      </div>
    );
  }
}

PhylotreeApplication.defaultProps = {
  padding: 10
};

export default PhylotreeApplication;
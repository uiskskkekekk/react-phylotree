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
      renamedNodes: new Map(),
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
    this.handleNodeRename = this.handleNodeRename.bind(this);
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
          renamedNodes: new Map(),
          nodeInfoMap: new Map(),
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

  getAllLeafNames(node) {
    if (!node.children || node.children.length === 0) {
      return [node.data.name];
    }
    
    return node.children.flatMap(child => this.getAllLeafNames(child));
  }

  // 處理節點的折疊/展開
  toggleNode(nodeId) {
    if (!this.state.collapsedNodes.has(nodeId) && this.state.treeInstance) {
      const node = this.findNodeById(this.state.treeInstance.nodes, nodeId);
      
      if (node) {
        // 獲取第一個和最後一個葉子節點名稱
        const leafNames = this.getAllLeafNames(node);
        const firstLeafName = leafNames.length > 0 ? leafNames[0] : null;
        const lastLeafName = leafNames.length > 0 ? leafNames[leafNames.length - 1] : null;
        
        this.setState(prevState => {
          const nodeInfoMap = new Map(prevState.nodeInfoMap || new Map());
          nodeInfoMap.set(nodeId, { 
            firstLeafName,
            lastLeafName
          });
          return { nodeInfoMap };
        });
        
        console.log(`記錄節點 ${nodeId} 的首尾葉子: ${firstLeafName} - ${lastLeafName}`);
      }
    }
    
    // 原有的折疊邏輯
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

  // 輔助方法：根據ID找節點
  findNodeById(rootNode, nodeId) {
    if (!rootNode) return null;
    
    if (rootNode.unique_id === nodeId) return rootNode;
    
    if (rootNode.children) {
      for (const child of rootNode.children) {
        const found = this.findNodeById(child, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }

  // 輔助方法：找到頂部葉子節點名稱
  findTopLeafName(node) {
    if (!node) return null;
    
    // 如果是葉子節點，直接返回名稱
    if (!node.children || node.children.length === 0) {
      return node.data.name;
    }
    
    // 遞歸找第一個子節點的頂部葉子
    return this.findTopLeafName(node.children[0]);
  }
  
  // 處理折疊子樹選單項
  handleCollapseSubtree() {  //single merge
    const { nodeId } = this.state.contextMenu;
    if (nodeId) {
      this.toggleNode(nodeId);
    }
    this.closeContextMenu();
  }

  handleNodeRename = (nodeId, newName) => {
    console.log(`PhylotreeApplication: 重命名節點 ${nodeId} 為 ${newName}`);
    
    this.setState(prevState => {
      const renamedNodes = new Map(prevState.renamedNodes || new Map());
      renamedNodes.set(nodeId, newName);
      return { renamedNodes };
    }, () => {
      console.log('更新後的重命名節點:', Array.from(this.state.renamedNodes.entries()));
    });
  }

  handleTreeReady = (tree) => {
    this.setState({ treeInstance: tree });
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


  // findSubtreeByFirstLeafName = (newickStr, leafName) => {
  //   // 尋找葉子節點名稱在 Newick 中的位置
  //   const leafPos = newickStr.indexOf(leafName);
  //   if (leafPos === -1) {
  //     console.log(`未找到葉子節點 ${leafName}`);
  //     return null;
  //   }
    
  //   console.log(`找到葉子節點 ${leafName} 在位置 ${leafPos}`);
    
  //   // 向前搜索左括號，找到包含這個葉子的最小子樹
  //   // 我們需要找到匹配這個葉子的最內層左括號
  //   let startPos = leafPos;
  //   while (startPos >= 0 && newickStr[startPos] !== '(') {
  //     startPos--;
  //   }
    
  //   if (startPos < 0) {
  //     console.log(`未找到包含葉子節點 ${leafName} 的子樹的開始位置`);
  //     return null;
  //   }
    
  //   // 從這個位置開始，向前搜索，找到最外層的括號
  //   // 即找到第一個括號，這個括號前面沒有右括號匹配
  //   let outerStartPos = startPos;
  //   let rightCount = 0;  // 右括號計數
    
  //   while (outerStartPos > 0) {
  //     outerStartPos--;
      
  //     if (newickStr[outerStartPos] === ')') {
  //       rightCount++;
  //     } else if (newickStr[outerStartPos] === '(') {
  //       if (rightCount === 0) {
  //         // 找到一個左括號，前面沒有未匹配的右括號
  //         // 這可能是更外層的括號
  //         startPos = outerStartPos;
  //       } else {
  //         // 找到一個左括號，匹配之前的右括號
  //         rightCount--;
  //       }
  //     }
      
  //     // 如果已經到達字符串開頭，或者找到分隔符（如逗號或分號），則停止
  //     if (outerStartPos === 0 || newickStr[outerStartPos] === ',' || newickStr[outerStartPos] === ';') {
  //       break;
  //     }
  //   }
    
  //   console.log(`找到子樹開始位置: ${startPos}`);
    
  //   // 從起始左括號位置開始，找到匹配的右括號
  //   let depth = 1;
  //   let endPos = startPos + 1;
    
  //   while (endPos < newickStr.length && depth > 0) {
  //     if (newickStr[endPos] === '(') depth++;
  //     if (newickStr[endPos] === ')') depth--;
  //     endPos++;
  //   }
    
  //   if (depth !== 0) {
  //     console.log(`未找到包含葉子節點 ${leafName} 的子樹的結束位置`);
  //     return null;
  //   }
    
  //   // 繼續向後搜索，直到找到 ',' 或 ';' 或 ')'，以包含分支長度（如果有的話）
  //   let finalPos = endPos;
  //   while (finalPos < newickStr.length &&
  //          newickStr[finalPos] !== ',' &&
  //          newickStr[finalPos] !== ';' &&
  //          newickStr[finalPos] !== ')') {
  //     finalPos++;
  //   }
    
  //   const subtree = newickStr.substring(startPos, finalPos);
  //   console.log(`找到的子樹: ${subtree}`);
    
  //   return {
  //     subtree: subtree,
  //     start: startPos,
  //     end: finalPos
  //   };
  // };

  //---------------------------------------------------------------------------

  // 基於首尾葉子名稱找到子樹
  // findSubtreeByFirstAndLastLeaf = (newickStr, firstLeaf, lastLeaf) => {
  //   if (!firstLeaf || !lastLeaf) {
  //     console.log('缺少首尾葉子名稱');
  //     return null;
  //   }
    
  //   // 尋找包含首尾葉子的子樹
  //   const firstLeafPos = newickStr.indexOf(firstLeaf);
  //   const lastLeafPos = newickStr.indexOf(lastLeaf);
    
  //   if (firstLeafPos === -1 || lastLeafPos === -1) {
  //     console.log(`未找到葉子節點: ${firstLeaf} 或 ${lastLeaf}`);
  //     return null;
  //   }
    
  //   // 確定哪個在前，哪個在後
  //   const startLeafPos = Math.min(firstLeafPos, lastLeafPos);
  //   const endLeafPos = Math.max(firstLeafPos, lastLeafPos);
    
  //   // 向前搜索左括號
  //   let startPos = startLeafPos;
  //   while (startPos >= 0 && newickStr[startPos] !== '(') {
  //     startPos--;
  //   }
    
  //   if (startPos < 0) {
  //     console.log('未找到子樹的開始括號');
  //     return null;
  //   }
    
  //   // 確認這個左括號是否是我們要找的子樹的開始
  //   // 方法是檢查從這個左括號匹配的右括號是否在最後一個葉子之後
  //   let depth = 1;
  //   let tempPos = startPos + 1;
    
  //   while (tempPos < newickStr.length && depth > 0) {
  //     if (newickStr[tempPos] === '(') depth++;
  //     if (newickStr[tempPos] === ')') depth--;
  //     tempPos++;
  //   }
    
  //   // 如果匹配的右括號在最後一個葉子之前，則這不是我們要找的子樹
  //   // 我們需要向前繼續搜索更早的左括號
  //   if (tempPos <= endLeafPos) {
  //     console.log('找到的子樹不包含最後一個葉子，繼續搜索');
      
  //     // 這裡可以實現更複雜的搜索邏輯
  //     // 例如，繼續向前搜索直到找到包含兩個葉子的最小子樹
  //     // 但這可能需要更複雜的算法
      
  //     return null;
  //   }
    
  //   // 找到了匹配的右括號，獲取子樹
  //   // 繼續向後搜索，包含可能的分支長度
  //   let endPos = tempPos;
  //   while (endPos < newickStr.length &&
  //         newickStr[endPos] !== ',' &&
  //         newickStr[endPos] !== ';' &&
  //         newickStr[endPos] !== ')') {
  //     endPos++;
  //   }
    
  //   const subtree = newickStr.substring(startPos, endPos);
  //   console.log(`找到的子樹: ${subtree}`);
    
  //   return {
  //     subtree: subtree,
  //     start: startPos,
  //     end: endPos
  //   };
  // };

  // findAndReplaceSubtreeByLastLeaf = (newickStr, lastLeafName, newName) => {
  //   // 尋找最後一個葉子的位置
  //   const leafPos = newickStr.indexOf(lastLeafName);
  //   if (leafPos === -1) {
  //     console.log(`未找到葉子節點: ${lastLeafName}`);
  //     return { success: false, newick: newickStr };
  //   }
    
  //   // 從葉子位置向後搜索逗號或分號，計算右括號數量
  //   let endPos = leafPos + lastLeafName.length;
  //   let rightBracketCount = 0;
    
  //   while (endPos < newickStr.length && 
  //          newickStr[endPos] !== ',' && 
  //          newickStr[endPos] !== ';') {
  //     if (newickStr[endPos] === ')') {
  //       rightBracketCount++;
  //     }
  //     endPos++;
  //   }
    
  //   if (rightBracketCount === 0) {
  //     console.log(`葉子節點後沒有右括號，不是折疊節點`);
  //     return { success: false, newick: newickStr };
  //   }
    
  //   // 從葉子位置向前搜索，找到匹配的左括號
  //   let bracketBalance = rightBracketCount; // 我們需要找到這麼多額外的左括號
  //   let startPos = leafPos;
    
  //   while (startPos >= 0 && bracketBalance > 0) {
  //     if (newickStr[startPos] === ')') {
  //       // 遇到右括號，需要多找一個左括號
  //       bracketBalance++;
  //     } else if (newickStr[startPos] === '(') {
  //       // 遇到左括號，減少需要找的數量
  //       bracketBalance--;
  //     }
  //     startPos--;
  //   }
    
  //   if (bracketBalance !== 0) {
  //     console.log(`未找到足夠的匹配左括號`);
  //     return { success: false, newick: newickStr };
  //   }
    
  //   // 調整到左括號位置
  //   startPos++;
    
  //   // 提取子樹文本
  //   const subtree = newickStr.substring(startPos, endPos);
  //   console.log(`找到的子樹: ${subtree}`);
    
  //   // 檢查是否有冒號和引號
  //   const hasColon = subtree.includes(':');
  //   const hasDoubleQuote = subtree.includes('"');
  //   const hasSingleQuote = subtree.includes("'");
    
  //   // 提取分支長度（如果有）
  //   let branchLength = "";
  //   if (hasColon) {
  //     const lastRightBracket = subtree.lastIndexOf(')');
  //     if (lastRightBracket !== -1) {
  //       const colonPos = subtree.indexOf(':', lastRightBracket);
  //       if (colonPos !== -1) {
  //         branchLength = subtree.substring(colonPos);
  //       }
  //     }
  //   }
    
  //   // 根據格式生成替換文本
  //   let replacement;
  //   if (hasColon) {
  //     if (hasDoubleQuote || hasSingleQuote) {
  //       // 保留原有的引號類型
  //       const quoteChar = hasDoubleQuote ? '"' : "'";
  //       replacement = `${quoteChar}${newName}${quoteChar}${branchLength}`;
  //     } else {
  //       replacement = `${newName}${branchLength}`;
  //     }
  //   } else {
  //     replacement = `(${newName})`;
  //   }
    
  //   // 替換子樹
  //   const modifiedNewick = 
  //     newickStr.substring(0, startPos) + 
  //     replacement + 
  //     newickStr.substring(endPos);
    
  //   console.log(`替換後的 Newick: ${modifiedNewick}`);
    
  //   return { 
  //     success: true, 
  //     newick: modifiedNewick 
  //   };
  // };

  getTopLeafNameForNodeId = (nodeId) => {
    const { treeInstance } = this.state;
    
    if (!treeInstance) return null;
    
    // 尋找節點
    const findNode = (node) => {
      if (node.unique_id === nodeId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(treeInstance.nodes);
    if (!node) return null;
    
    // 找到最上面的葉子節點
    const findTopLeaf = (node) => {
      if (!node.children || node.children.length === 0) {
        return node.data.name;
      }
      
      // 假設最上面的葉子是第一個子節點路徑上的叶子
      return findTopLeaf(node.children[0]);
    };
    
    return findTopLeaf(node);
  };

  convertTreeToNewick = (node, collapsedNodes, renamedNodes, depth = 0) => {
    // 檢查節點是否被折疊
    if (node.unique_id && collapsedNodes.has(node.unique_id)) {
      // 如果節點被折疊且有重命名，使用新名稱
      if (renamedNodes.has(node.unique_id)) {
        const newName = renamedNodes.get(node.unique_id);
        // 是否有分支長度
        const branchLength = node.data.attribute ? `:${node.data.attribute}` : '';
        
        // 是否需要引號（如果新名稱包含特殊字符）
        const needQuotes = /[,;:()\[\]]/g.test(newName);
        if (needQuotes) {
          return `'${newName}'${branchLength}`;
        } else {
          return `${newName}${branchLength}`;
        }
      }
    }
    
    // 如果是葉子節點
    if (!node.children || node.children.length === 0) {
      const name = node.data.name || '';
      const branchLength = node.data.attribute ? `:${node.data.attribute}` : '';
      
      // 檢查是否需要引號
      const needQuotes = /[,;:()\[\]]/g.test(name);
      if (needQuotes) {
        return `'${name}'${branchLength}`;
      } else {
        return `${name}${branchLength}`;
      }
    }
    
    // 處理內部節點
    const childrenNewick = node.children
      .map(child => this.convertTreeToNewick(child, collapsedNodes, renamedNodes, depth + 1))
      .join(',');
    
    // 是否有節點名稱
    const name = node.data.name || '';
    const branchLength = node.data.attribute ? `:${node.data.attribute}` : '';
    
    // 根節點特殊處理
    if (depth === 0) {
      return `(${childrenNewick})${name}${branchLength};`;
    }
    
    // 其他內部節點
    return `(${childrenNewick})${name}${branchLength}`;
  };

  exportModifiedNewick = () => {
    const { treeInstance, collapsedNodes, renamedNodes } = this.state;
    
    if (!treeInstance) {
      alert('No tree data available to export.');
      return;
    }
    
    try {
      // 將樹轉換為 Newick 格式，同時處理折疊和重命名的節點
      const exportNewick = this.convertTreeToNewick(treeInstance.nodes, collapsedNodes, renamedNodes);
      
      // 創建下載連結
      const element = document.createElement('a');
      const file = new Blob([exportNewick], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = 'exported_tree.nwk';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("處理過程中出錯:", error);
    }
  };

  // exportModifiedNewick = () => {
  //   const { newick, collapsedNodes, renamedNodes, nodeInfoMap } = this.state;
    
  //   let exportNewick = newick;
    
  //   // 確保有內容可以匯出
  //   if (!exportNewick) {
  //     alert('No tree data available to export.');
  //     return;
  //   }
    
  //   // 輸出調試信息
  //   console.log("原始 Newick:", exportNewick);
  //   console.log("已折疊節點:", Array.from(collapsedNodes));
  //   console.log("已重命名節點:", Array.from(renamedNodes.entries()));
    
  //   try {
  //     collapsedNodes.forEach(nodeId => {
  //       if (renamedNodes.has(nodeId)) {
  //         const newName = renamedNodes.get(nodeId);
  //         const nodeInfo = nodeInfoMap && nodeInfoMap.get(nodeId);
          
  //         if (nodeInfo && nodeInfo.lastLeafName) {
  //           const result = this.findAndReplaceSubtreeByLastLeaf(
  //             exportNewick, 
  //             nodeInfo.lastLeafName, 
  //             newName
  //           );
            
  //           if (result.success) {
  //             exportNewick = result.newick;
  //           }
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error("處理過程中出錯:", error);
  //   }

  //   // 創建下載連結
  //   const element = document.createElement('a');
  //   const file = new Blob([exportNewick], {type: 'text/plain'});
  //   element.href = URL.createObjectURL(file);
  //   element.download = 'exported_tree.nwk';
  //   document.body.appendChild(element);
  //   element.click();
  //   document.body.removeChild(element);
  // };

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
              renamedNodes={this.state.renamedNodes}
              onContextMenuEvent={this.handleContextMenuEvent}
              onTreeReady={this.handleTreeReady}
              onThresholdCollapse={this.handleThresholdCollapse}
              onNodeRename={this.handleNodeRename}
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
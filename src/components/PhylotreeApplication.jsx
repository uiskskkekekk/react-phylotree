import {
  faAlignLeft,
  faAlignRight,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faSortAmountUp,
} from "@fortawesome/free-solid-svg-icons"; //icona
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; //icons
import { phylotree } from "phylotree";
import React, { Component } from "react";
import RBButton from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import ContextMenu from "./phylotree/ContextMenu.jsx"; // 導入 ContextMenu 組件
import Phylotree from "./phylotree/phylotree.jsx";

import "../styles/phylotree.css";

function Button(props) {
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>{props.title}</Tooltip>}>
      <RBButton variant="secondary" {...props}>
        {props.children}
      </RBButton>
    </OverlayTrigger>
  );
}

function HorizontalExpansionButton(props) {
  return (
    <Button style={{ fontSize: 10 }} title="Expand horizontally" {...props}>
      <FontAwesomeIcon key={1} icon={faArrowLeft} />
      <FontAwesomeIcon key={2} icon={faArrowRight} />
    </Button>
  );
}

function HorizontalCompressionButton(props) {
  return (
    <Button style={{ fontSize: 10 }} title="Compress horizontally" {...props}>
      <FontAwesomeIcon key={1} icon={faArrowRight} />
      <FontAwesomeIcon key={2} icon={faArrowLeft} />
    </Button>
  );
}

function VerticalExpansionButton(props) {
  return (
    <Button
      style={{ fontSize: 10, display: "flex", flexDirection: "column" }}
      title="Expand vertically"
      {...props}
    >
      <FontAwesomeIcon key={1} icon={faArrowUp} />
      <FontAwesomeIcon key={2} icon={faArrowDown} />
    </Button>
  );
}

function VerticalCompressionButton(props) {
  return (
    <Button
      style={{ fontSize: 10, display: "flex", flexDirection: "column" }}
      title="Compress vertically"
      {...props}
    >
      <FontAwesomeIcon key={1} icon={faArrowDown} />
      <FontAwesomeIcon key={2} icon={faArrowUp} />
    </Button>
  );
}

function AscendingSortButton(props) {
  return (
    <Button title="Sort in ascending order" {...props}>
      <FontAwesomeIcon key={1} icon={faSortAmountUp} flip="vertical" />
    </Button>
  );
}

function DescendingSortButton(props) {
  return (
    <Button title="Sort in descending order" {...props}>
      <FontAwesomeIcon key={1} icon={faSortAmountUp} />
    </Button>
  );
}

function AlignTipsRightButton(props) {
  //節點名稱對稱
  return (
    <Button title="Align tips to right" {...props}>
      <FontAwesomeIcon key={1} icon={faAlignRight} />
    </Button>
  );
}

function AlignTipsLeftButton(props) {
  //節點名稱貼齊
  return (
    <Button title="Align tips to left" {...props}>
      <FontAwesomeIcon key={1} icon={faAlignLeft} />
    </Button>
  );
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
      width: 500, // 默認寬度
      height: 500, // 默認高度
      collapsedNodes: new Set(), // 折疊節點集合
      renamedNodes: new Map(),
      merged: {},
      // ContextMenu 狀態
      contextMenu: {
        visible: false,
        position: { x: 0, y: 0 },
        nodeId: null,
        nodeData: null,
      },
      treeInstance: null,
      currentThreshold: null,
    };

    // 綁定方法
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleContextMenuEvent = this.handleContextMenuEvent.bind(this);
    this.closeContextMenu = this.closeContextMenu.bind(this);
    // this.toggleNode = this.toggleNode.bind(this);
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

        this.setState({
          newick, // set new newick string
          tree: null, // 重置樹實例
          treeInstance: null, // 重置樹實例
          alignTips: "left", // 恢復默認對齊
          sort: null, // 清除排序
          internal: false, // 隱藏內部標簽
          clickedBranch: null, // 清除點擊分支
          collapsedNodes: new Set(), // 清除所有折疊節點
          renamedNodes: new Map(),
          merged: {},
          currentThreshold: null, // 清除當前閾值
          contextMenu: {
            // 重置右鍵菜單
            visible: false,
            position: { x: 0, y: 0 },
            nodeId: null,
            nodeData: null,
          },
        });
      };
      reader.readAsText(file);
    }
  }

  // 處理尺寸變化
  handleDimensionsChange = ({ width, height }) => {
    this.setState({ width, height });
  };

  // 調整樹寬樹高
  toggleDimension(dimension, direction) {
    const new_dimension =
        this.state[dimension] + (direction === "expand" ? 40 : -40), //增長或縮短
      new_state = {};
    new_state[dimension] = new_dimension;
    this.setState(new_state);
  }

  // 處理排序
  handleSort(direction) {
    this.setState({ sort: direction });
  }

  // 處理節點對齊
  alignTips(direction) {
    this.setState({ alignTips: direction });
  }

  // 處理 ContextMenu 事件
  handleContextMenuEvent(event) {
    this.setState({
      contextMenu: event,
    });
  }

  // 關閉 ContextMenu
  closeContextMenu() {
    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        visible: false,
      },
    });
  }

  // 處理重新命名後的邏輯（更新merged、重新渲染樹）
  handleNodeRename = (nodeId, newName) => {
    console.log(`PhylotreeApplication: 重命名節點 ${nodeId} 為 ${newName}`);

    // 檢查節點是否已折疊且尚未存入merged
    const isCollapsed = this.state.collapsedNodes.has(nodeId);
    const isInMerged = this.state.merged.hasOwnProperty(nodeId);

    // 檢查是否為空字串
    if (newName.trim() === "") {
      this.setState(
        (prevState) => {
          const renamedNodes = new Map(prevState.renamedNodes);
          renamedNodes.delete(nodeId);
          return { renamedNodes };
        },
        () => {
          // 處理折疊節點的重命名
          if (this.state.collapsedNodes.has(nodeId)) {
            this.updateTree();
          }
        }
      );
    } else {
      if (isCollapsed && !isInMerged && this.state.treeInstance) {
        // 找到對應的點
        const findNode = (id, node) => {
          if (!node) return null;
          if (node.unique_id === id) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findNode(id, child);
              if (found) return found;
            }
          }
          return null;
        };

        const node = findNode(nodeId, this.state.treeInstance.nodes);

        if (node) {
          const siblings = node.parent.children;

          const childrenIds = new Set();
          const collectChildrenIds = (childNode) => {
            if (!childNode) return;

            if (childNode.unique_id && childNode !== node) {
              childrenIds.add(childNode.unique_id);
            }

            if (childNode.children) {
              childNode.children.forEach(collectChildrenIds);
            }
          };

          // 收集子節點ID
          if (node.children) {
            node.children.forEach(collectChildrenIds);
          }

          const getSubtreeNewick = (subNode) => {
            return this.convertTreeToNewick(subNode, new Set(), new Map());
          };

          let nodeIndex = -1;
          for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].unique_id === node.unique_id) {
              nodeIndex = i;
              break;
            }
          }

          this.setState(
            (prevState) => {
              const merged = { ...prevState.merged };
              merged[nodeId] = {
                children: childrenIds,
                subtreeNewick: getSubtreeNewick(node),
                rename: newName,
                parent: node.parent.unique_id,
                siblingIndex: nodeIndex,
              };
              console.log(merged);

              const renamedNodes = new Map(prevState.renamedNodes);
              renamedNodes.set(nodeId, newName);

              return { merged, renamedNodes };
            },
            () => {
              this.updateTree();
            }
          );

          return;
        }
      }
    }
  };

  updateTree = () => {
    const { newick, treeInstance, collapsedNodes, renamedNodes } = this.state;

    if (!treeInstance) {
      console.log("樹實例尚未準備好");
      return;
    }

    try {
      // 轉換成 Newick 格式
      const updatedNewick = this.convertTreeToNewick(
        treeInstance.nodes,
        collapsedNodes,
        renamedNodes
      );
      console.log("更新後的 Newick:", updatedNewick);

      this.setState({ newick: updatedNewick });
    } catch (error) {
      console.error("更新樹時出錯:", error);
    }
  };

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

  // 處理折疊子樹選單項
  handleCollapseSubtree() {
    //single merge
    const { nodeId, isNodeCollapsed } = this.state.contextMenu;

    if (nodeId) {
      if (isNodeCollapsed) {
        // 展開節點 (Unmerge)
        this.setState((prevState) => {
          const collapsedNodes = new Set(prevState.collapsedNodes);
          collapsedNodes.delete(nodeId);

          if (
            prevState.merged.hasOwnProperty(nodeId) &&
            prevState.treeInstance
          ) {
            const subtreeNewick = prevState.merged[nodeId].subtreeNewick;

            try {
              const updatedNewick = this.replaceNodeWithSubtree(
                prevState.treeInstance,
                nodeId,
                subtreeNewick
              );

              if (updatedNewick) {
                const newMerged = { ...prevState.merged };
                delete newMerged[nodeId];

                return {
                  newick: updatedNewick,
                  collapsedNodes: collapsedNodes,
                  merged: newMerged,
                  // 強制重新渲染
                  tree: null,
                  treeInstance: null,
                };
              }
            } catch (error) {
              console.error("展開節點錯誤:", error);
            }
          }

          return { collapsedNodes };
        });
      } else {
        // 折疊節點 (Merge)
        this.setState((prevState) => {
          const collapsedNodes = new Set(prevState.collapsedNodes);
          collapsedNodes.add(nodeId);

          return { collapsedNodes };
        });
      }
    }

    this.closeContextMenu();
  }

  replaceNodeWithSubtree(tree, leafNodeId, newNewick) {
    console.log("開始替換節點，ID:", leafNodeId, "新Newick:", newNewick);
    // 找到要替換的葉節點
    let targetNode = null;
    tree.traverse_and_compute((node) => {
      if (node.unique_id === leafNodeId) {
        targetNode = node;
        console.log("找到目標節點:", targetNode);
        return false;
      }
      return true;
    });

    if (!targetNode) {
      console.error("找不到目標節點");
      return null;
    }

    // 解析新的 Newick 字串成樹結構
    const subtree = new phylotree(newNewick);

    // 找到要替換的節點在父節點的子節點列表中的位置
    const parentNode = targetNode.parent;
    if (!parentNode) {
      console.error("目標節點沒有父節點，無法替換");
      return null;
    }

    const indexInParent = parentNode.children.findIndex(
      (child) => child.unique_id === targetNode.unique_id
    );

    if (indexInParent === -1) {
      console.error("無法在父節點的子節點列表中找到目標節點");
      return null;
    }

    // 替換父節點的子節點列表中的目標節點
    const subtreeRoot = subtree.nodes;
    subtreeRoot.parent = parentNode;
    subtreeRoot.data.attribute = targetNode.data.attribute;
    parentNode.children[indexInParent] = subtreeRoot;

    // 重新計算樹的布局
    // placenodes(tree, tree.internalNodeLabels, null, tree.sort);

    // 轉換回完整的 Newick 字串
    const updatedNewick = this.convertTreeToNewick(
      tree.nodes,
      new Set(),
      new Map()
    );

    console.log("updateNewick: ", updatedNewick);

    return updatedNewick;
  }

  handleTreeReady = (tree) => {
    this.setState({ treeInstance: tree });
  };

  handleThresholdCollapse = (threshold) => {
    //group merge
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
            console.log(
              "折疊節點:",
              node.unique_id,
              "分支長度:",
              node.data.abstract_x
            );
            nodesToCollapse.add(node.unique_id);
            shouldCollapseThisNode = true;
          }
        }
      }

      // 遍歷子節點，如果當前節點被折疊，則傳遞 true 給子節點
      if (node.children) {
        node.children.forEach((child) =>
          traverseNodes(child, hasParentCollapsed || shouldCollapseThisNode)
        );
      }
    };

    // 從根節點開始遍歷
    if (treeInstance.nodes) {
      traverseNodes(treeInstance.nodes);
    }

    // 更新折疊節點集合
    this.setState({ collapsedNodes: nodesToCollapse });
  };

  convertTreeToNewick = (node, collapsedNodes, renamedNodes, depth = 0) => {
    if (node.unique_id && collapsedNodes.has(node.unique_id)) {
      // 節點是否被折疊
      if (renamedNodes.has(node.unique_id)) {
        // 如果節點被折疊且有重命名，使用新名稱
        const newName = renamedNodes.get(node.unique_id);
        const branchLength = node.data.attribute
          ? `:${node.data.attribute}`
          : ""; // 是否有分支長度

        // 是否需要引號（如果新名稱包含特殊字符）
        const needQuotes = /[,;:()\[\]]/g.test(newName);
        if (needQuotes) {
          return `'${newName}'${branchLength}`;
        } else {
          return `${newName}${branchLength}`;
        }
      }
    }

    // 如果是葉子節點（沒有子節點）
    if (!node.children || node.children.length === 0) {
      const name = node.data.name || "";
      const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";

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
      .map((child) =>
        this.convertTreeToNewick(child, collapsedNodes, renamedNodes, depth + 1)
      )
      .join(",");

    // 是否有節點名稱
    const name = node.data.name || "";
    const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";

    // 根節點
    if (depth === 0) {
      return `(${childrenNewick})${name}${branchLength};`;
    }

    // 其他內部節點
    return `(${childrenNewick})${name}${branchLength}`;
  };

  exportModifiedNewick = () => {
    const { newick, treeInstance, collapsedNodes, renamedNodes } = this.state;

    if (!treeInstance) {
      alert("No tree data available to export.");
      return;
    }

    try {
      // 將樹轉換為 Newick 格式，同時處理折疊和重命名的節點
      console.log("原始 Newick:", newick);

      console.log("已折疊節點:", Array.from(collapsedNodes));
      console.log("已重命名節點:", Array.from(renamedNodes.entries()));

      // 將樹轉換為 Newick 格式，同時處理折疊和重命名的節點
      const exportNewick = this.convertTreeToNewick(
        treeInstance.nodes,
        collapsedNodes,
        renamedNodes
      );

      console.log("更新後的 Newick:", exportNewick);

      // 創建下載連結
      const element = document.createElement("a");
      const file = new Blob([exportNewick], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = "exported_tree.nwk";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("處理過程中出錯:", error);
    }
  };

  // exportTreeAsImage = () => {
  //   const svgElement = document.querySelector(".tree_container svg");
  //   if (!svgElement) {
  //     alert("無法找到 SVG 元素");
  //     return;
  //   }

  //   // 創建 SVG 的副本，以便我們可以修改它而不影響原始 SVG
  //   const svgClone = svgElement.cloneNode(true);

  //   // 設置白色背景
  //   const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  //   rect.setAttribute("width", "100%");
  //   rect.setAttribute("height", "100%");
  //   rect.setAttribute("fill", "white");
  //   svgClone.insertBefore(rect, svgClone.firstChild);

  //   // 將 SVG 轉換為字符串
  //   const svgData = new XMLSerializer().serializeToString(svgClone);

  //   // 創建 Blob
  //   const svgBlob = new Blob([svgData], {
  //     type: "image/svg+xml;charset=utf-8",
  //   });
  //   const url = URL.createObjectURL(svgBlob);

  //   // 創建 Image 對象
  //   const img = new Image();

  //   img.onload = () => {
  //     // 創建 canvas
  //     const canvas = document.createElement("canvas");
  //     canvas.width = svgElement.width.baseVal.value;
  //     canvas.height = svgElement.height.baseVal.value;

  //     // 在 canvas 上繪製圖像
  //     const ctx = canvas.getContext("2d");
  //     ctx.fillStyle = "white";
  //     ctx.fillRect(0, 0, canvas.width, canvas.height);
  //     ctx.drawImage(img, 0, 0);

  //     // 轉換為圖片 URL
  //     try {
  //       const imgURL = canvas.toDataURL("image/png");

  //       // 創建下載鏈接
  //       const downloadLink = document.createElement("a");
  //       downloadLink.download = "phylotree.png";
  //       downloadLink.href = imgURL;
  //       downloadLink.click();

  //       // 清理
  //       URL.revokeObjectURL(url);
  //     } catch (e) {
  //       console.error("導出圖片時出錯：", e);
  //       alert(
  //         "導出圖片失敗，可能是由於瀏覽器安全限制。請嘗試較小的樹或檢查控制台獲取更多信息。"
  //       );
  //     }
  //   };

  //   img.onerror = () => {
  //     console.error("無法從 SVG 創建圖像");
  //     URL.revokeObjectURL(url);
  //     alert("無法創建圖像。請檢查控制台獲取更多信息。");
  //   };

  //   // 設置圖像源並開始加載
  //   img.src = url;
  // };

  exportTreeAsImage = () => {
    const scaleFactor = 5;

    const svgElement = document.querySelector(".tree_container svg");
    if (!svgElement) {
      alert("無法找到 SVG 元素");
      return;
    }

    // 創建 SVG 的副本
    const svgClone = svgElement.cloneNode(true);

    // 設置白色背景
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "white");
    svgClone.insertBefore(rect, svgClone.firstChild);

    // 將 SVG 轉換為字符串
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // 創建 Blob
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // 創建 Image 對象
    const img = new Image();

    img.onload = () => {
      // 創建 canvas，使用縮放因子提高解析度
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.width.baseVal.value * scaleFactor;
      canvas.height = svgElement.height.baseVal.value * scaleFactor;

      // 在 canvas 上繪製圖像
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      // 轉換為圖片 URL
      try {
        const imgURL = canvas.toDataURL("image/png");

        // 創建下載鏈接
        const downloadLink = document.createElement("a");
        downloadLink.download = "phylotree.png";
        downloadLink.href = imgURL;
        downloadLink.click();

        // 清理
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("導出圖片時出錯：", e);
        alert(
          "導出圖片失敗，可能是由於瀏覽器安全限制。請嘗試較小的樹或降低解析度。"
        );
      }
    };

    img.onerror = () => {
      console.error("無法從 SVG 創建圖像");
      URL.revokeObjectURL(url);
      alert("無法創建圖像。請檢查控制台獲取更多信息。");
    };

    // 設置圖像源並開始加載
    img.src = url;
  };

  render() {
    const { padding } = this.props;
    const { width, height, clickedBranch, contextMenu, collapsedNodes } =
      this.state;

    const svgWidth = width + padding * 4; // 增加左右邊距
    const svgHeight = height + padding * 4; // 增加上下邊距

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {/* <h1>React Phylotree</h1> */}

        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div className="phylotree-application">
            <div className="file-input-container">
              <input
                type="file"
                accept=".nwk"
                onChange={this.handleFileChange}
                style={{ marginTop: "20px" }}
              />
              <button onClick={this.exportModifiedNewick}>Export Newick</button>
              <button onClick={this.exportTreeAsImage}>Export Image</button>
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
                <AlignTipsLeftButton onClick={() => this.alignTips("left")} />
                <AlignTipsRightButton onClick={() => this.alignTips("right")} />
              </ButtonGroup>
              <input
                type="checkbox"
                onChange={() =>
                  this.setState({ internal: !this.state.internal })
                }
                style={{
                  margin: "0px 3px 0px 10px",
                }}
              />
              {this.state.internal ? "Hide" : "Show"} internal labels
              <div>
                <label>Width: {width}px</label>
                <input
                  type="range"
                  min="300"
                  max="2000"
                  value={width}
                  step="10"
                  onChange={(e) =>
                    this.setState({ width: parseInt(e.target.value, 10) })
                  }
                  style={{ marginTop: 10 }}
                />
              </div>
              <div>
                <label>Height: {height}px</label>
                <input
                  type="range"
                  min="300"
                  max="2000"
                  value={height}
                  step="10"
                  onChange={(e) =>
                    this.setState({ height: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>{" "}
            {/*button group container*/}
          </div>{" "}
          {/*phylotree container*/}
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

          <svg width={svgWidth + 150} height={svgHeight}>
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
              onBranchClick={(branch) => {
                this.setState({ clickedBranch: branch.target.data.name });
              }}
              includeBLAxis
              collapsedNodes={this.state.collapsedNodes} //merge
              renamedNodes={this.state.renamedNodes}
              merged={this.state.merged}
              onContextMenuEvent={this.handleContextMenuEvent}
              onTreeReady={this.handleTreeReady}
              onThresholdCollapse={this.handleThresholdCollapse}
              onNodeRename={this.handleNodeRename}
            />
          </svg>
        </div>

        {clickedBranch ? <p>Last clicked branch was {clickedBranch}.</p> : null}
      </div>
    );
  }
}

PhylotreeApplication.defaultProps = {
  padding: 10,
};

export default PhylotreeApplication;
